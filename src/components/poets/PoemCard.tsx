import { motion } from 'framer-motion';
import type { PoemVerse } from '@/data/poets';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

interface PoemCardProps {
  poem: PoemVerse;
  /** 诗人名（诗题旁竖排小字） */
  poetName: string;
  className?: string;
}

/**
 * 章节内竖排诗笺卡（poets.md §3）
 * 先边框描线（SVG rect pathLength 1s），后诗句逐行竖排显现
 * （opacity + x 12px，stagger 0.18s，从右向左列依次出现，模拟展卷读诗）。
 * hover：纸张轻微抬升（y -4px + shadow 加深）。
 */
export default function PoemCard({ poem, poetName, className }: PoemCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={cn(
        'relative bg-paper p-7 shadow-[0_10px_30px_rgba(36,24,16,0.12)] transition-shadow duration-500 hover:shadow-[0_22px_48px_rgba(36,24,16,0.22)] md:p-9',
        className,
      )}
    >
      {/* 赭石描线边框（滚动入视口后 1s 描出） */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
        <motion.rect
          x="1"
          y="1"
          style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
          fill="none"
          stroke="#A9803E"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-25% 0px' }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </svg>

      <div className="flex flex-row-reverse items-start justify-between gap-6 md:gap-10">
        {/* 右侧：竖排诗题 + 诗人 */}
        <div className="flex flex-row-reverse items-start gap-3">
          <h4 className="writing-vertical font-brush text-2xl leading-snug tracking-[0.12em] text-ink md:text-3xl">
            {poem.title}
          </h4>
          <span className="writing-vertical mt-1 border-l border-ochre/50 pl-1.5 font-serif text-xs tracking-[0.3em] text-ink-soft">
            {poetName}
          </span>
        </div>

        {/* 左侧：竖排诗句，从右向左逐列显现 */}
        <div className="max-w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-fit flex-row-reverse gap-4 md:gap-6">
            {poem.lines.map((line, i) => (
              <motion.p
                key={`${poem.title}-${i}`}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-25% 0px' }}
                transition={{ delay: 1.0 + i * 0.18, duration: 0.6, ease: EASE_OUT }}
                className="writing-vertical font-serif text-lg font-semibold leading-[1.9] tracking-verse text-ink md:text-xl"
              >
                {line}
              </motion.p>
            ))}
          </div>
        </div>
      </div>

      {/* 底部小注 + 朱砂印章角标 */}
      {poem.note && (
        <p className="mt-8 border-t border-ink/15 pt-4 font-serif text-xs leading-[2.0] tracking-[0.08em] text-ink-soft">
          {poem.note}
        </p>
      )}
      <img
        src="/seal-logo.svg"
        alt=""
        loading="lazy"
        className="absolute bottom-3 right-3 h-8 w-8 opacity-80"
      />
    </motion.div>
  );
}
