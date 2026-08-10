/* eslint-disable react-refresh/only-export-components -- 组件与 NODE_IMAGES/poemLineList 等工具同文件导出，属既有设计 */
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Quote, BookOpen, X, ExternalLink } from "lucide-react";
import type { MapNode, Poem } from "@db/schema";

/* 关键节点的 AI 生成配图（public/locations/{slug}.jpg） */
export const NODE_IMAGES: Record<string, string> = {
  梅关: "locations/梅关.jpg",
  韶州: "locations/韶州.jpg",
  潮州: "locations/潮州.jpg",
  惠州: "locations/惠州.jpg",
  儋州: "locations/儋州.jpg",
  柳州: "locations/柳州.jpg",
  连州: "locations/连州.jpg",
  蓝关: "locations/蓝关.jpg",
};

/* ---------- 自绘居中弹层（替代 Radix Dialog，修复白屏） ---------- */

function Modal({
  open,
  onClose,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      style={{ background: "rgba(30,24,12,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[86vh] overflow-y-auto rounded-3xl border border-white/60 bg-[#f6f1e3]/90 shadow-2xl backdrop-blur-xl`}
        style={{ animation: "shilu-modal-in 0.3s cubic-bezier(0.22,1,0.36,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes shilu-modal-in { from { opacity:0; transform: translateY(10px) scale(0.98);} to { opacity:1; transform:none;} }`}</style>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-3 top-3 z-10 rounded-full border border-[#d8c9a3] bg-[#faf5e8] p-1.5 text-[#6b5d3f] transition hover:bg-[#efe6cf]"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- 节点卡片 ---------- */

export function NodeCard({
  node,
  poems,
  poetNames,
  poets,
  onSelectPoet,
  onClose,
}: {
  node: MapNode | null;
  poems: Poem[];
  poetNames: Map<number, string>;
  /** 全部诗人（用于列出「经过此处的诗人」），可选 */
  poets?: { id: number; slug: string; name: string; color: string; route: string[] }[];
  /** 点击诗人：直接选中该诗人（联动地图路线） */
  onSelectPoet?: (slug: string) => void;
  onClose: () => void;
}) {
  const nodePoems = node ? poems.filter((p) => p.nodeSlug === node.slug) : [];
  const img = node ? NODE_IMAGES[node.slug] : undefined;
  /* 经过此处的诗人：路线包含该节点，或在此有诗作 */
  const poetsHere = node
    ? (poets ?? [])
        .filter((pt) => pt.route.includes(node.slug) || nodePoems.some((pm) => pm.poetId === pt.id))
        .map((pt) => ({
          ...pt,
          poems: nodePoems.filter((pm) => pm.poetId === pt.id),
        }))
    : [];
  return (
    <Modal open={!!node} onClose={onClose} maxWidth="max-w-md">
      {node && (
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2 pr-8 text-lg font-semibold text-[#2e2618]">
            <MapPin className="h-5 w-5 text-[#c25b41]" />
            {node.name}
            {node.highlight && <Badge className="rounded-full bg-[#9e3b3b]">重点</Badge>}
          </div>

          {img && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-white/50 shadow-sm">
              <img src={img} alt={node.name} loading="lazy" decoding="async" className="h-40 w-full object-cover" />
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs text-[#8a7a54]">
              坐标：{node.lon}, {node.lat}
            </p>
            {node.note && <p className="text-sm leading-7 text-[#3d3421]">{node.note}</p>}
            {node.source && <p className="text-xs text-[#a08d5f]">来源：{node.source}</p>}

            {/* 经过此处的诗人（含其在此的诗作），点诗人即选中 */}
            {poetsHere.length > 0 && (
              <div className="border-t border-[#e0d3ae] pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#6b5d3f]">
                  <BookOpen className="h-3.5 w-3.5" /> 经过此处的诗人
                </p>
                <ul className="space-y-2">
                  {poetsHere.map((pt) => (
                    <li key={pt.slug}>
                      <button
                        className="flex items-center gap-2 rounded-full border border-[#d8c9a3] bg-[#faf5e8] py-1 pl-1.5 pr-3 text-xs font-medium text-[#4a3f2a] transition hover:border-[#a08d5f] hover:bg-[#efe6cf]"
                        onClick={() => {
                          onSelectPoet?.(pt.slug);
                          onClose();
                        }}
                        title={`选中${pt.name}，在地图上查看其行迹`}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-[#f6f1e3]"
                          style={{ background: pt.color }}
                        >
                          {pt.name.slice(0, 1)}
                        </span>
                        {pt.name}
                      </button>
                      {pt.poems.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-7 text-xs text-[#3d3421]">
                          {pt.poems.map((p) => (
                            <li key={p.id}>
                              《{p.title}》
                              {p.year && <span className="ml-1 text-[#8a7a54]">（{p.year}）</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* 未匹配到诗人的诗作（兜底列表） */}
            {nodePoems.filter((pm) => !poetsHere.some((pt) => pt.poems.includes(pm))).length > 0 && (
              <div className="border-t border-[#e0d3ae] pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#6b5d3f]">
                  <BookOpen className="h-3.5 w-3.5" /> 此地诗作
                </p>
                <ul className="space-y-1.5">
                  {nodePoems
                    .filter((pm) => !poetsHere.some((pt) => pt.poems.includes(pm)))
                    .map((p) => (
                      <li key={p.id} className="text-xs text-[#3d3421]">
                        《{p.title}》——{poetNames.get(p.poetId) ?? "佚名"}
                        {p.year && <span className="ml-1 text-[#8a7a54]">（{p.year}）</span>}
                      </li>
                    ))}
                  </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- 诗作卡片 ---------- */

/** 诗句按「一句一行」排版：优先按换行拆分，否则按句读拆分（保留标点） */
export function poemLineList(lines: string): string[] {
  const byNewline = lines.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byNewline.length >= 3) return byNewline;
  const parts = lines
    .replace(/\n+/g, "")
    .split(/(?<=[。！？；])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : byNewline;
}

export function PoemCard({
  poem,
  poetName,
  nodeName,
  onClose,
}: {
  poem: Poem | null;
  poetName: string;
  nodeName?: string;
  onClose: () => void;
}) {
  const lineList = poem ? poemLineList(poem.lines) : [];
  /** 优先直达诗作页；缺失时回退到古诗文网搜索 */
  const extUrl = poem?.extUrl?.trim() || "";
  const titleClean = poem?.title.replace(/[《》]/g, "").replace(/（[^）]*）/g, "") ?? "";
  const fallbackUrl = `https://www.gushiwen.cn/search.aspx?value=${encodeURIComponent(titleClean)}`;
  return (
    <Modal open={!!poem} onClose={onClose} maxWidth="max-w-lg">
      {poem && (
        <div className="p-6">
          <div className="mb-4 pr-8 text-lg font-semibold text-[#2e2618]">
            {poem.title}
            <span className="ml-2 text-sm font-normal text-[#8a7a54]">
              {poetName}
              {poem.year && ` · ${poem.year} 年`}
            </span>
          </div>

          <div className="space-y-4">
            {/* 诗句：一句一行 */}
            <div className="rounded-2xl border border-white/50 bg-[#faf5e8]/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex gap-2">
                <Quote className="mt-2 h-4 w-4 shrink-0 text-[#c9ba8f]" />
                <div className="space-y-1">
                  {lineList.map((ln, i) => (
                    <p key={i} className="text-sm leading-7 tracking-wide text-[#2e2618]">
                      {ln}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* 创作背景 */}
            {poem.background && (
              <div>
                <p className="mb-1 text-xs font-medium text-[#6b5d3f]">创作背景</p>
                <p className="text-sm leading-6 text-[#3d3421]">{poem.background}</p>
              </div>
            )}

            {/* 注释 */}
            {poem.note && (
              <div>
                <p className="mb-1 text-xs font-medium text-[#6b5d3f]">注释</p>
                <p className="text-sm leading-6 text-[#3d3421]">{poem.note}</p>
              </div>
            )}

            {nodeName && <p className="text-xs text-[#8a7a54]">作于：{nodeName}</p>}

            {poem.source && (
              <p className="text-xs text-[#a08d5f]">
                来源：{poem.source}
                {(poem.source.includes("全唐诗") || poem.source.includes("全宋诗")) && (
                  <a
                    href="https://github.com/chinese-poetry/chinese-poetry"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 underline hover:text-[#4a3f2a]"
                  >
                    （chinese-poetry 数据库）
                  </a>
                )}
              </p>
            )}

            {/* 古诗文网外链（直达诗作页） */}
            <div className="border-t border-[#e0d3ae] pt-3">
              <a
                href={extUrl || fallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#a08d5f] bg-[#efe6cf] px-3 py-1.5 text-xs font-medium text-[#4a3f2a] transition hover:bg-[#e4d6b4]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {extUrl
                  ? `在古诗文网打开《${titleClean}》原文页 →`
                  : `在古诗文网搜索《${titleClean}》→`}
              </a>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
