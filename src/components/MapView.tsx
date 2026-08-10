/* eslint-disable react-refresh/only-export-components -- 组件与地图常量（底图/主题表）同文件导出，属既有设计 */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapNode, Poem } from "@db/schema";

export type PoetView = {
  id: number;
  slug: string;
  name: string;
  dynasty: string;
  color: string;
  route: string[];
  aiPortrait?: string | null;
};

/** 底图层级：现代地图（高德/卫星），古地图按朝代自动切换 */
export type BaseLayerKey = "gaode" | "satellite" | "tang" | "nsong" | "ssong";

export const BASE_LAYER_TREE = [
  {
    group: "现代地图",
    items: [
      { key: "gaode" as const, label: "标准图（仿古）" },
      { key: "satellite" as const, label: "卫星图" },
    ],
  },
  {
    group: "古地图",
    items: [
      { key: "tang" as const, label: "唐代" },
      { key: "nsong" as const, label: "北宋" },
      { key: "ssong" as const, label: "南宋" },
    ],
  },
];

/** 朝代 → 古地图层 */
export const DYNASTY_TO_LAYER: Record<string, BaseLayerKey> = {
  唐: "tang",
  北宋: "nsong",
  南宋: "ssong",
};

/** 地图主题：整套滤镜 + UI 配色 + 环境动效 */
export type MapTheme = "silk" | "verdant" | "ink" | "night";

export const MAP_THEMES: { key: MapTheme; label: string; hint: string }[] = [
  { key: "silk", label: "仿古绢本", hint: "米黄宣纸 · 云雾花瓣" },
  { key: "verdant", label: "青绿山水", hint: "青绿色调 · 落叶流光" },
  { key: "ink", label: "水墨灰白", hint: "黑白灰 · 晕染微光" },
  { key: "night", label: "暗夜星空", hint: "深色底 · 萤火暖光" },
];

/** 主题加载底色（瓦片未到时可见） */
const THEME_BG: Record<MapTheme, string> = {
  silk: "#e8e0cc",
  verdant: "#d8e2d4",
  ink: "#eeeeeb",
  night: "#141b28",
};

const TILES: Record<string, string> = {
  /* style 7：高德简洁底图（仅主要地名，清爽） */
  gaode: "https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
  satellite: "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
};

/** 古地图：z4-10 已预载本站（大庾岭区域细化至 z10）；
 *  更高层级回源中研院 CCTS 在线瓦片（授权手续补办中） */
const CCTS_CODES: Record<string, string> = { tang: "ad0741", nsong: "ad1111", ssong: "ad1208" };
const ANCIENT_LAYERS = ["tang", "nsong", "ssong"];

class AncientTileLayer extends L.TileLayer {
  private failCount = 0;
  getTileUrl(coords: L.Coords): string {
    const layer = (this.options as { shiluLayer: string }).shiluLayer;
    if (coords.z <= 10) {
      return `/tiles/${layer}/${coords.z}-${coords.x}-${coords.y}.png`;
    }
    return `https://gis.sinica.edu.tw/ccts/file-exists.php?img=${CCTS_CODES[layer]}-png-${coords.z}-${coords.x}-${coords.y}`;
  }
  /* 瓦片持续加载失败（CCTS 不可达）时，触发一次回退提示 */
  protected _tileOnError(done: L.DoneCallback, tile: HTMLImageElement, e: Error) {
    this.failCount += 1;
    if (this.failCount === 12) {
      (this.options as { onTileFail?: () => void }).onTileFail?.();
    }
    super._tileOnError(done, tile, e);
  }
}

const TRANSPARENT_PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNsaGj4DwAFhAJ/2eT9QAAAAABJRU5ErkJggg==";

