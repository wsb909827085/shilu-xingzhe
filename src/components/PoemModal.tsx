import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PoemVerse } from '@/data/poets';

interface PoemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 诗题/卡题 */
  poem: PoemVerse | null;
  /** 诗人名（诗笺右上方） */
  poetName?: string;
  /** 地点（如 梅关 / 南安） */
  place?: string;
}

/**
 * 诗笺弹窗（design.md §8.4）—— 地图板块复用
 * 深褐半透明遮罩（backdrop-blur），中央纸色诗笺：
 * 右侧竖排诗题+诗人，左侧竖排诗句逐行 stagger 浮现，底部注释 + 朱砂印章角标
 */
export default function PoemModal({ open, onOpenChange, poem, poetName, place }: PoemModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="paper-grain-overlay max-h-[85dvh] w-[min(92vw,720px)] overflow-y-auto border border-ink/20 bg-paper p-0 shadow-[0_24px_80px_rgba(36,24,16,0.45)] sm:rounded-none [&>button]:text-ink-soft [&>button]:hover:text-cinnabar"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* 遮罩层样式由 DialogOverlay 提供；此处为诗笺本体 */}
        {poem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.35, 1] }}
            className="relative px-8 py-10 md:px-12 md:py-12"
          >
            <DialogTitle className="sr-only">
              {poem.title}
              {poetName ? ` · ${poetName}` : ''}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {place ? `${place}诗笺` : '过岭诗笺'}
            </DialogDescription>

            <div className="flex flex-row-reverse items-start justify-center gap-8 md:gap-14">
              {/* 右侧：竖排诗题 + 诗人 */}
              <div className="flex flex-row-reverse items-start gap-4">
                <h3 className="writing-vertical font-brush text-3xl leading-snug tracking-[0.15em] text-ink md:text-4xl">
                  {poem.title}
                </h3>
                {(poetName || place) && (
                  <span className="writing-vertical mt-2 border-l border-ochre/50 pl-2 font-serif text-sm tracking-[0.3em] text-ink-soft">
                    {poetName}
                    {place ? ` · ${place}` : ''}
                  </span>
                )}
              </div>

              {/* 左侧：竖排诗句，逐行 stagger */}
              <div className="flex flex-row-reverse gap-5 md:gap-7">
                {poem.lines.map((line, i) => (
                  <motion.p
                    key={`${poem.title}-${i}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.15, duration: 0.6, ease: 'easeOut' }}
                    className="writing-vertical font-serif text-lg font-semibold leading-[2.2] tracking-verse text-ink md:text-xl"
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </div>

            {/* 底部注释 + 朱砂印章角标 */}
            {poem.note && (
              <p className="mt-10 border-t border-ink/15 pt-4 font-serif text-xs leading-[2.0] tracking-[0.08em] text-ink-soft">
                {poem.note}
              </p>
            )}
            <img
              src="/seal-logo.svg"
              alt=""
              className="absolute bottom-4 right-4 h-10 w-10 opacity-85"
            />
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
