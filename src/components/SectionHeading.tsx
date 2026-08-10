import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const NUM_CHARS = ['壹', '贰', '叁', '肆'] as const;

interface SectionHeadingProps {
  /** 板块序号 1–4 → 印章 壹/贰/叁/肆 */
  index: 1 | 2 | 3 | 4;
  /** H1 书法标题 */
  title: string;
  /** 英文/拼音小注 */
  note: string;
  /** 引言正文（2–3 行） */
  intro?: string;
  /** 深色底模式（文字纸色） */
  dark?: boolean;
  align?: 'left' | 'center';
}

/**
 * 板块题签（design.md §8.3）
 * [朱砂小印章 盖印动画 back.out(2)] + H1 书法标题 + 小注 + 赭石细线 120px + 引言
 */
export default function SectionHeading({
  index,
  title,
  note,
  intro,
  dark = false,
  align = 'left',
}: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <div className={cn('relative', centered && 'flex flex-col items-center text-center')}>
      {/* 朱砂小印章：盖印动画 */}
      <motion.div
        initial={{ opacity: 0, scale: 1.7, rotate: -8 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className={cn('mb-5', centered && 'mx-auto')}
      >
        <svg viewBox="0 0 64 64" className="h-14 w-14 md:h-16 md:w-16">
          <rect
            x="5"
            y="5"
            width="54"
            height="54"
            rx="8"
            fill="none"
            stroke="#A83A2A"
            strokeWidth="3.2"
          />
          <text
            x="32"
            y="45"
            textAnchor="middle"
            fontSize="30"
            fill="#A83A2A"
            style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}
          >
            {NUM_CHARS[index - 1]}
          </text>
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'font-brush text-[clamp(2.4rem,5.5vw,4rem)] leading-tight tracking-[0.1em]',
          dark ? 'text-paper-on-dark' : 'text-ink',
        )}
      >
        {title}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ duration: 0.8, delay: 0.25 }}
        className={cn('mt-4 flex items-center gap-4', centered && 'justify-center')}
      >
        <span className="h-px w-[120px] bg-ochre/70" />
        <span className="font-latin text-sm italic tracking-[0.15em] text-ochre">{note}</span>
      </motion.div>

      {intro && (
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'mt-8 max-w-[720px] font-serif text-base leading-[2.0] tracking-[0.05em] md:text-lg',
            dark ? 'text-paper-on-dark/80' : 'text-ink-soft',
          )}
        >
          {intro}
        </motion.p>
      )}
    </div>
  );
}
