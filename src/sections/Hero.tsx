import { memo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_CHARS = ['诗', '路', '行', '者'];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

/* ------------------------------------------------------------------ */
/* 梅花花瓣粒子层（独立微组件，隔离常驻动画循环）                        */
/* ------------------------------------------------------------------ */
interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  rotate: number;
  rotateSpeed: number;
  alpha: number;
  breatheFreq: number;
}

const PlumPetals = memo(function PlumPetals({ count }: { count: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let running = true;
    const petals: Petal[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (initial = false): Petal => {
      const w = canvas.clientWidth;
      const cycle = 5 + Math.random() * 4; // 5–9s 随机周期
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * canvas.clientHeight : -20,
        size: 5 + Math.random() * 8,
        speed: canvas.clientHeight / (cycle * 60),
        swayAmp: 18 + Math.random() * 30,
        swayFreq: 0.008 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        rotate: Math.random() * Math.PI * 2,
        rotateSpeed: (Math.random() - 0.5) * 0.03,
        alpha: 0.55 + Math.random() * 0.4,
        breatheFreq: 0.6 + Math.random() * 0.8,
      };
    };
    for (let i = 0; i < count; i++) petals.push(spawn(true));

    const drawPetal = (p: Petal, t: number) => {
      const breathe = 0.75 + 0.25 * Math.sin(t * 0.001 * p.breatheFreq + p.phase);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotate);
      ctx.globalAlpha = p.alpha * breathe;
      ctx.fillStyle = '#C98D92';
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.4, p.size * 0.7, p.size * 0.8, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.8, -p.size * 0.9, -p.size * 0.4, 0, -p.size);
      ctx.fill();
      ctx.restore();
    };

    let t0 = performance.now();
    const tick = (t: number) => {
      if (!running) return;
      const dt = Math.min((t - t0) / 16.7, 3);
      t0 = t;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.y += p.speed * dt;
        p.x += Math.sin(t * p.swayFreq + p.phase) * 0.6 * dt + Math.sin(t * 0.0004 + i) * 0.15;
        p.rotate += p.rotateSpeed * dt;
        if (p.y > canvas.clientHeight + 24) petals[i] = spawn();
        drawPetal(p, t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // 出屏即停
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          t0 = performance.now();
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}
    />
  );
});

