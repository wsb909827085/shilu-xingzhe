import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  MapPin,
  BookOpen,
  Clock,
  Quote,
  GitCompareArrows,
  Image as ImageIcon,
  Clapperboard,
  Footprints,
  Search,
} from "lucide-react";
import type { PoetView } from "./MapView";
import type { MapNode, Poem, Media } from "@db/schema";

export const DYNASTY_FILTERS = ["全部", "唐", "北宋", "南宋"] as const;

/** 诗人头像：加载失败时回退为姓名首字圆形徽章 */
export function Portrait({
  src,
  name,
  color,
  className,
  style,
}: {
  src: string | null;
  name: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span
        className={`flex items-center justify-center rounded-full bg-[#efe6cf] font-serif text-[#6b5d3f] ${className ?? ""}`}
        style={{ border: `2px solid ${color}`, ...style }}
      >
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`rounded-full object-cover ${className ?? ""}`}
      style={{ border: `2px solid ${color}`, ...style }}
    />
  );
}

export type PoetFull = PoetView & {
  years: string | null;
  era: string | null;
  summary: string | null;
  detail: string | null;
  chronicle: string | null;
  aiPortrait: string | null;
  source: string | null;
  startYear?: number | null;
};

/** 朝代展示顺序（分组排序用；未知朝代排最后） */
const DYNASTY_ORDER = ["唐", "北宋", "南宋"];
const dynastyRank = (d: string) => {
  const i = DYNASTY_ORDER.indexOf(d);
  return i === -1 ? DYNASTY_ORDER.length : i;
};

/** 分组内按 startYear 升序，NULL/未知年份排最后 */
export function sortPoetsByYear<T extends { dynasty: string; startYear?: number | null }>(
  list: T[],
): T[] {
  return [...list].sort((a, b) => {
    const dr = dynastyRank(a.dynasty) - dynastyRank(b.dynasty);
    if (dr !== 0) return dr;
    const ya = a.startYear ?? Number.MAX_SAFE_INTEGER;
    const yb = b.startYear ?? Number.MAX_SAFE_INTEGER;
    return ya - yb;
  });
}

/** 数字转中文（用于「二十六位诗人」之类的动态文案，支持 1-99） */
export function toChineseNum(n: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n < 10) return digits[n] ?? String(n);
  if (n === 10) return "十";
  if (n < 20) return `十${digits[n % 10]}`;
  if (n < 100) {
    const tail = n % 10;
    return `${digits[Math.floor(n / 10)]}十${tail ? digits[tail] : ""}`;
  }
  return String(n);
}

export type ChronicleItem = { year: number; event: string };

type Props = {
  /** 当前朝代筛选后的诗人（列表用） */
  poets: PoetFull[];
  /** 全部诗人（详情查用，避免切朝代后选中的诗人详情消失） */
  allPoets: PoetFull[];
  nodes: MapNode[];
  poems: Poem[];
  media: Media[];
  dynasty: string;
  onDynasty: (d: string) => void;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  onPoemCard: (poem: Poem, poetName: string) => void;
  compareSlug?: string | null;
  onCompare?: (slug: string) => void;
  /** 路线导览开关（小人在地图上逐站移动解说） */
  tourOn?: boolean;
  onToggleTour?: () => void;
};

