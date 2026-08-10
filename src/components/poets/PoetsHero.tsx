import { motion } from 'framer-motion';

const TITLE = '诗人行迹档案'.split('');
const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

/**
 * 页头 Hero（poets.md §1，紧凑版 60vh）
 * 深焦茶底 + 纸纹 overlay；竖排 H0 字符级入场（blur 10→0、y 24→0，stagger 0.1s）；
 * 底部梅枝镜像自左向右 clip 展开 1.4s。无粒子、无 pin。
 */
export default function PoetsHero() {
  return (
    <section className="paper-grain-overlay-dark relative flex min-h-[60dvh] items-center justify-center overflow-hidden bg-umber-deep">
      <div className="relative z-10 flex flex-col items-center gap-9 px-6 pb-24 pt-28">
        {/* 竖排 H0：字符级入场 */}
        <h1
          aria-label="诗人行迹档案"
          className="writing-vertical font-brush text-[clamp(2.8rem,7vw,5rem)] leading-[1.35] tracking-brush text-paper-on-dark"
        >
          {TITLE.map((ch, i) => (
            <motion.span
              key={`${ch}-${i}`}
              aria-hidden
              className="inline-block"
              initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: EASE_OUT }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        {/* 横排小注 */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8, ease: EASE_OUT }}
          className="font-latin text-lg italic tracking-[0.15em] text-gold-leaf md:text-xl"
        >
          Six Travellers · 716–1279
        </motion.p>

        {/* 引言一行 */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.9, ease: EASE_OUT }}
          className="max-w-[640px] text-center font-serif text-[15px] leading-[2.0] tracking-[0.12em] text-paper-on-dark/80 md:text-base"
        >
          六位行人，一条岭路；有人开岭，有人赴谪，有人北归，有人成仁。
        </motion.p>
      </div>

      {/* 底部梅枝（镜像）自左向右 clip 展开 */}
      <motion.div
        aria-hidden
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ delay: 0.6, duration: 1.4, ease: EASE_OUT }}
        className="pointer-events-none absolute bottom-4 left-1/2 z-0 w-[min(560px,86vw)] -translate-x-1/2 opacity-80"
      >
        <img src="/plum-branch.svg" alt="" className="w-full -scale-x-100" />
      </motion.div>
    </section>
  );
}