const STYLE_ID = "shilu-map-style";
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .shilu-route { animation: shilu-dash 1.4s linear infinite; }
    @keyframes shilu-dash { to { stroke-dashoffset: -22; } }
    .shilu-node-label {
      background: rgba(246,241,227,0.92); border: 1px solid rgba(160,141,95,0.5);
      border-radius: 10px; padding: 1px 9px; font-size: 12px; color: #4a3f2a;
      white-space: nowrap; box-shadow: 0 1px 6px rgba(60,45,20,0.18);
      font-family: "Noto Serif SC", serif; backdrop-filter: blur(4px);
    }
    .shilu-node-label::before { display: none; }
    .shilu-meiguan-label {
      background: rgba(158,59,59,0.9); border: 1px solid rgba(246,241,227,0.6);
      border-radius: 10px; padding: 2px 10px; font-size: 13px; font-weight: 600;
      color: #f6f1e3; white-space: nowrap; box-shadow: 0 2px 8px rgba(60,45,20,0.3);
      font-family: "Noto Serif SC", serif; backdrop-filter: blur(4px);
    }
    .shilu-meiguan-label::before { display: none; }
    .shilu-pulse { animation: shilu-pulse 2s ease-out infinite; }
    @keyframes shilu-pulse { 0% { opacity: 0.8; } 100% { opacity: 0; } }
    /* 瓦片滤镜统一由主题（.shilu-theme-*）控制 */
    /* 瓦片加载前透出主题底色，避免灰白空闪 */
    .leaflet-container { background: transparent; }
    /* 导览小人：骑马行旅 SVG（不加载任何图片资源） */
    .shilu-traveler { background: transparent; border: none; }
    .shilu-traveler .tp-bob { animation: shilu-bob 0.9s ease-in-out infinite; transform-origin: 20px 20px; }
    .shilu-traveler .tp-still .tp-bob,
    .shilu-traveler.tp-still .tp-bob { animation: none; }
    @keyframes shilu-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    /* 地形起伏：山路段更剧烈的颠簸 */
    .shilu-traveler .tp-jolt { animation: shilu-jolt 0.5s ease-in-out infinite; transform-origin: 20px 22px; }
    @keyframes shilu-jolt {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      30% { transform: translateY(-4px) rotate(-2deg); }
      60% { transform: translateY(2px) rotate(1.5deg); }
    }
    /* 舟行：船身随水波轻荡 + 船桨划动 */
    .shilu-traveler .tp-row { animation: shilu-row 1.3s ease-in-out infinite; transform-origin: 20px 30px; }
    @keyframes shilu-row {
      0%, 100% { transform: translateY(0) rotate(-1.5deg); }
      50% { transform: translateY(-2px) rotate(1.5deg); }
    }
    .shilu-traveler .tp-oar { animation: shilu-oar 1.3s ease-in-out infinite; transform-origin: 31px 26px; }
    @keyframes shilu-oar {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(14deg); }
    }
    /* 步行：拄杖随步伐点地 */
    .shilu-traveler .tp-step { animation: shilu-step 0.6s ease-in-out infinite; transform-origin: 24px 34px; }
    @keyframes shilu-step {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(3deg) translateY(-2px); }
    }
    .shilu-traveler .tp-staff { animation: shilu-staff 0.6s ease-in-out infinite; transform-origin: 33px 12px; }
    @keyframes shilu-staff {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-6deg); }
    }
    /* 途中提示 toast：飘过并淡出 */
    .shilu-travel-toast {
      background: rgba(61,52,33,0.88); color: #f6f1e3; border: 1px solid rgba(232,200,119,0.4);
      border-radius: 999px; padding: 4px 14px; font-size: 12px; white-space: nowrap;
      font-family: "Noto Serif SC", serif; box-shadow: 0 4px 14px rgba(60,45,20,0.3);
      backdrop-filter: blur(6px); animation: shilu-toast-in 0.4s ease; pointer-events: none;
    }
    .shilu-travel-toast::before { display: none; }
    @keyframes shilu-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .shilu-tour-tip {
      background: rgba(246,241,227,0.96); border: 1px solid rgba(160,141,95,0.55);
      border-radius: 16px; padding: 12px 16px; font-size: 14px; color: #3d3421;
      max-width: 340px; line-height: 1.8; box-shadow: 0 8px 26px rgba(60,45,20,0.3);
      font-family: "Noto Serif SC", serif; backdrop-filter: blur(8px);
    }
    .shilu-tour-tip::before { display: none; }
    .shilu-tour-tip .tt-title {
      font-weight: 700; color: #4a3f2a; margin-bottom: 6px; font-size: 16px;
      display: flex; align-items: baseline; gap: 8px; justify-content: space-between;
    }
    .shilu-tour-tip .tt-step {
      font-weight: 500; font-size: 12px; color: #a08d5f; white-space: nowrap;
      background: rgba(160,141,95,0.14); padding: 2px 9px; border-radius: 999px;
    }
    .shilu-tour-tip .tt-poem {
      color: #9e3b3b; font-size: 14px; line-height: 1.75; margin-bottom: 7px;
      padding: 7px 11px; background: rgba(158,59,59,0.06); border-left: 3px solid rgba(158,59,59,0.4);
      border-radius: 0 8px 8px 0; font-style: italic;
    }
    .shilu-tour-tip .tt-poem-src {
      font-style: normal; color: #a08d5f; font-size: 12px; margin-left: 4px; white-space: nowrap;
    }
    .shilu-tour-tip .tt-body { line-height: 1.8; }

    /* ===== 主题滤镜：作用于瓦片层 ===== */
    .shilu-theme-silk .leaflet-tile-pane {
      filter: sepia(0.26) saturate(0.82) hue-rotate(-8deg) brightness(1.03) contrast(0.97);
    }
    /* 青绿山水：取《千里江山图》石青/石绿矿物色——低饱和青绿，不刺眼 */
    .shilu-theme-verdant .leaflet-tile-pane {
      filter: sepia(0.3) hue-rotate(88deg) saturate(0.6) brightness(1.05) contrast(0.9);
    }
    /* 水墨灰白：大量留白 + 淡墨晕染——高亮低对比的宣纸灰 */
    .shilu-theme-ink .leaflet-tile-pane {
      filter: grayscale(1) brightness(1.12) contrast(0.8) opacity(0.94);
    }
    .shilu-theme-night .leaflet-tile-pane {
      filter: invert(0.92) hue-rotate(185deg) saturate(0.55) brightness(0.82) contrast(0.94);
    }
    .shilu-theme-silk, .shilu-theme-verdant, .shilu-theme-ink, .shilu-theme-night {
      transition: background 0.6s ease;
    }
    .shilu-theme-silk .leaflet-tile-pane, .shilu-theme-verdant .leaflet-tile-pane,
    .shilu-theme-ink .leaflet-tile-pane, .shilu-theme-night .leaflet-tile-pane {
      transition: filter 0.6s ease;
    }

    /* ===== 主题配色：节点标签 / 导览卡 / 提示 ===== */
    .shilu-theme-verdant .shilu-node-label {
      background: rgba(238,244,232,0.94); border-color: rgba(74,110,94,0.5); color: #2c453a;
      box-shadow: 0 1px 6px rgba(34,64,52,0.16);
    }
    .shilu-theme-ink .shilu-node-label {
      background: rgba(252,252,250,0.9); border-color: rgba(70,70,66,0.35); color: #33332f;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
    }
    .shilu-theme-night .shilu-node-label {
      background: rgba(20,27,40,0.88); border-color: rgba(232,200,119,0.45); color: #e8d9b0;
      box-shadow: 0 1px 8px rgba(0,0,0,0.5);
    }
    .shilu-theme-night .shilu-tour-tip {
      background: rgba(24,31,46,0.95); border-color: rgba(232,200,119,0.4); color: #e6dcc2;
      box-shadow: 0 6px 24px rgba(0,0,0,0.55);
    }
    .shilu-theme-night .shilu-tour-tip .tt-title { color: #f0e4c2; }
    .shilu-theme-night .shilu-tour-tip .tt-step {
      color: #e8c877; background: rgba(232,200,119,0.16);
    }
    .shilu-theme-night .shilu-tour-tip .tt-poem {
      color: #e8a9a0; background: rgba(232,169,160,0.08); border-left-color: rgba(232,169,160,0.45);
    }
    .shilu-theme-night .shilu-tour-tip .tt-poem-src { color: #b8a888; }
    .shilu-theme-night .shilu-travel-toast {
      background: rgba(20,27,40,0.92); color: #e8d9b0;
    }
    .shilu-theme-ink .shilu-tour-tip {
      background: rgba(253,253,251,0.96); border-color: rgba(70,70,66,0.32); color: #2e2e2a;
      box-shadow: 0 8px 26px rgba(0,0,0,0.14);
    }
    .shilu-theme-ink .shilu-tour-tip .tt-title { color: #22221f; }
    .shilu-theme-ink .shilu-tour-tip .tt-step {
      color: #5a5a54; background: rgba(0,0,0,0.07);
    }
    .shilu-theme-ink .shilu-tour-tip .tt-poem {
      color: #3f3f3a; background: rgba(0,0,0,0.045); border-left-color: rgba(40,40,36,0.45);
    }
    .shilu-theme-ink .shilu-tour-tip .tt-poem-src { color: #83837c; }
    .shilu-theme-ink .shilu-travel-toast {
      background: rgba(48,48,44,0.85); color: #f2f2ee; border-color: rgba(255,255,255,0.25);
    }
    .shilu-theme-verdant .shilu-tour-tip {
      background: rgba(240,246,236,0.96); border-color: rgba(74,110,94,0.42); color: #2c453a;
      box-shadow: 0 8px 26px rgba(30,58,48,0.2);
    }
    .shilu-theme-verdant .shilu-tour-tip .tt-title { color: #27403a; }
    .shilu-theme-verdant .shilu-tour-tip .tt-step {
      color: #5b7a68; background: rgba(74,110,94,0.14);
    }
    .shilu-theme-verdant .shilu-tour-tip .tt-poem {
      color: #7a4a3a; background: rgba(122,74,58,0.06); border-left-color: rgba(122,74,58,0.4);
    }
    .shilu-theme-verdant .shilu-tour-tip .tt-poem-src { color: #7d927f; }
    .shilu-theme-verdant .shilu-travel-toast {
      background: rgba(38,64,54,0.88); color: #e9f2e4; border-color: rgba(200,220,190,0.35);
    }

    /* ===== 导览驿站卡：固定画框 · 逐行浮现 · 框内自动慢滚 ===== */
    .shilu-tour-tip {
      width: 340px; max-width: 340px; max-height: 300px; overflow: hidden;
      display: flex; flex-direction: column; white-space: normal;
    }
    .shilu-tour-tip .tt-title { animation: shilu-tt-in 0.45s ease both; flex-shrink: 0; }
    .shilu-tour-tip .tt-poem { animation: shilu-tt-in 0.45s ease 0.12s both; flex-shrink: 0; }
    .shilu-tour-tip .tt-body {
      animation: shilu-tt-in 0.45s ease 0.24s both;
      max-height: 150px; overflow-y: auto; overscroll-behavior: contain;
      scrollbar-width: thin; scrollbar-color: rgba(160,141,95,0.5) transparent;
      mask-image: linear-gradient(to bottom, black 88%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 90%, transparent 100%);
    }
    .shilu-tour-tip .tt-body::-webkit-scrollbar { width: 4px; }
    .shilu-tour-tip .tt-body::-webkit-scrollbar-thumb {
      background: rgba(160,141,95,0.45); border-radius: 2px;
    }
    @keyframes shilu-tt-in {
      from { opacity: 0; transform: translateY(7px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ===== 环境动效层：云雾 / 落叶花瓣 / 水墨微光 / 萤火 ===== */
    .shilu-ambient {
      position: absolute; inset: 0; z-index: 450; pointer-events: none; overflow: hidden;
    }
    .shilu-ambient > span { position: absolute; display: block; will-change: transform, opacity; }

    /* 云雾：半透明白雾团缓缓横移 */
    .shilu-amb-cloud {
      width: 340px; height: 110px; border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.5), rgba(255,255,255,0) 68%);
      filter: blur(10px); animation: shilu-cloud linear infinite;
    }
    @keyframes shilu-cloud {
      from { transform: translateX(-30vw) translateY(0); opacity: 0; }
      12% { opacity: 0.85; }
      88% { opacity: 0.85; }
      to { transform: translateX(115vw) translateY(-3vh); opacity: 0; }
    }
    .shilu-theme-night .shilu-amb-cloud {
      background: radial-gradient(ellipse at center, rgba(120,140,175,0.28), rgba(120,140,175,0) 68%);
    }
    .shilu-theme-ink .shilu-amb-cloud {
      background: radial-gradient(ellipse at center, rgba(150,150,146,0.26), rgba(150,150,146,0) 68%);
    }
    .shilu-theme-verdant .shilu-amb-cloud {
      background: radial-gradient(ellipse at center, rgba(235,244,235,0.55), rgba(235,244,235,0) 68%);
    }

    /* 落叶 / 花瓣：旋转飘落并左右摇摆 */
    .shilu-amb-leaf {
      width: 14px; height: 14px; border-radius: 60% 0 60% 0;
      animation: shilu-fall linear infinite;
    }
    .shilu-theme-silk .shilu-amb-leaf { background: linear-gradient(135deg, #e8b7a8, #d99a86); opacity: 0.8; }
    .shilu-theme-verdant .shilu-amb-leaf { background: linear-gradient(135deg, #9ab684, #6f9470); opacity: 0.8; }
    .shilu-theme-ink .shilu-amb-leaf { background: linear-gradient(135deg, #ababa6, #7c7c76); opacity: 0.5; }
    .shilu-theme-night .shilu-amb-leaf { background: linear-gradient(135deg, #b08a4e, #8a6838); opacity: 0.55; }
    @keyframes shilu-fall {
      0% { transform: translate(0, -8vh) rotate(0deg); opacity: 0; }
      10% { opacity: 1; }
      25% { transform: translate(4vw, 22vh) rotate(140deg); }
      50% { transform: translate(-3vw, 50vh) rotate(300deg); }
      75% { transform: translate(3vw, 76vh) rotate(430deg); }
      100% { transform: translate(-1vw, 108vh) rotate(560deg); opacity: 0; }
    }

    /* 水墨晕染微光：墨团缓慢呼吸 */
    .shilu-amb-glow {
      width: 260px; height: 260px; border-radius: 50%;
      filter: blur(26px); animation: shilu-glow ease-in-out infinite;
    }
    .shilu-theme-ink .shilu-amb-glow {
      /* 淡墨晕染：墨团呼吸般扩散，克制不脏屏 */
      background: radial-gradient(circle, rgba(64,64,60,0.16), rgba(64,64,60,0) 62%);
    }
    .shilu-theme-verdant .shilu-amb-glow {
      /* 石青/石绿矿光 */
      background: radial-gradient(circle, rgba(84,132,112,0.22), rgba(84,132,112,0) 64%);
    }
    .shilu-theme-silk .shilu-amb-glow {
      background: radial-gradient(circle, rgba(214,182,120,0.22), rgba(214,182,120,0) 66%);
    }
    @keyframes shilu-glow {
      0%, 100% { transform: scale(0.85); opacity: 0.5; }
      50% { transform: scale(1.18); opacity: 1; }
    }

    /* 萤火 / 星光：暖光点明灭漂浮（暗夜主题） */
    .shilu-amb-firefly {
      width: 5px; height: 5px; border-radius: 50%;
      background: #f5d78a; box-shadow: 0 0 9px 2.5px rgba(245,215,138,0.75);
      animation: shilu-firefly ease-in-out infinite;
    }
    @keyframes shilu-firefly {
      0%, 100% { opacity: 0.12; transform: translate(0, 0); }
      30% { opacity: 1; }
      55% { opacity: 0.4; transform: translate(1.6vw, -1.8vh); }
      80% { opacity: 0.95; }
    }

    /* ===== 导览侧边卡：单实例 dock，从地图右侧滑入（移动端底部上滑），不遮挡点位 =====
       驿站卡与途中提示复用同一个 dock 元素，仅替换内容与样式类 */
    .shilu-tour-dock {
      position: absolute; top: 72px; right: 14px; z-index: 950;
      width: 330px; max-width: min(330px, calc(100% - 28px));
      transform: translateX(calc(100% + 24px));
      transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: auto;
    }
    .shilu-tour-dock.show { transform: translateX(0); }
    /* 驿站卡形态：复用 shilu-tour-tip 的画框视觉 */
    .shilu-tour-dock .shilu-tour-tip {
      width: 100%; max-width: 100%; max-height: min(46vh, 380px);
    }
    /* 途中提示形态：轻量小条 */
    .shilu-tour-dock.toast .shilu-travel-toast { animation: none; }
    @media (max-width: 640px) {
      .shilu-tour-dock {
        top: auto; bottom: 86px; left: 12px; right: 12px; width: auto; max-width: none;
        transform: translateY(calc(100% + 100px));
      }
      .shilu-tour-dock.show { transform: translateY(0); }
    }

    /* ===== 古地图瓦片加载指示 ===== */
    .shilu-tile-loading {
      position: absolute; left: 14px; top: 90px; z-index: 960;
      display: flex; align-items: center; gap: 7px;
      background: rgba(61,52,33,0.82); color: #f6f1e3; font-size: 11.5px;
      padding: 5px 12px; border-radius: 999px; pointer-events: none;
      font-family: "Noto Serif SC", serif; backdrop-filter: blur(6px);
      box-shadow: 0 3px 12px rgba(60,45,20,0.25);
    }
    .shilu-tile-spin {
      width: 11px; height: 11px; border-radius: 50%;
      border: 2px solid rgba(246,241,227,0.35); border-top-color: #f6f1e3;
      animation: shilu-spin 0.9s linear infinite;
    }
    @keyframes shilu-spin { to { transform: rotate(360deg); } }

    /* 尊重系统减弱动态偏好 */
    @media (prefers-reduced-motion: reduce) {
      .shilu-ambient { display: none; }
    }
  `;
  document.head.appendChild(style);
}


/** 交通工具类型（按路段启发式判断） */
export type TravelMode = "boat" | "horse" | "walk";

/** 骑马行旅小人 SVG（divIcon HTML；不加载任何外部图片） */
function HORSE_SVG(color: string): string {
  return `<svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="24" cy="43" rx="13" ry="3" fill="rgba(60,45,20,0.18)"/>
  <path d="M9 26 Q10 20 16 19 L30 18 Q38 18 39 24 L40 27 Q41 30 38 30 L35 30 L34 38 Q34 40 32 40 L31 40 Q29 40 29 38 L29 31 L19 32 L18 39 Q18 41 16 41 L15 41 Q13 41 13 39 L14 31 Q10 30 9 26 Z" fill="#8a5a2e"/>
  <path d="M37 20 Q42 14 44 17 Q45 20 41 23 L38 24 Z" fill="#8a5a2e"/>
  <circle cx="43" cy="16.5" r="1" fill="#f6f1e3"/>
  <path d="M16 19 Q14 14 18 13 L21 13 Q24 13 24 17 L24 20 Z" fill="${color}"/>
  <circle cx="19" cy="10" r="4.2" fill="#f2d5b0"/>
  <path d="M14.5 9 Q19 4 23.5 9 L22.6 9.8 Q19 6.6 15.4 9.8 Z" fill="#4a3f2a"/>
  <path d="M16.5 13.5 Q19 16 22 13.5 L22 15 Q19 17.5 16 15 Z" fill="${color}" opacity="0.85"/>
  <path d="M23 21 L33 23" stroke="#4a3f2a" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="9.5" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.5"/>
</svg>`;
}

/** 舟行小人（水路段）：乌篷船 + 站立乘客 + 船桨 */
function BOAT_SVG(color: string): string {
  return `<svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="24" cy="42" rx="15" ry="2.5" fill="rgba(60,45,20,0.15)"/>
  <path d="M4 30 Q24 40 44 30 L42 34 Q24 43 6 34 Z" fill="#6d4a2a"/>
  <path d="M8 30 Q24 38 40 30" stroke="#4a3f2a" stroke-width="1" fill="none"/>
  <path d="M14 29 Q24 20 34 29 L33 29.5 Q24 22 15 29.5 Z" fill="#8a5a2e" opacity="0.9"/>
  <circle cx="26" cy="22" r="3.6" fill="#f2d5b0"/>
  <path d="M22.5 21 Q26 17 29.5 21 L28.8 21.6 Q26 19 23.2 21.6 Z" fill="#4a3f2a"/>
  <path d="M24 25 L31 27" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>
  <path class="tp-oar" d="M31 26 L39 33" stroke="#4a3f2a" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M2 33 Q5 31 8 33 M40 34 Q43 32 46 34" stroke="rgba(160,190,210,0.8)" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</svg>`;
}

/** 步行小人（山岭/短路段）：背行囊拄杖的旅人 */
function WALK_SVG(color: string): string {
  return `<svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="24" cy="43" rx="12" ry="2.6" fill="rgba(60,45,20,0.18)"/>
  <circle cx="23" cy="11" r="4" fill="#f2d5b0"/>
  <path d="M19.5 10 Q23 6 26.5 10 L25.8 10.7 Q23 8.4 20.2 10.7 Z" fill="#4a3f2a"/>
  <path d="M20 15 Q18 24 19 33 L22 33 L24 25 L26 33 L29 33 Q30 24 28 15 Z" fill="${color}"/>
  <path d="M19 33 L18 40 L20 40 L22 33 Z M26 33 L28 40 L30 40 L29 33 Z" fill="#4a3f2a"/>
  <rect x="14" y="17" width="7" height="9" rx="2.5" fill="#8a5a2e"/>
  <path d="M28 16 L33 13" stroke="#8a5a2e" stroke-width="2.5" stroke-linecap="round"/>
  <path class="tp-staff" d="M33 12 L35 40" stroke="#6d4a2a" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="24" cy="20" r="10" fill="none" stroke="${color}" stroke-width="1.1" opacity="0.45"/>
</svg>`;
}

const MODE_SVG: Record<TravelMode, (color: string) => string> = {
  boat: BOAT_SVG,
  horse: HORSE_SVG,
  walk: WALK_SVG,
};

/** 移动动画 class（随路段类型切换）：舟行荡桨 / 山路颠簸 / 步行点杖 */
const MODE_ANIM: Record<TravelMode, string> = {
  boat: "tp-row",
  horse: "tp-jolt",
  walk: "tp-step",
};

/** 两坐标间大圆距离（公里） */
function haversineKm(a: L.LatLngExpression, b: L.LatLngExpression): number {
  /* 统一归一化为 [lat,lng]，兼容数组与 L.LatLng 对象 */
  const la = L.latLng(a);
  const lb = L.latLng(b);
  const lat1 = la.lat;
  const lon1 = la.lng;
  const lat2 = lb.lat;
  const lon2 = lb.lng;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 关隘/山岭节点（过这些节点的路段视为山行） */
const MOUNTAIN_SLUGS = new Set(["梅关", "蓝关"]);

/** 启发式判断路段类型：
 *  - 跨省长距离（>260km）视为舟行（唐宋迁客多循汴/淮/江/赣/湘水路）
 *  - 端点是关隘（梅关/蓝关）视为山行（骑马/跋涉过岭）
 *  - 其余较短路段视为步行 */
function classifySegment(
  from: L.LatLngExpression,
  to: L.LatLngExpression,
  fromSlug?: string,
  toSlug?: string,
): TravelMode {
  if ((fromSlug && MOUNTAIN_SLUGS.has(fromSlug)) || (toSlug && MOUNTAIN_SLUGS.has(toSlug))) {
    return "horse"; // 过岭骑马跋涉
  }
  const km = haversineKm(from, to);
  if (km > 260) return "boat"; // 长途水路
  if (km > 90) return "horse"; // 中途驿路骑马
  return "walk"; // 短途步行
}

/** 沿两点的球面线性插值（t: 0→1），让小人沿路线平滑移动 */
function lerpLatLng(a: L.LatLngExpression, b: L.LatLngExpression, t: number): L.LatLngExpression {
  const la = L.latLng(a);
  const lb = L.latLng(b);
  return [la.lat + (lb.lat - la.lat) * t, la.lng + (lb.lng - la.lng) * t] as L.LatLngExpression;
}

type Props = {
  poets: PoetView[];
  nodes: MapNode[];
  selectedPoet: string | null;
  /** 对比诗人：与 selectedPoet 同时显示 */
  comparePoet?: string | null;
  baseLayer: BaseLayerKey;
  /** 诗人导览模式：小人沿路线逐站移动并弹出解说卡 */
  tour: boolean;
  /** 各站解说文本：nodeSlug -> text（来自知识库 tourStops） */
  tourStops?: Map<string, string>;
  /** 全部诗作（导览驿站卡片按诗人+节点关联摘录） */
  poems?: Poem[];
  /** 导览结束/手动停止回调 */
  onTourEnd?: () => void;
  /** 导览进度上报（第几站 / 共几站），供外部控制条显示 */
  onTourProgress?: (step: number, total: number) => void;
  /** 导览播放状态上报 */
  onTourPlaying?: (playing: boolean) => void;
  /** 古地图瓦片持续失败时回调（提示用户切换底图） */
  onTileFail?: () => void;
  /** 卫星图：是否叠加省级行政区划 */
  showBoundaries?: boolean;
  onSelectPoet: (slug: string) => void;
  onSelectNode: (slug: string) => void;
  onNodeCard: (node: MapNode) => void;
  onMapReady?: (map: L.Map) => void;
  /** 地图主题（滤镜 + 配色 + 环境动效） */
  theme?: MapTheme;
  /** 环境动效开关（云雾/落叶/微光/萤火），默认开启 */
  ambient?: boolean;
};

export default function MapView({
  poets,
  nodes,
  selectedPoet,
  comparePoet,
  baseLayer,
  tour,
  tourStops,
  poems,
  onTourEnd,
  onTourProgress,
  onTourPlaying,
  onTileFail,
  showBoundaries,
  onSelectPoet,
  onSelectNode,
  onNodeCard,
  onMapReady,
  theme = "silk",
  ambient = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* 古地图瓦片加载计数（>0 时显示加载指示） */
  const [tilePending, setTilePending] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const boundaryRef = useRef<L.GeoJSON | null>(null);
  const playTimerRef = useRef<number | null>(null);
  /** 导览清理句柄：重绘/卸载时移除侧边 dock、终止动画帧 */
  const tourCleanupRef = useRef<(() => void) | null>(null);
  /** 已完成视野适配的选中态（避免播放/重绘时强制回到初始视野） */
  const fittedForRef = useRef<string | null>(null);
  /* 回调 ref：避免因父组件内联回调引用变化而重启导览/绘制 effect */
  const cbRef = useRef({
    onTourEnd,
    onTourProgress,
    onTourPlaying,
    onSelectNode,
    onSelectPoet,
    onNodeCard,
  });
  cbRef.current = {
    onTourEnd,
    onTourProgress,
    onTourPlaying,
    onSelectNode,
    onSelectPoet,
    onNodeCard,
  };

  /* 初始化 */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureStyle();
    const map = L.map(containerRef.current, {
      center: [28.5, 113.5],
      zoom: 6,
      minZoom: 4,
      maxZoom: 12,
      maxBounds: [[8, 88], [54, 136]],
      maxBoundsViscosity: 0.7,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
    });
    /* 缩放控件放左上：右下留给 AI 导游与音乐 dock，避免拥挤遮挡 */
    L.control.zoom({ position: "topleft" }).addTo(map);
    map.attributionControl.setPrefix(false);
    overlayRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    onMapReady?.(map);
    /* 容器尺寸变化（如侧边栏折叠）时重算地图尺寸，避免出现空白区域 */
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    ro.observe(containerRef.current);
    (map as unknown as { _shiluRO?: ResizeObserver })._shiluRO = ro;
    return () => {
      (map as unknown as { _shiluRO?: ResizeObserver })._shiluRO?.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 底图切换 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseRef.current) {
      map.removeLayer(baseRef.current);
      baseRef.current = null;
    }
    const isAncient = ANCIENT_LAYERS.includes(baseLayer);
    const attribution = isAncient
      ? "古地图 © 中研院 CCTS（中华文明之时空基础架构）"
      : "底图 © 高德地图";
    let layer: L.TileLayer;
    if (isAncient) {
      layer = new AncientTileLayer("", {
        /* 古图层瓦片仅覆盖 z4-10（本站预载）+ z11-12 回源 CCTS：
           限制 maxZoom 防止进入无瓦片层级；updateWhenIdle 减少拖动时的请求风暴 */
        maxZoom: 12,
        maxNativeZoom: 12,
        minZoom: 4,
        updateWhenIdle: true,
        keepBuffer: 2,
        attribution,
        errorTileUrl: TRANSPARENT_PX,
        onTileFail,
      } as L.TileLayerOptions);
      (layer.options as { shiluLayer: string }).shiluLayer = baseLayer;
      /* 瓦片加载进度指示（进行中/完成/失败都会收敛到 0） */
      layer.on("tileloadstart", () => setTilePending((n) => n + 1));
      const settle = () => setTilePending((n) => Math.max(0, n - 1));
      layer.on("tileload", settle);
      layer.on("tileerror", settle);
    } else {
      layer = L.tileLayer(TILES[baseLayer], {
        subdomains: ["1", "2", "3", "4"],
        maxZoom: 18,
        attribution,
      });
    }
    layer.addTo(map);
    baseRef.current = layer;
  }, [baseLayer, onTileFail]);

  /* 行政区划悬停叠加：卫星图=省级，现代标准图=市/地级 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (boundaryRef.current) {
      map.removeLayer(boundaryRef.current);
      boundaryRef.current = null;
    }
    const isSat = baseLayer === "satellite";
    const isModern = baseLayer === "gaode";
    if ((!isSat && !isModern) || !showBoundaries) return;
    let cancelled = false;
    fetch(isSat ? "/china-provinces.json" : "/china-cities.json")
      .then((r) => {
        if (!r.ok) throw new Error(`boundary ${r.status}`);
        return r.json();
      })
      .then((gj) => {
        if (cancelled || !mapRef.current) return;
        const m = mapRef.current;
        /* 独立高 zIndex 图层，确保压在瓦片之上 */
        if (!m.getPane("shilu-boundary")) {
          const pane = m.createPane("shilu-boundary");
          pane.style.zIndex = "450";
          pane.style.pointerEvents = "auto";
        }
        const layer = L.geoJSON(gj, {
          pane: "shilu-boundary",
          style: {
            color: isSat ? "#ffd97a" : "#a08d5f",
            weight: isSat ? 2 : 1.4,
            opacity: 0.9,
            dashArray: isSat ? "6 4" : "4 4",
            fillColor: isSat ? "#ffd97a" : "#d4a24e",
            /* 纯线条（fillOpacity 0），点击/悬停不出现矩形高亮块 */
            fillOpacity: 0,
            interactive: true,
          },
          onEachFeature: (f, l) => {
            const name = (f.properties as { name?: string })?.name;
            if (name) {
              l.bindTooltip(name, {
                sticky: true,
                className: "shilu-node-label",
                direction: "center",
              });
            }
            /* 悬停仅加亮线条，不填充面，避免矩形框 */
            l.on("mouseover", () =>
              (l as L.Path).setStyle({ weight: isSat ? 3 : 2.4, opacity: 1 }),
            );
            l.on("mouseout", () =>
              (l as L.Path).setStyle({ weight: isSat ? 2 : 1.4, opacity: 0.9 }),
            );
          },
        }).addTo(m);
        boundaryRef.current = layer;
      })
      .catch((e) => console.warn("[shilu] 行政区划叠加失败:", e));
    return () => {
      cancelled = true;
    };
  }, [baseLayer, showBoundaries]);

  /** 点击节点：飞到合适缩放级别并弹卡片 */
  const focusNodeRef = useRef<(n: MapNode) => void>(() => {});
  focusNodeRef.current = (n: MapNode) => {
    const map = mapRef.current;
    if (map) {
      map.flyTo([n.lat, n.lon], Math.max(map.getZoom(), 8), { duration: 0.8 });
    }
    cbRef.current.onNodeCard(n);
  };

  /* 图层绘制 */
  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;
    if (playTimerRef.current) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    /* 先清掉上一场导览（dock/rAF），再整层重绘 */
    tourCleanupRef.current?.();
    tourCleanupRef.current = null;
    overlay.clearLayers();

    const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));
    const visible = selectedPoet
      ? poets.filter((p) => p.slug === selectedPoet || p.slug === comparePoet)
      : poets;
    const dimOthers = !!selectedPoet;
    const bounds: L.LatLngExpression[] = [];

    for (const poet of visible) {
      const pts = poet.route
        .map((s) => nodeBySlug.get(s))
        .filter((n): n is MapNode => !!n)
        .map((n) => [n.lat, n.lon] as L.LatLngExpression);
      if (pts.length < 2) continue;
      bounds.push(...pts);

      const drawRoute = (upto?: number, isPlay = false) => {
        const seg = upto ? pts.slice(0, upto) : pts;
        const under = L.polyline(seg, {
          color: poet.color,
          weight: selectedPoet ? 10 : 7,
          opacity: 0.14,
          lineCap: "round",
        }).addTo(overlay);
        /* 中层实线：古道质感 */
        const solid = L.polyline(seg, {
          color: poet.color,
          weight: selectedPoet ? 3.2 : 2.4,
          opacity: 0.9,
          lineCap: "round",
        }).addTo(overlay);
        /* 上层白芯虚线：驿路珠链 */
        const dash = L.polyline(seg, {
          color: "#f6f1e3",
          weight: selectedPoet ? 1.6 : 1.2,
          opacity: 0.9,
          dashArray: "1 12",
          lineCap: "round",
          className: "shilu-route",
        })
          .addTo(overlay)
          .bindTooltip(`${poet.name}行迹`, { sticky: true, className: "shilu-node-label" });
        if (isPlay) {
          (under as unknown as { _shiluPlay?: boolean })._shiluPlay = true;
          (solid as unknown as { _shiluPlay?: boolean })._shiluPlay = true;
          (dash as unknown as { _shiluPlay?: boolean })._shiluPlay = true;
        }
      };

      if (tour && selectedPoet && poet.slug === selectedPoet) {
        /* —— 导览模式：小人沿路线逐站「走」过去（逐帧插值），按路段换交通工具 —— */
        drawRoute(2, true);

        /* 各路段类型（启发式）：决定交通工具、动画、途中提示 */
        const segModes: TravelMode[] = [];
        const segKm: number[] = [];
        for (let s = 0; s < pts.length - 1; s++) {
          segModes.push(classifySegment(pts[s], pts[s + 1], poet.route[s], poet.route[s + 1]));
          segKm.push(haversineKm(pts[s], pts[s + 1]));
        }

        /* 可切换交通工具的 traveler（divIcon，随路段换舟/马/步行） */
        let curMode: TravelMode = segModes[0] ?? "walk";
        const makeIcon = (mode: TravelMode) =>
          L.divIcon({
            className: "shilu-traveler",
            html: `<div class="tp-bob ${MODE_ANIM[mode]}">${MODE_SVG[mode](poet.color)}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 34],
          });
        const traveler = L.marker(pts[0], {
          icon: makeIcon(curMode),
          zIndexOffset: 900,
        }).addTo(overlay);
        (traveler as unknown as { _shiluPlay?: boolean })._shiluPlay = true;
        const setMode = (mode: TravelMode) => {
          if (mode !== curMode) {
            curMode = mode;
            traveler.setIcon(makeIcon(mode));
          }
        };

        /* 该诗人在各站关联的诗作摘录（驿站卡片用） */
        const poemsByNode = new Map<string, Poem>();
        (poems ?? []).forEach((pm) => {
          if (pm.poetId === poet.id && pm.nodeSlug) poemsByNode.set(pm.nodeSlug, pm);
        });

        /* 驿站卡片：地名 + 关联诗摘录 + 此站解说全文
           画框固定、逐行浮现；超长解说在框内自动缓慢滚动，绝不溢出边框 */
        const stopHtml = (i: number) => {
          const slug = poet.route[i];
          const node = slug ? nodeBySlug.get(slug) : undefined;
          const custom = slug ? tourStops?.get(slug) : undefined;
          const pm = slug ? poemsByNode.get(slug) : undefined;
          const body = custom || node?.note || "此行途经之地。";
          const title = `<div class="tt-title">${poet.name} · ${node?.name ?? ""}<span class="tt-step">${i + 1} / ${pts.length}</span></div>`;
          const poemHtml = pm
            ? `<div class="tt-poem">${pm.lines
                .split(/[。！？；\n]/)
                .filter(Boolean)
                .slice(0, 2)
                .join("，")}…<span class="tt-poem-src">——${pm.title.replace(/[《》（）]/g, "")}</span></div>`
            : "";
          return `${title}${poemHtml}<div class="tt-body"><span>${body}</span></div>`;
        };

        /* 驿站卡与途中提示共用同一个「侧边 dock」浮层实例（桌面端右侧滑入，
           移动端底部上滑）：只换内容与样式类，绝不重建容器 DOM，
           避免每到一站解绑重建造成的闪动；同时不再遮挡地图点位 */
        const dock = document.createElement("div");
        dock.className = "shilu-tour-dock";
        (wrapRef.current ?? map.getContainer()).appendChild(dock);
        let dockMode: "card" | "toast" | null = null;
        let tipScrollTimer: number | null = null;
        const stopTipScroll = () => {
          if (tipScrollTimer !== null) {
            window.clearInterval(tipScrollTimer);
            tipScrollTimer = null;
          }
        };
        /* 正文超长时：框内自动缓慢滚动一遍，悬停暂停 */
        const startTipAutoScroll = (el: HTMLElement | null | undefined) => {
          stopTipScroll();
          const bodyEl = el?.querySelector<HTMLElement>(".tt-body");
          if (!bodyEl || bodyEl.scrollHeight <= bodyEl.clientHeight + 4) return;
          let dir = 1;
          let hover = false;
          bodyEl.addEventListener("mouseenter", () => (hover = true));
          bodyEl.addEventListener("mouseleave", () => (hover = false));
          let wait = 0;
          tipScrollTimer = window.setInterval(() => {
            if (cancelled || !bodyEl.isConnected) {
              stopTipScroll();
              return;
            }
            if (hover) return;
            if (wait > 0) {
              wait -= 1;
              return;
            }
            bodyEl.scrollTop += dir;
            const atEnd = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 1;
            const atStart = bodyEl.scrollTop <= 0;
            if (atEnd && dir > 0) {
              dir = -1;
              wait = 40; /* 底部停留 ~2s */
            } else if (atStart && dir < 0) {
              dir = 1;
              wait = 40; /* 顶部停留 ~2s */
            }
          }, 50);
        };
        /* 内容切换只更新 dock 内部（容器不重建），卡片/提示形态由样式类区分 */
        const setDock = (mode: "card" | "toast", innerHtml: string) => {
          stopTipScroll();
          dockMode = mode;
          dock.classList.toggle("toast", mode === "toast");
          dock.innerHTML =
            mode === "card"
              ? `<div class="shilu-tour-tip">${innerHtml}</div>`
              : `<span class="shilu-travel-toast">${innerHtml}</span>`;
          dock.classList.add("show");
          if (mode === "card") startTipAutoScroll(dock);
        };
        const showTip = (i: number) => setDock("card", stopHtml(i));

        /* 实时行进轨迹：浅金色跟随线，跟随小人边走边画（独立于整段重绘）。
           注意：redrawTraveled 会清掉带 _shiluPlay 的线（含本跟随线），
           必须在重绘后立即按 trailPts 重建，否则出现"有时有线有时没有" */
        const TRAIL_COLOR = "#e9c979"; /* 浅金：比诗人色更浅更亮，一眼可辨 */
        let liveTrail: L.Polyline | null = null;
        const trailPts: L.LatLngExpression[] = [pts[0]];
        const mountTrail = () => {
          if (liveTrail || trailPts.length < 2) return;
          liveTrail = L.polyline(trailPts, {
            color: TRAIL_COLOR,
            weight: 3.6,
            opacity: 0.95,
            lineCap: "round",
          }).addTo(overlay);
          (liveTrail as unknown as { _shiluPlay?: boolean })._shiluPlay = true;
        };
        const pushTrail = (pt: L.LatLngExpression) => {
          trailPts.push(pt);
          if (!liveTrail) {
            mountTrail();
          } else {
            liveTrail.setLatLngs(trailPts);
          }
        };

        /* 重绘已行进路线（前 upto 站），并立即重建跟随线，保证全程稳定显示 */
        const redrawTraveled = (upto: number) => {
          const toRemove: L.Layer[] = [];
          overlay.eachLayer((l) => {
            if ((l as unknown as { _shiluPlay?: boolean })._shiluPlay && l instanceof L.Polyline)
              toRemove.push(l);
          });
          toRemove.forEach((l) => overlay.removeLayer(l));
          liveTrail = null;
          drawRoute(Math.min(upto + 1, pts.length), true);
          mountTrail();
        };

        const MODE_LABEL: Record<TravelMode, string> = { boat: "泛舟", horse: "骑马", walk: "步行" };
        const liOf = (km: number) => Math.round(km * 2); // 1km≈2 里（约数）
        const showTravelToast = (i: number) => {
          const km = segKm[i] ?? 0;
          const mode = segModes[i] ?? "walk";
          setDock("toast", `第${i + 1}段 · ${MODE_LABEL[mode]} · 约${liOf(km)}里`);
        };
        const hideTravelToast = () => {
          /* toast 由 showTip 直接接管替换，这里只标记状态 */
          dockMode = null;
        };

        /* —— 导览引擎：逐站停靠 8s，移动时沿路线逐帧「走」过去（rAF 插值） —— */
        const DWELL = 8000; // 每站停留（可读后继续）
        const SPEED_KM_S = 90; // 移动速度（公里/秒），保证长段不至于太慢
        const MIN_MOVE = 1400; // 单段最短移动 ms（短段也有过程感）
        const MAX_MOVE = 4200; // 单段最长移动 ms（长段封顶）
        let cur = 0; // 当前停靠站
        let paused = false;
        let cancelled = false;
        let rafId: number | null = null; // 移动动画帧
        let movingTo = -1; // 正在前往的站（-1=停靠中）
        const el = traveler.getElement();

        const stopRaf = () => {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        };

        const report = () => {
          cbRef.current.onTourProgress?.(Math.max(cur, 0) + 1, pts.length);
          cbRef.current.onTourPlaying?.(!paused);
        };

        /* 停靠在第 i 站：小人停下 + 弹驿站卡 + DWELL 后自动下一站 */
        const dwellAt = (i: number) => {
          if (cancelled) return;
          stopRaf();
          movingTo = -1;
          cur = i;
          hideTravelToast();
          el?.classList.add("tp-still");
          showTip(i);
          redrawTraveled(i);
          report();
          playTimerRef.current = window.setTimeout(() => {
            if (!cancelled && !paused) goTo(i + 1);
          }, DWELL);
        };

        /* 前往第 i 站：沿路线逐帧平滑移动（镜头不动，到站才切） */
        const goTo = (i: number) => {
          if (cancelled) return;
          if (playTimerRef.current) {
            window.clearTimeout(playTimerRef.current);
            playTimerRef.current = null;
          }
          stopRaf();
          if (i >= pts.length) {
            /* 导览结束：末站多停一会后回调 */
            playTimerRef.current = window.setTimeout(() => {
              if (!cancelled) cbRef.current.onTourEnd?.();
            }, DWELL);
            return;
          }
          if (i < 0) i = 0;
          movingTo = i;
          cur = i; /* 进度指向目标站 */
          el?.classList.remove("tp-still");

          const from = traveler.getLatLng();
          const to = L.latLng(pts[i] as [number, number]);
          const mode = segModes[i - 1] ?? "walk"; // i-1 段：从 i-1 → i
          setMode(mode);
          showTravelToast(i - 1);
          report();

          const km = haversineKm([from.lat, from.lng], to);
          const dur = Math.min(MAX_MOVE, Math.max(MIN_MOVE, (km / SPEED_KM_S) * 1000));
          const t0 = performance.now();

          /* 逐帧插值移动（镜头保持不动，仅小人与轨迹前进） */
          const frame = (now: number) => {
            if (cancelled) return;
            if (paused) {
              /* 暂停：冻结在当前位置，恢复后重新进入本段 */
              rafId = null;
              return;
            }
            const t = Math.min(1, (now - t0) / dur);
            /* easeInOut 缓动，起步与停靠更自然 */
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const pos = lerpLatLng([from.lat, from.lng], to, e);
            traveler.setLatLng(pos);
            pushTrail(pos);
            if (t < 1) {
              rafId = requestAnimationFrame(frame);
            } else {
              rafId = null;
              /* 到站：切换镜头对准，再停靠 */
              map.panTo(to, { animate: true, duration: 0.9 });
              dwellAt(i);
            }
          };
          rafId = requestAnimationFrame(frame);
        };

        /* 暴露控制接口给外部控制条 */
        const cancelTour = () => {
          cancelled = true;
          stopRaf();
          hideTravelToast();
          stopTipScroll();
          dock.remove();
        };
        tourCleanupRef.current = cancelTour;
        (traveler as unknown as { _shiluCancel?: () => void })._shiluCancel = cancelTour;
        (map as unknown as { _shiluTour?: unknown })._shiluTour = {
          pause: () => {
            paused = true;
            if (playTimerRef.current) {
              window.clearTimeout(playTimerRef.current);
              playTimerRef.current = null;
            }
            stopRaf(); /* 移动中暂停：冻结小人 */
            cbRef.current.onTourPlaying?.(false);
          },
          resume: () => {
            paused = false;
            cbRef.current.onTourPlaying?.(true);
            /* 从当前状态继续：若停靠中，DWELL 后下一站；若移动中被冻结，重新走当前段 */
            if (movingTo >= 0) {
              goTo(movingTo);
            } else if (cur >= 0) {
              playTimerRef.current = window.setTimeout(() => goTo(cur + 1), DWELL);
            } else {
              goTo(0);
            }
          },
          prev: () => {
            const at = cur >= 0 ? cur : 0;
            goTo(Math.max(0, at - 1));
          },
          next: () => {
            const at = cur >= 0 ? cur : 0;
            goTo(at + 1);
          },
          restart: () => goTo(0),
          /* 跳转到指定站（进度条点击/拖动）：自动解除暂停继续播放 */
          jump: (i?: number) => {
            if (typeof i !== "number" || i < 0 || i >= pts.length) return;
            paused = false;
            cbRef.current.onTourPlaying?.(true);
            goTo(i);
          },
        };
        /* 调试/外部可达镜像：保证控制条读到的是带 _shiluTour 的这个 map 实例 */
        (window as unknown as { __shiluMap?: L.Map }).__shiluMap = map;

        showTip(0);
        map.panTo(pts[0], { animate: true, duration: 0.8 });
        redrawTraveled(0);
        cur = 0;
        report();
        /* 首站停留后启程 */
        playTimerRef.current = window.setTimeout(() => goTo(1), DWELL);
            } else {
        drawRoute();
      }

      pts.forEach((pt, i) => {
        const slug = poet.route[i];
        const n = slug ? nodeBySlug.get(slug) : undefined;
        L.circleMarker(pt, {
          radius: 4.5,
          color: poet.color,
          weight: 2,
          fillColor: "#f6f1e3",
          fillOpacity: 0.95,
        })
          .addTo(overlay)
          .bindTooltip(`${i + 1}. ${n?.name ?? ""}`, {
            direction: "top",
            className: "shilu-node-label",
          });
      });
    }

    /* 节点标记：点击弹卡片 */
    for (const n of nodes) {
      const isRouteNode = visible.some((p) => p.route.includes(n.slug));
      const dim = dimOthers && !isRouteNode;
      const opacity = dim ? 0.25 : 1;

      if (n.highlight) {
        const pulse = L.circleMarker([n.lat, n.lon], {
          radius: 18,
          color: "#c25b41",
          weight: 2,
          fill: false,
          opacity: dim ? 0.15 : 0.8,
          className: "shilu-pulse",
        }).addTo(overlay);
        pulse.on("click", () => focusNodeRef.current(n));
      }

      const marker = L.circleMarker([n.lat, n.lon], {
        radius: n.highlight ? 9 : 6,
        color: n.highlight ? "#9e3b3b" : "#4a3f2a",
        weight: n.highlight ? 3 : 1.5,
        fillColor: n.highlight ? "#c25b41" : "#d4a24e",
        fillOpacity: 0.95 * opacity,
        opacity,
      }).addTo(overlay);

      marker.bindTooltip(n.highlight ? `⛰ ${n.name}` : n.name, {
        permanent: true,
        direction: "right",
        offset: [8, 0],
        className: n.highlight ? "shilu-meiguan-label" : "shilu-node-label",
        opacity: n.highlight || !dim ? 1 : 0,
      });
      marker.on("click", () => focusNodeRef.current(n));
    }

    /* 视野适配：仅在切换选中诗人时执行一次；
       播放行迹、重绘图层时绝不强制回到初始视野 */
    const fitKey = selectedPoet ?? "__all__";
    if (bounds.length && fittedForRef.current !== fitKey && !tour) {
      fittedForRef.current = fitKey;
      map.flyToBounds(L.latLngBounds(bounds).pad(0.22), { duration: 0.9 });
    }
    return () => {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      /* 终止导览：取消 rAF、移除侧边 dock（下轮重绘会重建） */
      tourCleanupRef.current?.();
      tourCleanupRef.current = null;
    };
  }, [poets, nodes, selectedPoet, comparePoet, tour, tourStops, poems]);

  /* 环境动效粒子：纯 CSS 动画，数量克制以保证流畅 */
  const ambientParticles = useMemo(() => {
    if (!ambient) return null;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const clouds = Array.from({ length: 3 }, (_, k) => (
      <span
        key={`c${k}`}
        className="shilu-amb-cloud"
        style={{
          top: `${rand(4, 62)}%`,
          animationDuration: `${rand(70, 120)}s`,
          animationDelay: `${-rand(0, 90)}s`,
          transform: `scale(${rand(0.7, 1.5)})`,
        }}
      />
    ));
    const leaves = Array.from({ length: 7 }, (_, k) => (
      <span
        key={`l${k}`}
        className="shilu-amb-leaf"
        style={{
          left: `${rand(3, 95)}%`,
          animationDuration: `${rand(11, 22)}s`,
          animationDelay: `${-rand(0, 20)}s`,
          transform: `scale(${rand(0.6, 1.15)})`,
        }}
      />
    ));
    const glows = Array.from({ length: 3 }, (_, k) => (
      <span
        key={`g${k}`}
        className="shilu-amb-glow"
        style={{
          left: `${rand(5, 70)}%`,
          top: `${rand(8, 60)}%`,
          animationDuration: `${rand(9, 16)}s`,
          animationDelay: `${-rand(0, 12)}s`,
        }}
      />
    ));
    const fireflies =
      theme === "night"
        ? Array.from({ length: 14 }, (_, k) => (
            <span
              key={`f${k}`}
              className="shilu-amb-firefly"
              style={{
                left: `${rand(4, 96)}%`,
                top: `${rand(5, 92)}%`,
                animationDuration: `${rand(4, 9)}s`,
                animationDelay: `${-rand(0, 8)}s`,
              }}
            />
          ))
        : null;
    return (
      <>
        {clouds}
        {glows}
        {leaves}
        {fireflies}
      </>
    );
  }, [ambient, theme]);

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full shilu-theme-${theme}`}
      style={{ background: THEME_BG[theme] }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {ambient && <div className="shilu-ambient">{ambientParticles}</div>}
      {/* 古地图瓦片加载指示：给用户明确的加载反馈 */}
      {tilePending > 0 && (
        <div className="shilu-tile-loading">
          <span className="shilu-tile-spin" /> 古地图瓦片加载中…
        </div>
      )}
    </div>
  );
}
