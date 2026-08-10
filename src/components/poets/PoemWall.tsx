import { motion } from 'framer-motion';
import { POETS } from '@/data/poets';
import type { Poet } from '@/data/poets';
import { useDragScroll } from '@/hooks/useSwipe';

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

/**
 * 诗笺全集 · 单卡（深褐章节上的纸色竖排诗笺，320×480，底部诗人小印）
 */
function WallCard({ poet, index }: { poet: Poet; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ delay: index * 0.1, duration: 0.7, ease: EASE_OUT }}
      whileHover={{ y: -8 }}
      className="relative h-[480px] w-[320px] shrink-0 snap-center border border-transparent bg-paper p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-colors duration-500 hover:border-cinnabar"
    >
      <div className="flex h-full flex-row-reverse items-start gap-5 overflow-hidden">
        {/* 右侧：竖排诗题 + 诗人 */}
        <div className="flex shrink-0 flex-row-reverse items-start gap-2.5">
          <h3 className="writing-vertical font-brush text-[1.65rem] leading-snug tracking-[0.1em] text-ink">
            {poet.poem.title}
          </h3>
          <span className="writing-vertical mt-1 border-l border-ochre/50 pl-1 font-serif text-[11px] tracking-[0.3em] text-ink-soft">
            {poet.name}
          </span>
        </div>
        {/* 左侧：竖排诗句 */}
        <div className="flex flex-row-reverse gap-3.5">
          {poet.poem.lines.map((line, i) => (
            <p
              key={`${poet.id}-wall-${i}`}
              className="writing-vertical font-serif text-base font-semibold leading-[1.85] tracking-verse text-ink"
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* 底部诗人小印 */}
      <div className="absolute bottom-5 left-6 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-cinnabar font-brush text-base text-paper-on-dark"
        >
          {poet.sealChar}
        </span>
        <span className="font-latin text-xs italic tracking-[0.06em] text-ink-soft">
          {poet.years}
        </span>
      </div>
    </motion.article>
  );
}

/**
 * 过岭诗笺全集（poets.md §4）
 * --umber 深底章节，「集」字印章题签 + H1「过岭诗笺」+ 小注 Anthology；
 * 横向可滑动诗笺墙（桌面拖拽 / 移动滑动），卡片入场 x 60px + opacity（stagger 0.1s），
 * 悬停 y -8px + 朱砂描边。
 */
export default function PoemWall() {
  /* 横向拖拽 + 惯性（共用 useSwipe 实现），文本不可选中 */
  const drag = useDragScroll<HTMLDivElement>();

  return (
    <section
      id="poems"
      className="paper-grain-overlay-dark relative overflow-hidden bg-umber py-[clamp(6rem,14vh,10rem)]"
    >
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        {/* 题签：印章「集」+ H1 + 小注（SectionHeading 式） */}
        <motion.div
          initial={{ opacity: 0, scale: 1.7, rotate: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className="mb-5"
        >
          <svg viewBox="0 0 64 64" className="h-14 w-14 md:h-16 md:w-16" aria-hidden>
            <rect x="5" y="5" width="54" height="54" rx="8" fill="none" stroke="#A83A2A" strokeWidth="3.2" />
            <text
              x="32"
              y="45"
              textAnchor="middle"
              fontSize="30"
              fill="#A83A2A"
              style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}
            >
              集
            </text>
          </svg>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          className="font-brush text-[clamp(2.4rem,5.5vw,4rem)] leading-tight tracking-[0.1em] text-paper-on-dark"
        >
          过岭诗笺
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-4 flex items-center gap-4"
        >
          <span className="h-px w-[120px] bg-ochre/70" />
          <span className="font-latin text-sm italic tracking-[0.15em] text-ochre">Anthology</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT }}
          className="mt-8 max-w-[720px] font-serif text-base leading-[2.0] tracking-[0.05em] text-paper-on-dark/80 md:text-lg"
        >
          三首完整过岭诗与三则行迹注，并置一墙。左右拖曳，逐笺展读。
        </motion.p>
      </div>

      {/* 横向诗墙：桌面拖拽 / 移动滑动 */}
      <div
        {...drag}
        data-cursor-label="展"
        className="mt-14 flex cursor-grab select-none snap-x snap-proximity gap-6 overflow-x-auto pb-6 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [touch-action:pan-y]"
        style={{ paddingInline: 'max(1.5rem, calc((100% - 1200px) / 2 + 2.5rem))' }}
      >
        {POETS.map((poet, i) => (
          <WallCard key={poet.id} poet={poet} index={i} />
        ))}
      </div>
    </section>
  );
}
