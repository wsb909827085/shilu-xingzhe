import L from "leaflet";

/**
 * MapController：地图实例与行迹导览控制接口的深模块。
 * 对外只暴露类型化访问器（registerShiluMap / getShiluMap / getTourCtl / flyToNode），
 * 对内隐藏 window.__shiluMap 全局镜像与 map._shiluTour 私有挂载的全部非类型化知识，
 * 调用方（Home 控制条 / 深链跳转）不再需要 any/as unknown 强转。
 */

/** 行迹导览控制接口（由 MapView 在导览启动时挂载到地图实例上） */
export interface ShiluTourCtl {
  pause?: () => void;
  resume?: () => void;
  prev?: () => void;
  next?: () => void;
  restart?: () => void;
  /** 跳转到指定站（进度条点击/拖动）：自动解除暂停继续播放 */
  jump?: (i?: number) => void;
}

type ShiluMap = L.Map & { _shiluTour?: ShiluTourCtl };

const w = () => window as unknown as { __shiluMap?: ShiluMap };

/** 由 MapView 在导览就绪时注册（window 全局镜像，保证控制条读到正确实例） */
export function registerShiluMap(map: L.Map): void {
  w().__shiluMap = map as ShiluMap;
}

/** 读取当前注册的地图实例（深链跳转等外部调用用） */
export function getShiluMap(): L.Map | null {
  return w().__shiluMap ?? null;
}

/** 读取导览控制接口：优先 window 镜像，兜底调用方持有的 map ref */
export function getTourCtl(fallback?: L.Map | null): ShiluTourCtl | null {
  const map = w().__shiluMap ?? (fallback as ShiluMap | null | undefined) ?? null;
  return map?._shiluTour ?? null;
}

/** 飞行定位到知识库节点（/map?node= 深链使用） */
export function flyToNode(node: { lat: number; lon: number }, zoom = 9, delayMs = 400): void {
  const map = getShiluMap();
  if (!map) return;
  window.setTimeout(() => map.flyTo([node.lat, node.lon], zoom, { duration: 1.6 }), delayMs);
}
