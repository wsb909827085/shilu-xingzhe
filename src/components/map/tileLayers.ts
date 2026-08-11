import L from "leaflet";

/**
 * TileSources：底图瓦片源的深模块。
 * 对外只暴露一个入口 createBaseLayer(key, hooks)，以及 isAncientLayer / ANCIENT_LAYERS。
 * 对内隐藏：古/今瓦片覆盖范围表（bbox）、分片存储布局（z 目录 + z12 奇偶分片）、
 *           本地缺失自动回源（shiluFb）、CCTS/高德在线地址、加载进度事件。
 */

export const TILES: Record<string, string> = {
  /* style 7：高德简洁底图（仅主要地名，清爽） */
  gaode: "https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
  satellite: "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
};

/** 古地图：z4-10 全量预载本站；z11 预载诗路走廊与长安洛阳区域；
 *  z12 预载核心走廊与长安洛阳；未覆盖区域回源中研院 CCTS 在线瓦片 */
const CCTS_CODES: Record<string, string> = { tang: "ad0741", nsong: "ad1111", ssong: "ad1208" };
export const ANCIENT_LAYERS = ["tang", "nsong", "ssong"];
export function isAncientLayer(key: string): boolean {
  return ANCIENT_LAYERS.includes(key);
}

/** z11 本地预载覆盖的瓦片范围（x/y 闭区间） */
const Z11_LOCAL_BOXES = [
  { x0: 1664, x1: 1690, y0: 866, y1: 892 }, // 诗路核心走廊（赣州—梅关—韶州—广州）
  { x0: 1638, x1: 1673, y0: 776, y1: 784 }, // 长安—洛阳
];
const Z12_LOCAL_BOXES = [
  { x0: 3333, x1: 3368, y0: 1732, y1: 1779 }, // z12 核心走廊
  { x0: 3276, x1: 3362, y0: 1615, y1: 1643 }, // z12 长安—洛阳
];
function inBoxes(boxes: { x0: number; x1: number; y0: number; y1: number }[], x: number, y: number): boolean {
  return boxes.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
}

/** 现代高德底图本地预载覆盖判断：
 *  z5-10 全区域（东经105-118，北纬18-35.5）；z11 诗路走廊 + 长安洛阳 */
function gaodeIsLocal(z: number, x: number, y: number): boolean {
  if (z >= 5 && z <= 10) {
    const n = 2 ** z;
    const x0 = Math.floor(((105 + 180) / 360) * n);
    const x1 = Math.floor(((118 + 180) / 360) * n);
    const merc = (lat: number) =>
      Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
      );
    const y0 = merc(35.5);
    const y1 = merc(18);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  if (z === 11) {
    return inBoxes(
      [
        { x0: 1664, x1: 1690, y0: 866, y1: 892 }, // 诗路走廊
        { x0: 1638, x1: 1681, y0: 807, y1: 821 }, // 长安—洛阳
      ],
      x,
      y,
    );
  }
  return false;
}

const TRANSPARENT_PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNsaGj4DwAFhAJ/2eT9QAAAAABJRU5ErkJggg==";

/** 高德底图（本地优先，未覆盖区域回源高德在线；本地瓦片缺失时自动回源一次） */
class GaodeTileLayer extends L.TileLayer {
  private remoteUrl(coords: L.Coords): string {
    const s = ((coords.x + coords.y) % 4) + 1;
    return `https://wprd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x=${coords.x}&y=${coords.y}&z=${coords.z}`;
  }
  getTileUrl(coords: L.Coords): string {
    if (gaodeIsLocal(coords.z, coords.x, coords.y)) {
      return `/tiles-modern/gaode/z${coords.z}/${coords.z}-${coords.x}-${coords.y}.png`;
    }
    return this.remoteUrl(coords);
  }
  protected _tileOnError(done: L.DoneCallback, tile: HTMLImageElement, e: Error) {
    /* 本地瓦片缺失时回源在线一次（对象存储目录容量限制下的自愈） */
    const t = tile as HTMLImageElement & { dataset: DOMStringMap };
    if (t.src.startsWith("/tiles-modern") && !t.dataset.shiluFb) {
      t.dataset.shiluFb = "1";
      const m = /\/z(\d+)\/(\d+)-(\d+)-(\d+)\.png$/.exec(t.src);
      if (m) {
        t.src = this.remoteUrl({ z: +m[1], x: +m[3], y: +m[4] } as L.Coords);
        return;
      }
    }
    super._tileOnError(done, tile, e);
  }
}

