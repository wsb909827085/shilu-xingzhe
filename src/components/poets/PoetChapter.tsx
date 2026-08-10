import { useRef } from 'react';
import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Poet } from '@/data/poets';
import PoemCard from './PoemCard';
import Collapsible from './Collapsible';
import { cn } from '@/lib/utils';

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

interface PoetChapterProps {
  poet: Poet;
  /** 章节序号（0 起）：奇数章 paper、偶数章 paper-deep */
  index: number;
}

/**
 * 单人档案章节（poets.md §3）
 * 深浅交替底；右上巨大背景姓氏（10% 透明，滚动视差 ±6%）；
 * 左 34% 画像（自上而下「揭裱」clip 1.2s + 朱砂角印盖下 back 弹性 delay 0.9s）+ 小传；
 * 右 60% 姓名书法 H1 字符级 blot 入场（stagger 0.08s）+ 生卒 Cormorant 淡入
 * + 「过岭纪事」块级 fade-up（stagger 0.12s）+ 竖排诗笺卡 + 地图链接。
 * 全部动画触发于章节进入视口 25% 处。
 */
export default function PoetChapter({ poet, index }: PoetChapterProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);
  const deep = index % 2 === 1;
  const viewport = { once: true, margin: '-25% 0px' } as const;

  return (
    <section
      ref={ref}
      id={`poet-${poet.id}`}
      data-poet={poet.id}
      className={cn('relative overflow-hidden', deep ? 'bg-paper-deep' : 'bg-paper')}
    >
      {/* 巨大背景姓氏（10% 透明 + 轻微视差） */}
      <motion.span
        aria-hidden
        style={{ y: bgY }}
        className="pointer-events-none absolute -right-4 top-4 select-none font-brush text-[clamp(11rem,24vw,22rem)] leading-none text-ink/10"
      >
        {poet.sealChar}
      </motion.span>

      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-[clamp(5rem,12vh,8rem)] md:px-10 lg:grid-cols-[34%_minmax(0,1fr)] lg:gap-16">
        {/* 左：画像 + 小传 */}
        <div className="flex flex-col gap-8">
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
            viewport={viewport}
            transition={{ duration: 1.2, ease: EASE_OUT }}
            className="relative"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="border border-ink/20 bg-paper p-3 shadow-[0_16px_40px_rgba(36,24,16,0.18)]"
            >
              <img
                src={poet.portrait}
                alt={`${poet.name}水墨半身像`}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </motion.div>
            {/* 朱砂角印：盖下（back 弹性，delay 0.9s） */}
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 1.8, rotate: -14 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
              viewport={viewport}
              transition={{ delay: 0.9, type: 'spring', stiffness: 320, damping: 13 }}
              className="absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-[4px] bg-cinnabar font-brush text-xl text-paper-on-dark shadow-[0_4px_14px_rgba(168,58,42,0.45)]"
            >
              {poet.sealChar}
            </motion.span>
          </motion.div>

          {/* 生平简介：默认折叠，点击展读 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          >
            <Collapsible title="生平简介" sealChar={poet.sealChar}>
              <p className="font-serif text-[15px] leading-[2.0] tracking-[0.05em] text-ink-soft">
                {poet.bio}
              </p>
            </Collapsible>
          </motion.div>
        </div>

        {/* 右：姓名 + 纪事 + 诗笺 + 地图链接 */}
        <div>
          <h3 className="font-brush text-[clamp(2.4rem,5.5vw,4rem)] leading-tight tracking-[0.1em] text-ink">
            {poet.name.split('').map((ch, i) => (
              <motion.span
                key={`${ch}-${i}`}
                className="inline-block"
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={viewport}
                transition={{ delay: i * 0.08, duration: 0.8, ease: EASE_OUT }}
              >
                {ch}
              </motion.span>
            ))}
          </h3>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <span className="font-latin text-xl italic tracking-[0.04em] text-ochre">
              {poet.years}
            </span>
            <span aria-hidden className="h-px w-10 bg-ochre/60" />
            <span className="font-serif text-sm tracking-[0.25em] text-ink-soft">
              {poet.dynasty} · {poet.epithet}
            </span>
          </motion.div>

          {/* 过岭纪事：默认折叠，点击展读 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            className="mt-10"
          >
            <Collapsible title="过岭纪事" sealChar={poet.sealChar}>
              <p className="font-serif text-base leading-[2.0] tracking-[0.05em] text-ink md:text-[1.05rem]">
                {poet.journey}
              </p>
              <p className="mt-4 font-serif text-base font-semibold leading-[2.0] tracking-[0.1em] text-cinnabar">
                「{poet.quote}」
              </p>
            </Collapsible>
          </motion.div>

          {/* 竖排诗笺卡 */}
          <PoemCard poem={poet.poem} poetName={poet.name} className="mt-10" />

          {/* 在地图上查看行迹 →（回主页 ?poet= 并选中） */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ delay: 0.2, duration: 0.8, ease: EASE_OUT }}
          >
            <Link
              to={`/?poet=${poet.id}`}
              data-cursor-label="览"
              className="group relative mt-8 inline-flex items-center gap-2 pb-1.5 font-serif text-[15px] tracking-[0.2em] text-cinnabar"
            >
              在地图上查看行迹
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-cinnabar transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
