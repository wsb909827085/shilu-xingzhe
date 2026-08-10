import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Map, ScrollText } from 'lucide-react';
import { POETS } from '@/data/poets';
import { cn } from '@/lib/utils';

interface PoetChapterNavProps {
  /** 当前章节 id（诗人 id 或 'poems'） */
  activeId: string;
  /** 点击印章 → 滚动至对应诗人章节 */
  onSelect: (poetId: string) => void;
  /** 点击「诗笺全集」→ 滚动至汇总墙 */
  onAnthology: () => void;
}

/**
 * 人物选择器 sticky 目录（poets.md §2）
 * sticky top-16（顶栏下方），纸色 95% + 界栏线；六枚印章式按钮（张/宋/寇/轼/辙/文），
 * 选中态朱砂填充白字 + scale 1.08，scroll-spy 朱砂指示点（Framer Motion layoutId）。
 * 右侧页内锚点：诗笺全集 / 返回地图。移动端横滑。
 */
export default function PoetChapterNav({ activeId, onSelect, onAnthology }: PoetChapterNavProps) {
  const navigate = useNavigate();

  const backToMap = () => {
    navigate('/');
    window.setTimeout(() => {
      const el = document.getElementById('map');
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  return (
    <div className="sticky top-16 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-5 py-3 md:px-10">
        {/* 六枚印章式按钮（移动端横滑） */}
        <nav
          aria-label="诗人章节目录"
          className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {POETS.map((poet) => {
            const active = activeId === poet.id;
            return (
              <button
                key={poet.id}
                type="button"
                data-cursor-label="览"
                onClick={() => onSelect(poet.id)}
                aria-label={`${poet.name}档案`}
                className={cn(
                  'relative flex h-14 w-14 shrink-0 items-center justify-center border font-brush text-2xl transition-all duration-300',
                  active
                    ? 'scale-[1.08] border-cinnabar bg-cinnabar text-paper-on-dark shadow-[0_6px_18px_rgba(168,58,42,0.35)]'
                    : 'border-ink/30 bg-paper text-ink hover:border-cinnabar/60 hover:bg-cinnabar/10 hover:text-cinnabar',
                )}
              >
                {poet.sealChar}
                {active && (
                  <motion.span
                    layoutId="poet-spy-dot"
                    className="absolute -bottom-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cinnabar"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* 右侧页内锚点 */}
        <div className="hidden shrink-0 items-center gap-7 md:flex">
          <button
            type="button"
            data-cursor-label="览"
            onClick={onAnthology}
            className={cn(
              'flex items-center gap-2 font-serif text-sm tracking-[0.2em] transition-colors duration-300',
              activeId === 'poems' ? 'text-cinnabar' : 'text-ink-soft hover:text-cinnabar',
            )}
          >
            <ScrollText className="h-4 w-4" />
            诗笺全集
          </button>
          <button
            type="button"
            data-cursor-label="览"
            onClick={backToMap}
            className="flex items-center gap-2 font-serif text-sm tracking-[0.2em] text-ink-soft transition-colors duration-300 hover:text-cinnabar"
          >
            <Map className="h-4 w-4" />
            返回地图
          </button>
        </div>
      </div>
    </div>
  );
}