export default function PoetPanel({
  poets,
  allPoets,

  poems,
  media,
  dynasty,
  onDynasty,
  selected,
  onSelect,
  onPoemCard,
  compareSlug,
  onCompare,
  tourOn,
  onToggleTour,
}: Props) {
  const poet = allPoets.find((p) => p.slug === selected) ?? null;
  /* 对比诗人选择器展开态 */
  const [compareOpen, setCompareOpen] = useState(false);
  /* 列表搜索关键词（姓名/生卒年/贬谪时期模糊匹配） */
  const [search, setSearch] = useState("");
  /* 列表：先模糊过滤，再按朝代分组、组内 startYear 升序（NULL 排最后） */
  const visiblePoets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? poets.filter((p) =>
          [p.name, p.years ?? "", p.era ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : poets;
    return sortPoetsByYear(filtered);
  }, [poets, search]);
  const poetPoems = useMemo(
    () => (poet ? poems.filter((pm) => pm.poetId === poet.id) : []),
    [poems, poet],
  );
  const poetMedia = useMemo(
    () => (poet ? media.filter((m) => m.poetId === poet.id) : []),
    [media, poet],
  );

  const chronicle: ChronicleItem[] = useMemo(() => {
    if (!poet?.chronicle) return [];
    try {
      return JSON.parse(poet.chronicle);
    } catch {
      return [];
    }
  }, [poet]);

  return (
    <div className="flex h-full flex-col bg-[#f3ecd9]">
      {/* 朝代筛选 */}
      <div className="flex gap-1 border-b border-[#d8cba6] px-3 py-2.5">
        {DYNASTY_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => onDynasty(d)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              dynasty === d
                ? "bg-[#4a3f2a] text-[#f6f1e3]"
                : "text-[#6b5d3f] hover:bg-[#e7dcc0]"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!poet ? (
          <div className="p-3">
            <p className="mb-3 px-1 text-xs leading-relaxed text-[#8a7a54]">
              唐宋{toChineseNum(allPoets.length)}位诗人翻越大庾岭梅关古道的行迹。点击诗人查看其过岭经历与诗作。
            </p>
            {/* 搜索框：按姓名 / 生卒年 / 贬谪时期模糊过滤 */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a08d5f]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索诗人、生卒年或贬谪时期…"
                aria-label="搜索诗人"
                className="w-full rounded-full border border-[#d8cba6] bg-[#faf5e8] py-1.5 pl-8 pr-8 text-sm text-[#2e2618] placeholder:text-[#a08d5f] focus:border-[#4a3f2a] focus:outline-none"
              />
              {search && (
                <button
                  aria-label="清空搜索"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8a7a54] hover:text-[#4a3f2a]"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="space-y-2">
              {visiblePoets.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => onSelect(p.slug)}
                  className="shilu-pressable group w-full rounded-xl border border-[#d8cba6] bg-[#faf5e8] p-3 text-left hover:border-[#4a3f2a] hover:shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <Portrait
                      src={p.aiPortrait}
                      name={p.name}
                      color={p.color}
                      className="h-10 w-10 shrink-0"
                    />
                    <span className="font-medium text-[#2e2618]">{p.name}</span>
                    <Badge variant="outline" className="rounded-full border-[#c9ba8f] text-xs text-[#6b5d3f]">
                      {p.dynasty}
                    </Badge>
                    <span className="ml-auto text-xs text-[#8a7a54]">{p.years}</span>
                  </div>
                  {p.era && <p className="mt-1.5 text-xs text-[#8a7a54]">{p.era}</p>}
                </button>
              ))}
              {visiblePoets.length === 0 && (
                <p className="p-4 text-center text-sm text-[#8a7a54]">
                  {search.trim() ? "没有匹配的诗人，换个关键词试试" : "该朝代暂无诗人数据"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-[#6b5d3f]"
              onClick={() => onSelect(null)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> 返回列表
            </Button>

            {/* 诗人头部 */}
            <div className="flex items-start gap-3">
              <Portrait
                src={poet.aiPortrait}
                name={poet.name}
                color={poet.color}
                className="h-16 w-16 shrink-0 text-xl shadow-md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full" style={{ background: poet.color }} />
                  <h2 className="text-xl font-semibold text-[#2e2618]">{poet.name}</h2>
                  <Badge variant="outline" className="rounded-full border-[#c9ba8f] text-[#6b5d3f]">
                    {poet.dynasty}
                  </Badge>
                </div>
                {poet.years && <p className="mt-1 text-sm text-[#8a7a54]">{poet.years}</p>}
                {poet.era && <p className="mt-1 text-sm font-medium text-[#6b5d3f]">{poet.era}</p>}
              </div>
            </div>

            {onToggleTour && (
              <Button
                size="sm"
                className={`mt-3 w-full rounded-full text-xs ${
                  tourOn
                    ? "bg-[#9e3b3b] text-[#f6f1e3] hover:bg-[#8a3030]"
                    : "bg-[#4a3f2a] text-[#f6f1e3] hover:bg-[#3a3020]"
                }`}
                onClick={onToggleTour}
              >
                <Footprints className="mr-1 h-3.5 w-3.5" />
                {tourOn ? "停止路线导览" : "开始路线导览（小人逐站讲解）"}
              </Button>
            )}

            {onCompare && (
              <div className="mt-3">
                {compareSlug ? (
                  /* 对比进行中：显示对比对象并可取消 */
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full border border-[#9e3b3b]/60 bg-[#9e3b3b]/8 px-3 py-1.5 text-xs text-[#9e3b3b]">
                      <GitCompareArrows className="h-3.5 w-3.5" />
                      正与 {allPoets.find((p) => p.slug === compareSlug)?.name ?? compareSlug} 对比
                    </span>
                    <button
                      className="text-xs text-[#8a7a54] underline hover:text-[#4a3f2a]"
                      onClick={() => onCompare(compareSlug)}
                    >
                      取消对比
                    </button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#a08d5f] text-xs text-[#6b5d3f]"
                      onClick={() => setCompareOpen((v) => !v)}
                    >
                      <GitCompareArrows className="mr-1 h-3.5 w-3.5" />
                      与其他诗人对比行迹
                    </Button>
                    {/* 选择要对比的另一位诗人（修复旧版直接拿自己对比、看似没反应的问题） */}
                    {compareOpen && (
                      <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl border border-[#e0d3ae] bg-[#faf5e8]/80 p-2.5">
                        {allPoets
                          .filter((p) => p.slug !== poet.slug)
                          .map((p) => (
                            <button
                              key={p.slug}
                              className="flex items-center gap-1.5 rounded-full border border-[#d8c9a3] bg-[#f6f1e3] px-2.5 py-1 text-xs text-[#4a3f2a] transition hover:border-[#a08d5f] hover:bg-[#efe6cf]"
                              onClick={() => {
                                onCompare(p.slug);
                                setCompareOpen(false);
                              }}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: p.color }}
                              />
                              {p.name}
                              <span className="text-[10px] text-[#a08d5f]">{p.dynasty}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {poet.summary && (
              <p className="mt-3 text-sm leading-7 text-[#3d3421]">{poet.summary}</p>
            )}
            {poet.source && (
              <p className="mt-2 text-xs text-[#a08d5f]">
                来源：{poet.source}
                {poet.source.includes("全唐诗") && (
                  <a
                    href="https://github.com/chinese-poetry/chinese-poetry"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 underline hover:text-[#4a3f2a]"
                  >
                    （chinese-poetry）
                  </a>
                )}
              </p>
            )}

            <Separator className="my-4 bg-[#d8cba6]" />

            {/* 诗人与大庾岭（详述） */}
            {poet.detail && (
              <>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#4a3f2a]">
                  <MapPin className="h-4 w-4" /> 诗人与大庾岭
                </h3>
                <p className="text-sm leading-7 text-[#3d3421]">{poet.detail}</p>
                <Separator className="my-4 bg-[#d8cba6]" />
              </>
            )}

            {/* 生平年表 */}
            {chronicle.length > 0 && (
              <>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#4a3f2a]">
                  <Clock className="h-4 w-4" /> 生平年表
                </h3>
                <ol className="relative ml-2 space-y-2.5 border-l border-[#c9ba8f] pl-4">
                  {chronicle.map((c, i) => (
                    <li key={i} className="text-sm text-[#3d3421]">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#f3ecd9] bg-[#d4a24e]" />
                      <span className="font-medium text-[#6b5d3f]">{c.year} 年</span>
                      <span className="ml-2">{c.event}</span>
                    </li>
                  ))}
                </ol>
                <Separator className="my-4 bg-[#d8cba6]" />
              </>
            )}

            {/* 过岭诗作（点击弹卡片） */}
            {poetPoems.length > 0 && (
              <>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#4a3f2a]">
                  <BookOpen className="h-4 w-4" /> 过岭诗作（点击查看详情）
                </h3>
                <div className="space-y-2">
                  {poetPoems.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => onPoemCard(pm, poet.name)}
                      className="shilu-pressable w-full rounded-xl border border-[#d8cba6] bg-[#faf5e8] p-3 text-left hover:border-[#4a3f2a] hover:shadow-md"
                    >
                      <p className="text-sm font-medium text-[#2e2618]">
                        {pm.title}
                        {pm.year && (
                          <span className="ml-2 text-xs font-normal text-[#8a7a54]">{pm.year} 年</span>
                        )}
                      </p>
                      <p className="mt-1.5 flex gap-1.5 text-xs leading-5 text-[#6b5d3f]">
                        <Quote className="mt-0.5 h-3 w-3 shrink-0 text-[#c9ba8f]" />
                        <span className="line-clamp-2">{pm.lines}</span>
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 图片与视频素材 */}
            {poetMedia.length > 0 && (
              <>
                <Separator className="my-4 bg-[#d8cba6]" />
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#4a3f2a]">
                  <Clapperboard className="h-4 w-4" /> 图片与影像素材
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {poetMedia.map((m) =>
                    m.type === "image" ? (
                      <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="group">
                        <img
                          src={m.url}
                          alt={m.title}
                          loading="lazy"
                          className="h-24 w-full rounded-lg border border-[#d8cba6] object-cover transition group-hover:shadow-md"
                        />
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#6b5d3f]">
                          <ImageIcon className="h-3 w-3" /> {m.title}
                        </p>
                      </a>
                    ) : (
                      <div key={m.id} className="col-span-2">
                        <video
                          src={m.url}
                          controls
                          preload="metadata"
                          className="w-full rounded-lg border border-[#d8cba6]"
                        />
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#6b5d3f]">
                          <Clapperboard className="h-3 w-3" /> {m.title}
                          {m.note && <span className="text-[#a08d5f]">· {m.note}</span>}
                        </p>
                      </div>
                    ),
                  )}
                </div>
                <a
                  href="/#videos"
                  className="mt-2 inline-block text-xs text-[#8a7a54] underline hover:text-[#4a3f2a]"
                >
                  前往主站 AI 视频库 →
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