class AncientTileLayer extends L.TileLayer {
  private failCount = 0;
  private remoteUrl(layer: string, z: number, x: number, y: number): string {
    return `https://gis.sinica.edu.tw/ccts/file-exists.php?img=${CCTS_CODES[layer]}-png-${z}-${x}-${y}`;
  }
  getTileUrl(coords: L.Coords): string {
    const layer = (this.options as { shiluLayer: string }).shiluLayer;
    /* 分片存储（对象存储单目录容量限制 ≈3999 文件）：z 子目录，z12 再按 x 奇偶分片 */
    if (coords.z === 12 && inBoxes(Z12_LOCAL_BOXES, coords.x, coords.y)) {
      return `/tiles/${layer}/z12/s${coords.x % 2}/12-${coords.x}-${coords.y}.png`;
    }
    if (
      coords.z <= 10 ||
      (coords.z === 11 && inBoxes(Z11_LOCAL_BOXES, coords.x, coords.y))
    ) {
      return `/tiles/${layer}/z${coords.z}/${coords.z}-${coords.x}-${coords.y}.png`;
    }
    return this.remoteUrl(layer, coords.z, coords.x, coords.y);
  }
  /* 本地瓦片缺失时回源 CCTS 一次；持续失败才触发回退提示 */
  protected _tileOnError(done: L.DoneCallback, tile: HTMLImageElement, e: Error) {
    const t = tile as HTMLImageElement & { dataset: DOMStringMap };
    if (t.src.startsWith("/tiles/") && !t.dataset.shiluFb) {
      t.dataset.shiluFb = "1";
      const layer = (this.options as { shiluLayer: string }).shiluLayer;
      const m = /\/(?:z\d+\/(?:s\d\/)?)?(\d+)-(\d+)-(\d+)\.png$/.exec(t.src);
      if (m) {
        t.src = this.remoteUrl(layer, +m[1], +m[2], +m[3]);
        return;
      }
    }
    this.failCount += 1;
    if (this.failCount === 12) {
      (this.options as { onTileFail?: () => void }).onTileFail?.();
    }
    super._tileOnError(done, tile, e);
  }
}

export interface BaseLayerHooks {
  /** 瓦片持续加载失败时触发一次（仅古图层） */
  onTileFail?: () => void;
  /** 瓦片加载进度：+1 开始，-1 完成/失败 */
  onPending?: (delta: 1 | -1) => void;
}

/** 创建底图图层（唯一入口）：古地图（CCTS 三层）/ 高德现代 / 高德卫星 */
export function createBaseLayer(baseLayer: string, hooks: BaseLayerHooks = {}): L.TileLayer {
  const attribution = isAncientLayer(baseLayer)
    ? "古地图 © 中研院 CCTS（中华文明之时空基础架构）"
    : "底图 © 高德地图";

  if (isAncientLayer(baseLayer)) {
    const layer = new AncientTileLayer("", {
      /* 古图层瓦片仅覆盖 z4-12：限制 maxZoom 防止进入无瓦片层级；
         updateWhenIdle 减少拖动时的请求风暴 */
      maxZoom: 12,
      maxNativeZoom: 12,
      minZoom: 4,
      updateWhenIdle: true,
      keepBuffer: 2,
      attribution,
      errorTileUrl: TRANSPARENT_PX,
      onTileFail: hooks.onTileFail,
    } as L.TileLayerOptions);
    (layer.options as { shiluLayer: string }).shiluLayer = baseLayer;
    if (hooks.onPending) {
      const on = hooks.onPending;
      layer.on("tileloadstart", () => on(1));
      const settle = () => on(-1);
      layer.on("tileload", settle);
      layer.on("tileerror", settle);
    }
    return layer;
  }
  if (baseLayer === "gaode") {
    return new GaodeTileLayer("", { maxZoom: 18, attribution });
  }
  return L.tileLayer(TILES[baseLayer], {
    subdomains: ["1", "2", "3", "4"],
    maxZoom: 18,
    attribution,
  });
}
