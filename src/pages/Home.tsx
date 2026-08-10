import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import MapView, {
  BASE_LAYER_TREE,
  DYNASTY_TO_LAYER,
  MAP_THEMES,
  type BaseLayerKey,
  type MapTheme,
  type PoetView,
} from "@/components/MapView";
import PoetPanel, { toChineseNum, type PoetFull } from "@/components/PoetPanel";
import AiChat, { MusicDock } from "@/components/AiChat";
import FeedbackDialog from "@/components/FeedbackDialog";
import { NodeCard, PoemCard } from "@/components/Cards";
import {
  LogIn,
  LogOut,
  Settings,
  Landmark,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Palette,
  Sparkles,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  RotateCcw,
} from "lucide-react";
import { MAIN_SITE_URL } from "@/config";
import type { MapNode, Poem } from "@db/schema";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const kb = trpc.kb.all.useQuery(undefined, { staleTime: 1000 * 30 });

  const [dynasty, setDynasty] = useState("全部");
  const [selectedPoet, setSelectedPoet] = useState<string | null>(null);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKey>("gaode");
  const [tourOn, setTourOn] = useState(false);
  const [nodeCard, setNodeCard] = useState<MapNode | null>(null);
  const [poemCard, setPoemCard] = useState<{ poem: Poem; poetName: string } | null>(null);
  const [layerOpen, setLayerOpen] = useState(false);
  const [compareSlug, setCompareSlug] = useState<string | null>(null);
  const [timelineOn, setTimelineOn] = useState(false);
  const [yearRange, setYearRange] = useState<[number, number]>([600, 1300]);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [tileFailTip, setTileFailTip] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  /* 地图主题 + 环境动效：记忆用户上次选择 */
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("shilu-theme") : null;
    return (MAP_THEMES.some((t) => t.key === saved) ? saved : "silk") as MapTheme;
  });
  const [ambientOn, setAmbientOn] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("shilu-ambient") !== "0" : true,
  );
  useEffect(() => {
    localStorage.setItem("shilu-theme", mapTheme);
  }, [mapTheme]);
  useEffect(() => {
    localStorage.setItem("shilu-ambient", ambientOn ? "1" : "0");
  }, [ambientOn]);
  /* 导览播放状态（由 MapView 上报，供控制条显示） */
  const [tourStep, setTourStep] = useState<[number, number]>([1, 1]);
  const [tourPlaying, setTourPlaying] = useState(true);
  const mapCtlRef = useRef<import("leaflet").Map | null>(null);

  /* 读取当前带导览控制接口的 map（优先 window 镜像，兜底 ref） */
  const getTourCtl = () =>
    ((window as unknown as { __shiluMap?: import("leaflet").Map }).__shiluMap ??
      mapCtlRef.current) as unknown as {
      _shiluTour?: Record<string, ((i?: number) => void) | undefined>;
    } | null;

  /* 两坐标球面距离（km），供导览进度条按实际里程等比缩放 */
  const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  /* 解析生卒年，如 "768—824" / "约1037—1101" */
  const parseYears = (years: string | null): [number, number] | null => {
    if (!years) return null;
    const m = years.match(/(\d{3,4})\D+(\d{3,4})/);
    return m ? [parseInt(m[1]), parseInt(m[2])] : null;
  };

  const poetsFull: PoetFull[] = useMemo(
    () =>
      (kb.data?.poets ?? []).map((p) => ({
        ...p,
        route: p.route as string[],
        detail: (p as { detail?: string | null }).detail ?? null,
        chronicle: (p as { chronicle?: string | null }).chronicle ?? null,
        aiPortrait: (p as { aiPortrait?: string | null }).aiPortrait ?? null,
      })),
    [kb.data],
  );

  /**
   * 地图上的诗人集合：朝代筛选与时间轴只收窄「背景诗人」，
   * 已选中的诗人和对比诗人始终保留在地图上（修复切换朝代后路线消失的问题）
   */
  const poetsView: PoetView[] = useMemo(
    () =>
      poetsFull
        .filter((p) => {
          if (p.slug === selectedPoet || p.slug === compareSlug) return true;
          if (dynasty !== "全部" && p.dynasty !== dynasty) return false;
          if (timelineOn) {
            const y = parseYears(p.years);
            if (y && !(y[0] <= yearRange[1] && y[1] >= yearRange[0])) return false;
          }
          return true;
        })
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          dynasty: p.dynasty,
          color: p.color,
          route: p.route,
          aiPortrait: p.aiPortrait,
        })),
    [poetsFull, dynasty, timelineOn, yearRange, selectedPoet, compareSlug],
  );

  const poetNames = useMemo(
    () => new Map(poetsFull.map((p) => [p.id, p.name])),
    [poetsFull],
  );

  const tourQuery = trpc.kb.tour.useQuery(
    { poetSlug: selectedPoet ?? "" },
    { enabled: !!selectedPoet, staleTime: 1000 * 60 },
  );
  const tourStopsMap = useMemo(
    () => new Map((tourQuery.data ?? []).map((t) => [t.nodeSlug, t.text])),
    [tourQuery.data],
  );
  /* 仅当知识库确有该诗人的导览解说时才开放导览入口（无 tourStops 的诗人隐藏按钮，避免空跑） */
  const tourAvailable = !!selectedPoet && (tourQuery.data?.length ?? 0) > 0;
  useEffect(() => {
    if (tourOn && !tourAvailable && !tourQuery.isLoading) setTourOn(false);
  }, [tourOn, tourAvailable, tourQuery.isLoading]);
  /* 诗作列表：memo 化避免每次 render 新引用导致地图导览 effect 重启 */
  const poemsList = useMemo(() => kb.data?.poems ?? [], [kb.data?.poems]);

  const selectedPoetObj = poetsFull.find((p) => p.slug === selectedPoet);
  const selectionText = selectedPoetObj ? `诗人：${selectedPoetObj.name}` : null;

  /* 导览进度条数据：各站按段实际里程等比定位（0~1） */
  const tourProgressStops = useMemo(() => {
    if (!selectedPoetObj) return [] as { name: string; frac: number; km: number }[];
    const nodeBySlug = new Map((kb.data?.nodes ?? []).map((n) => [n.slug, n]));
    const stops = selectedPoetObj.route
      .map((s) => nodeBySlug.get(s))
      .filter((n): n is MapNode => !!n);
    let acc = 0;
    const cum: number[] = [0];
    for (let i = 1; i < stops.length; i++) {
      acc += haversineKm(stops[i - 1], stops[i]);
      cum.push(acc);
    }
    const total = acc || 1;
    return stops.map((n, i) => ({ name: n.name, frac: cum[i] / total, km: cum[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoetObj, kb.data?.nodes]);

  /* 选中诗人 → 古地图按朝代自动切换 */
  useEffect(() => {
    if (!selectedPoetObj) return;
    const isAncient = ["tang", "nsong", "ssong"].includes(baseLayer);
    if (isAncient) {
      const target = DYNASTY_TO_LAYER[selectedPoetObj.dynasty];
      if (target && target !== baseLayer) setBaseLayer(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoetObj]);

  const layerLabel = (key: BaseLayerKey) => {
    for (const g of BASE_LAYER_TREE) {
      const it = g.items.find((i) => i.key === key);
      if (it) return it.label;
    }
    return key;
  };

  const glass =
    "rounded-2xl border border-white/40 bg-white/25 shadow-xl backdrop-blur-xl";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#efe6cf] text-[#2e2618]">
      {/* 顶栏 */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#c9ba8f] bg-[#f3ecd9] px-4 shadow-sm">
        <a
          href={MAIN_SITE_URL}
          className="group flex items-center gap-2 text-[#4a3f2a] transition-colors hover:text-[#9e3b3b]"
          title="返回诗路行者主站"
        >
          <Landmark className="h-5 w-5" />
          <h1 className="text-base font-semibold tracking-[0.3em]">詩路行者</h1>
        </a>
        <span className="hidden text-xs text-[#8a7a54] sm:inline">
          大庾岭梅关古道 · 唐宋{toChineseNum(poetsFull.length || 26)}位诗人数字地图
        </span>
        <a
          href={MAIN_SITE_URL}
          className="hidden rounded-full border border-[#c9ba8f] px-3 py-1 text-xs text-[#6b5d3f] transition-colors hover:bg-[#e7dcc0] md:inline"
        >
          ← 返回主站
        </a>

        <div className="ml-auto flex items-center gap-3">
          <FeedbackDialog
            poets={poetsView}
            nodes={kb.data?.nodes ?? []}
            currentPoet={selectedPoet}
          />
          {isAuthenticated ? (
            <>
              {(user?.role === "admin" || user?.role === "editor") && (
                <button
                  className="flex items-center gap-1 text-sm text-[#6b5d3f] hover:text-[#2e2618]"
                  onClick={() => navigate("/map-admin")}
                >
                  <Settings className="h-4 w-4" /> 后台
                </button>
              )}
              <span className="text-sm text-[#4a3f2a]">{user?.name}</span>
              <button
                className="flex items-center gap-1 text-sm text-[#8a7a54] hover:text-[#2e2618]"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" /> 退出
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-1 text-sm text-[#6b5d3f] hover:text-[#2e2618]"
              onClick={() => navigate("/login")}
            >
              <LogIn className="h-4 w-4" /> 登录 / 注册
            </button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* 左侧诗人栏（可折叠） */}
        <aside
          className={`shrink-0 overflow-hidden border-r border-[#c9ba8f] transition-[width] duration-300 ${
            panelOpen ? "w-[340px] lg:w-[380px]" : "w-0 border-r-0"
          }`}
        >
          <div className="h-full w-[340px] lg:w-[380px]">
            <PoetPanel
              poets={poetsFull.filter((p) => dynasty === "全部" || p.dynasty === dynasty)}
              allPoets={poetsFull}
              nodes={kb.data?.nodes ?? []}
              poems={kb.data?.poems ?? []}
              media={kb.data?.media ?? []}
              dynasty={dynasty}
              onDynasty={setDynasty}
              selected={selectedPoet}
              onSelect={(slug) => {
                setSelectedPoet(slug);
                setTourOn(false);
                if (slug) setPanelOpen(true);
              }}
              tourOn={tourOn}
              onToggleTour={tourAvailable ? () => setTourOn((v) => !v) : undefined}
              onPoemCard={(poem, poetName) => setPoemCard({ poem, poetName })}
              compareSlug={compareSlug}
              onCompare={(slug) => setCompareSlug((cur) => (cur === slug ? null : slug))}
            />
          </div>
        </aside>

        {/* 折叠/展开按钮：圆形磨砂按钮，贴合侧栏边缘 */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          title={panelOpen ? "收起诗人栏，完整看地图" : "展开诗人栏"}
          aria-label={panelOpen ? "收起诗人栏" : "展开诗人栏"}
          className="absolute top-1/2 z-[1001] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-[#f6f1e3]/85 text-[#4a3f2a] shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-[#f6f1e3]"
          style={{ left: panelOpen ? "min(340px, 30vw)" : "26px", transform: "translate(-50%, -50%)" }}
        >
          {panelOpen ? (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          )}
        </button>

        {/* 右侧地图 */}
        <main className="relative min-w-0 flex-1">
          <MapView
            poets={poetsView}
            nodes={kb.data?.nodes ?? []}
            selectedPoet={selectedPoet}
            comparePoet={compareSlug}
            baseLayer={baseLayer}
            tour={tourOn}
            tourStops={tourStopsMap}
            poems={poemsList}
            onTourEnd={() => setTourOn(false)}
            onTourProgress={(s, t) => setTourStep([s, t])}
            onTourPlaying={setTourPlaying}
            onTileFail={() => setTileFailTip(true)}
            showBoundaries={showBoundaries}
            onSelectPoet={setSelectedPoet}
            onSelectNode={() => {}}
            onNodeCard={setNodeCard}
            theme={mapTheme}
            ambient={ambientOn}
            onMapReady={(m) => {
              mapCtlRef.current = m;
            }}
          />

          {/* 导览控制条：暂停/上站/下站/重播 + 进度 */}
          {tourOn && (
            <div className="absolute bottom-5 left-1/2 z-[999] w-[min(480px,86vw)] -translate-x-1/2">
              {/* 视频式进度条：各站按实际里程等比定位，点击/拖动跳转 */}
              {tourProgressStops.length > 1 && (
                <div className={`mb-2 px-3 pb-2 pt-2.5 ${glass}`}>
                  <div
                    className="group relative h-4 cursor-pointer"
                    role="slider"
                    aria-label="导览进度"
                    aria-valuemin={1}
                    aria-valuemax={tourProgressStops.length}
                    aria-valuenow={tourStep[0]}
                    onPointerDown={(e) => {
                      const bar = e.currentTarget;
                      const seek = (ev: { clientX: number }) => {
                        const r = bar.getBoundingClientRect();
                        const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
                        /* 吸附到最近的站点刻度 */
                        let best = 0;
                        tourProgressStops.forEach((s, i) => {
                          if (Math.abs(s.frac - f) < Math.abs(tourProgressStops[best].frac - f))
                            best = i;
                        });
                        getTourCtl()?._shiluTour?.jump?.(best);
                      };
                      seek(e);
                      const move = (ev: PointerEvent) => seek(ev);
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  >
                    {/* 轨道 */}
                    <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#a08d5f]/25" />
                    {/* 已行进部分（浅金，与地图跟随线同色） */}
                    <div
                      className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#d9b965] transition-[width] duration-500"
                      style={{
                        width: `${(tourProgressStops[Math.min(Math.max(tourStep[0] - 1, 0), tourProgressStops.length - 1)]?.frac ?? 0) * 100}%`,
                      }}
                    />
                    {/* 站点刻度 */}
                    {tourProgressStops.map((s, i) => {
                      const done = i < tourStep[0];
                      return (
                        <button
                          key={i}
                          title={`第${i + 1}站 · ${s.name}（约${Math.round(s.km * 2)}里）`}
                          aria-label={`跳转到第${i + 1}站 ${s.name}`}
                          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition hover:scale-150 ${
                            i === tourStep[0] - 1
                              ? "border-[#9e3b3b] bg-[#9e3b3b] ring-2 ring-[#9e3b3b]/30"
                              : done
                                ? "border-[#d9b965] bg-[#e9c979]"
                                : "border-[#a08d5f]/60 bg-[#f6f1e3]"
                          }`}
                          style={{ left: `${s.frac * 100}%` }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => getTourCtl()?._shiluTour?.jump?.(i)}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-[#8a7a54]">
                    <span>{tourProgressStops[0]?.name}</span>
                    <span>
                      全程约 {Math.round((tourProgressStops[tourProgressStops.length - 1]?.km ?? 0) * 2)} 里
                    </span>
                    <span>{tourProgressStops[tourProgressStops.length - 1]?.name}</span>
                  </div>
                </div>
              )}
              <div
                className={`flex items-center justify-center gap-1.5 px-3 py-2 ${glass}`}
                role="group"
                aria-label="导览控制"
              >
                {(
                  [
                    { icon: SkipBack, label: "上一站", act: "prev" },
                    { icon: RotateCcw, label: "重播", act: "restart" },
                  ] as const
                ).map(({ icon: Icon, label, act }) => (
                  <button
                    key={act}
                    title={label}
                    aria-label={label}
                    onClick={() =>
                      getTourCtl()?._shiluTour?.[act]?.()
                    }
                    className="shilu-pressable flex h-8 w-8 items-center justify-center rounded-full text-[#4a3f2a] transition hover:bg-[#a08d5f]/20"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  title={tourPlaying ? "暂停" : "继续"}
                  aria-label={tourPlaying ? "暂停" : "继续"}
                  onClick={() =>
                    getTourCtl()?._shiluTour?.[tourPlaying ? "pause" : "resume"]?.()
                  }
                  className="shilu-pressable flex h-9 w-9 items-center justify-center rounded-full bg-[#9e3b3b] text-[#f6f1e3] shadow-md transition hover:bg-[#b0484a]"
                >
                  {tourPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  title="下一站"
                  aria-label="下一站"
                  onClick={() =>
                    getTourCtl()?._shiluTour?.next?.()
                  }
                  className="shilu-pressable flex h-8 w-8 items-center justify-center rounded-full text-[#4a3f2a] transition hover:bg-[#a08d5f]/20"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <span className="ml-1 min-w-[52px] text-center text-xs font-medium text-[#4a3f2a] tabular-nums">
                  {tourStep[0]} / {tourStep[1]} 站
                </span>
              </div>
            </div>
          )}

          {/* 地图工具框（毛玻璃，可收纳） */}
          <div className={`absolute right-4 top-4 z-[999] w-[230px] p-3.5 ${glass}`}>
            <button
              className="flex w-full items-center justify-between text-xs font-medium text-[#4a3f2a]"
              onClick={() => setLayerOpen(!layerOpen)}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> 底图：{layerLabel(baseLayer)}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${layerOpen ? "rotate-180" : ""}`}
              />
            </button>

            {layerOpen && (
              <div className="mt-2.5 space-y-2.5">
                {BASE_LAYER_TREE.map((g) => (
                  <div key={g.group}>
                    <p className="mb-1 text-[10px] text-[#a08d5f]">{g.group}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {g.items.map((b) => (
                        <button
                          key={b.key}
                          onClick={() => setBaseLayer(b.key)}
                          className={`rounded-full px-2 py-1 text-xs transition ${
                            baseLayer === b.key
                              ? "bg-[#4a3f2a] text-[#f6f1e3]"
                              : "bg-[#efe6cf]/80 text-[#6b5d3f] hover:bg-[#e2d5b4]"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 主题：整套滤镜 + 配色 + 环境动效 */}
                <div className="border-t border-[#e0d3ae]/70 pt-2">
                  <p className="mb-1 flex items-center gap-1 text-[10px] text-[#a08d5f]">
                    <Palette className="h-3 w-3" /> 主题
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {MAP_THEMES.map((t) => (
                      <button
                        key={t.key}
                        title={t.hint}
                        onClick={() => setMapTheme(t.key)}
                        className={`rounded-full px-2 py-1 text-xs transition ${
                          mapTheme === t.key
                            ? "bg-[#4a3f2a] text-[#f6f1e3]"
                            : "bg-[#efe6cf]/80 text-[#6b5d3f] hover:bg-[#e2d5b4]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-1.5 flex items-center gap-2 text-[11px] text-[#6b5d3f]">
                    <input
                      type="checkbox"
                      checked={ambientOn}
                      onChange={(e) => setAmbientOn(e.target.checked)}
                      className="accent-[#4a3f2a]"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> 环境动效（云雾/落叶/微光）
                    </span>
                  </label>
                </div>

                {(baseLayer === "satellite" || baseLayer === "gaode") && (
                  <label className="flex items-center gap-2 text-[11px] text-[#6b5d3f]">
                    <input
                      type="checkbox"
                      checked={showBoundaries}
                      onChange={(e) => setShowBoundaries(e.target.checked)}
                      className="accent-[#4a3f2a]"
                    />
                    {baseLayer === "satellite" ? "省界行政区划叠加" : "市/地级行政区划悬停"}
                  </label>
                )}

                {compareSlug && (
                  <div className="flex items-center justify-between rounded-full border border-[#a08d5f] bg-[#efe6cf]/80 px-2.5 py-1.5 text-xs text-[#4a3f2a]">
                    <span>
                      对比：{poetsFull.find((p) => p.slug === compareSlug)?.name ?? compareSlug}
                    </span>
                    <button
                      className="text-[#9e3b3b] hover:underline"
                      onClick={() => setCompareSlug(null)}
                    >
                      取消
                    </button>
                  </div>
                )}

                {/* 时间轴模式 */}
                <div className="border-t border-[#e0d3ae]/70 pt-2">
                  <button
                    className="flex w-full items-center justify-between text-xs font-medium text-[#4a3f2a]"
                    onClick={() => setTimelineOn(!timelineOn)}
                  >
                    时间轴筛选
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        timelineOn ? "bg-[#4a3f2a] text-[#f6f1e3]" : "bg-[#efe6cf]/80 text-[#8a7a54]"
                      }`}
                    >
                      {timelineOn ? "开" : "关"}
                    </span>
                  </button>
                  {timelineOn && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] text-[#6b5d3f]">
                        <span className="w-6">起</span>
                        <input
                          type="range"
                          min={600}
                          max={1300}
                          step={10}
                          value={yearRange[0]}
                          onChange={(e) =>
                            setYearRange([Math.min(+e.target.value, yearRange[1]), yearRange[1]])
                          }
                          className="h-1 flex-1 accent-[#4a3f2a]"
                        />
                        <span className="w-8 text-right">{yearRange[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#6b5d3f]">
                        <span className="w-6">止</span>
                        <input
                          type="range"
                          min={600}
                          max={1300}
                          step={10}
                          value={yearRange[1]}
                          onChange={(e) =>
                            setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0])])
                          }
                          className="h-1 flex-1 accent-[#4a3f2a]"
                        />
                        <span className="w-8 text-right">{yearRange[1]}</span>
                      </div>
                      <p className="text-[10px] leading-4 text-[#a08d5f]">
                        仅显示生卒年与 {yearRange[0]}—{yearRange[1]} 年相交的诗人。
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-[10px] leading-4 text-[#a08d5f]">
                  古地图瓦片已预载本站（大庾岭区域细化），更高层级联网辅助；选古地图后点诗人自动切至其朝代。
                </p>
              </div>
            )}
          </div>

          {/* 古地图朝代行政区划图例 */}
          {["tang", "nsong", "ssong"].includes(baseLayer) && (
            <div className={`absolute bottom-6 left-4 z-[999] max-w-[240px] p-3 ${glass}`}>
              <p className="mb-1.5 text-xs font-medium text-[#4a3f2a]">
                {baseLayer === "tang" ? "唐代道级区划（局部）" : "宋代路级区划（局部）"}
              </p>
              <ul className="space-y-0.5 text-[11px] leading-5 text-[#6b5d3f]">
                {(baseLayer === "tang"
                  ? ["岭南道（大庾岭以南）", "江南西道（岭北）", "江南东道", "山南东道", "淮南道"]
                  : ["广南东路（大庾岭以南）", "广南西路", "江南西路（岭北）", "荆湖南路", "江南东路"]
                ).map((d) => (
                  <li key={d} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-[2px] border border-[#a08d5f] bg-[#e7dcc0]" />
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] leading-4 text-[#a08d5f]">
                区划边界以古地图底图为准 · 中研院 CCTS
              </p>
            </div>
          )}

          {tileFailTip && (
            <div className="absolute left-1/2 top-4 z-[1002] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/50 bg-[#9e3b3b]/90 px-5 py-2 text-xs text-[#f6f1e3] shadow-xl backdrop-blur-md">
              古地图在线瓦片加载困难，建议切换到底图
              <button
                className="rounded-full bg-[#f6f1e3] px-3 py-1 font-medium text-[#9e3b3b]"
                onClick={() => { setBaseLayer("gaode"); setTileFailTip(false); }}
              >
                切到标准图
              </button>
              <button className="opacity-70 hover:opacity-100" onClick={() => setTileFailTip(false)}>✕</button>
            </div>
          )}
          {kb.isLoading && (
            <div className="absolute inset-0 z-[998] flex flex-col items-center justify-center gap-4 bg-[#efe6cf]/85 backdrop-blur-sm">
              <div className="flex items-end gap-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-[#c9ba8f]"
                    style={{ animation: `shilu-dot 1.2s ease-in-out ${i * 0.15}s infinite` }}
                  />
                ))}
              </div>
              <p className="text-sm tracking-[3px] text-[#8a7a54]">铺 展 诗 路 …</p>
              <style>{`@keyframes shilu-dot { 0%,60%,100% { transform: translateY(0); opacity:.5;} 30% { transform: translateY(-8px); opacity:1;} }`}</style>
            </div>
          )}
          {kb.isError && (
            <div className="absolute inset-0 z-[998] flex flex-col items-center justify-center gap-3 bg-[#efe6cf]/90 text-sm text-[#8a7a54]">
              <p>知识库连接失败，可能是网络抖动或服务冷启动</p>
              <button
                onClick={() => kb.refetch()}
                className="rounded-full border border-[#c9ba8f] bg-[#f6f1e3] px-5 py-2 text-[#4a3f2a] shadow-sm transition hover:bg-white"
              >
                重新加载
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 卡片弹窗 */}
      <NodeCard
        node={nodeCard}
        poems={kb.data?.poems ?? []}
        poetNames={poetNames}
        poets={poetsFull}
        onSelectPoet={(slug) => {
          setSelectedPoet(slug);
          setPanelOpen(true);
        }}
        onClose={() => setNodeCard(null)}
      />
      <PoemCard
        poem={poemCard?.poem ?? null}
        poetName={poemCard?.poetName ?? ""}
        nodeName={
          poemCard?.poem.nodeSlug
            ? kb.data?.nodes.find((n) => n.slug === poemCard.poem.nodeSlug)?.name
            : undefined
        }
        onClose={() => setPoemCard(null)}
      />

      <AiChat selection={selectionText} />
      <MusicDock />
    </div>
  );
}