/* ------------------------------------------------------------------ */
/* 首屏 Hero — 梅关暮色（home.md §1）                                   */
/* ------------------------------------------------------------------ */
export default function Hero({ active }: { active: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const entranceRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      // 入场时间线（paused，等待 Preloader 完成后播放）
      const tl = gsap.timeline({ paused: true });
      entranceRef.current = tl;

      tl.fromTo(
        '.hero-bg',
        { scale: 1.08 },
        { scale: 1, duration: 2, ease: 'power2.out' },
        0,
      )
        .fromTo(
          '.hero-mist',
          { xPercent: -6 },
          { xPercent: 6, duration: 8, ease: 'sine.inOut' },
          0,
        )
        .fromTo(
          '.hero-title-char',
          { opacity: 0, y: 30, filter: 'blur(12px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, stagger: 0.15, ease: 'power2.out' },
          0.3,
        )
        .fromTo(
          '.hero-seal',
          { opacity: 0, scale: 1.6, rotate: -10 },
          { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2)' },
          1.1,
        )
        .fromTo(
          '.hero-subtitle',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
          1.2,
        )
        .fromTo(
          '.hero-latin',
          { opacity: 0 },
          { opacity: 1, duration: 0.7 },
          1.4,
        )
        .fromTo(
          '.hero-cta',
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' },
          1.6,
        )
        .fromTo(
          '.hero-aside, .hero-scrollhint',
          { opacity: 0 },
          { opacity: 1, duration: 0.9, stagger: 0.2 },
          1.8,
        );

      // 滚动视差
      gsap.to('.hero-bg', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero-content', {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      // 滚动提示墨点循环下落
      gsap.to('.hero-drop', {
        y: 44,
        opacity: 0,
        duration: 1.6,
        ease: 'power1.in',
        repeat: -1,
        repeatDelay: 0.4,
      });
    },
    { scope: rootRef },
  );

  useEffect(() => {
    if (active) entranceRef.current?.play(0);
  }, [active]);

  const petalCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 40;

  return (
    <section ref={rootRef} className="relative min-h-[100dvh] overflow-hidden bg-umber-deep">
      {/* 背景：梅关暮色 */}
      <div
        className="hero-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero-bg.png)' }}
      />
      {/* 暮霭层：半透明 mist 渐变，横向缓移 */}
      <div
        className="hero-mist pointer-events-none absolute inset-[-10%] z-[1]"
        style={{
          background:
            'linear-gradient(105deg, rgba(138,133,119,0.22) 0%, rgba(138,133,119,0.05) 40%, rgba(62,44,29,0.18) 75%, rgba(138,133,119,0.12) 100%)',
        }}
      />
      {/* 底部渐变保证文字可读 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[55%]"
        style={{ background: 'linear-gradient(to top, #241810 0%, rgba(36,24,16,0) 100%)' }}
      />
      {/* 宣纸纹理 overlay 12% */}
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          backgroundImage: 'url(/paper-texture.png)',
          backgroundSize: '480px 480px',
          mixBlendMode: 'overlay',
          opacity: 0.12,
        }}
      />
      {/* 梅花粒子 */}
      <PlumPetals count={petalCount} />

      {/* 主内容 */}
      <div className="hero-content relative z-[4] flex min-h-[100dvh] flex-col justify-center px-6 md:px-[8%]">
        <div className="flex items-start gap-6 md:gap-10">
          {/* 竖排 H0 */}
          <h1 className="writing-vertical flex gap-3 font-brush text-[clamp(3.5rem,9vw,7.5rem)] leading-none tracking-brush text-paper-on-dark">
            {TITLE_CHARS.map((c) => (
              <span key={c} className="hero-title-char opacity-0">
                {c}
              </span>
            ))}
          </h1>
          {/* 朱砂小印章「梅关」 */}
          <div className="hero-seal mt-2 opacity-0">
            <svg viewBox="0 0 96 96" className="h-12 w-12 md:h-16 md:w-16">
              <rect x="6" y="6" width="84" height="84" rx="8" fill="#A83A2A" />
              <text x="48" y="44" textAnchor="middle" fontSize="30" fill="#F0E7D3" style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}>梅</text>
              <text x="48" y="78" textAnchor="middle" fontSize="30" fill="#F0E7D3" style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}>关</text>
            </svg>
          </div>
        </div>

        <p className="hero-subtitle mt-8 font-serif text-[1.1rem] font-semibold tracking-[0.18em] text-paper-on-dark/85 opacity-0 md:text-[1.4rem]">
          唐宋贬谪诗人过大庾岭行迹数字地图
        </p>
        <p className="hero-latin mt-3 font-latin text-sm italic tracking-[0.12em] text-ochre opacity-0 md:text-base">
          Meiguan Pass · Dayu Ridge · 716–1279 A.D.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            data-cursor-label="展"
            onClick={() => scrollToSection('map')}
            className="hero-cta group relative overflow-hidden border border-cinnabar bg-transparent px-7 py-3 font-serif text-[15px] tracking-[0.25em] text-cinnabar opacity-0 transition-colors duration-500 hover:text-paper-on-dark"
          >
            <span className="absolute inset-0 origin-center scale-0 rounded-full bg-cinnabar transition-transform duration-500 ease-out group-hover:scale-[2.2]" />
            <span className="relative">展卷入图</span>
          </button>
          <button
            type="button"
            data-cursor-label="览"
            onClick={() => scrollToSection('origin')}
            className="hero-cta group relative px-2 py-3 font-serif text-[15px] tracking-[0.25em] text-paper-on-dark/85 opacity-0"
          >
            项目缘起
            <span className="absolute bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-paper-on-dark/80 transition-transform duration-500 group-hover:scale-x-100" />
          </button>
        </div>
      </div>

      {/* 右下角竖排小字 */}
      <p className="hero-aside writing-vertical absolute bottom-[14%] right-6 z-[4] hidden font-serif text-sm leading-[2.2] tracking-[0.2em] text-paper-on-dark/60 opacity-0 md:right-10 md:block">
        自开元四年张九龄开岭，三百余年间，多少逐臣由此南下。
      </p>

      {/* 底部滚动提示 */}
      <button
        type="button"
        onClick={() => scrollToSection('origin')}
        className="hero-scrollhint absolute bottom-6 left-1/2 z-[4] flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
        aria-label="向下滚动"
      >
        <span className="font-serif text-xs tracking-[0.35em] text-paper-on-dark/60">徐徐展卷</span>
        <span className="relative block h-12 w-px bg-paper-on-dark/30">
          <span className="hero-drop absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-paper-on-dark/80" />
        </span>
      </button>
    </section>
  );
}
