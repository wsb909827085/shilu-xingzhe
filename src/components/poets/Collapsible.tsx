import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

interface CollapsibleProps {
  /** 模块题名（如「生平简介」「过岭纪事」） */
  title: string;
  /** 朱砂小印字符（取诗人姓氏） */
  sealChar: string;
  /** 默认折叠 */
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * 古卷风可折叠模块（poets 档案页信息密度优化）
 * 折叠头：朱砂小印 + 题名 + 细线 + 收展提示；默认折叠，点击展开，
 * framer-motion 高度动画（auto ↔ 0）。动效克制，仅 opacity/height。
 */
export default function Collapsible({ title, sealChar, defaultOpen = false, className, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-ink/15 bg-paper/60', className)}>
      <button
        type="button"
        aria-expanded={open}
        data-cursor-label={open ? '收' : '展'}
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-300 hover:bg-cinnabar/5 md:px-5"
      >
        {/* 朱砂小印 */}
        <span
          aria-hidden
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] font-brush text-sm leading-none transition-colors duration-300',
            open ? 'bg-cinnabar text-paper-on-dark' : 'border border-cinnabar/60 text-cinnabar',
          )}
        >
          {sealChar}
        </span>
        <span className="font-serif text-[15px] font-black tracking-[0.3em] text-ink">{title}</span>
        {/* 细线分隔 */}
        <span aria-hidden className="h-px flex-1 bg-ink/15 transition-colors duration-300 group-hover:bg-cinnabar/30" />
        <span className="shrink-0 font-serif text-xs tracking-[0.25em] text-ink-soft transition-colors duration-300 group-hover:text-cinnabar">
          {open ? '收起' : '展读'}
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="shrink-0 font-serif text-base leading-none text-cinnabar"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink/10 px-4 pb-5 pt-4 md:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
