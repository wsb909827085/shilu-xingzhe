import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const TITLE_CHARS = ['诗', '路', '行', '者'];

/**
 * Preloader 展卷入屏（home.md §0 / design.md §8.1）
 * 印章描线 → 盖印填朱 → 「诗路行者」四字显现 → 左右卷轴面板展开
 * 总时长 ≤ 2.8s，点击任意处直接跳至展开步骤
 */
export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      document.body.style.overflow = 'hidden';

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          document.body.style.overflow = '';
          onComplete();
        },
      });
      tlRef.current = tl;

      // 1. 印章描线
      tl.fromTo(
        '.preloader-seal-outline',
        { strokeDashoffset: 340 },
        { strokeDashoffset: 0, duration: 0.9 },
        0,
      );
      // 盖印：朱砂填充 + scale 1.6→1 + back.out 抖动
      tl.fromTo(
        '.preloader-seal-fill',
        { opacity: 0, scale: 1.6, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' },
        0.85,
      );
      // 2. 「诗路行者」四字
      tl.fromTo(
        '.preloader-char',
        { opacity: 0, y: 20, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.09, ease: 'power2.out' },
        0.75,
      );
      tl.fromTo(
        '.preloader-sub',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        1.4,
      );
      // 3. 停顿后左右面板展开
      tl.addLabel('open', 1.8);
      tl.to('.preloader-panel-left', { xPercent: -100, duration: 1.0, ease: 'power3.inOut' }, 'open');
      tl.to('.preloader-panel-right', { xPercent: 100, duration: 1.0, ease: 'power3.inOut' }, 'open');
      tl.to('.preloader-center', { opacity: 0, duration: 0.35 }, 'open');
      tl.to('.preloader-hint', { opacity: 0, duration: 0.2 }, 'open');

      return () => {
        document.body.style.overflow = '';
      };
    },
    { scope: rootRef },
  );

  const skip = () => {
    const tl = tlRef.current;
    if (tl && tl.labels.open !== undefined && tl.time() < tl.labels.open) {
      tl.play('open');
    }
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[90]"
      role="presentation"
      onClick={skip}
    >
      {/* 卷轴两轴面板 */}
      <div className="preloader-panel-left paper-grain-overlay-dark absolute inset-y-0 left-0 w-1/2 bg-umber-deep" />
      <div className="preloader-panel-right paper-grain-overlay-dark absolute inset-y-0 right-0 w-1/2 bg-umber-deep" />

      {/* 中央内容层 */}
      <div className="preloader-center absolute inset-0 z-10 flex flex-col items-center justify-center gap-8">
        {/* 线描印章 */}
        <svg viewBox="0 0 96 96" className="h-24 w-24 md:h-28 md:w-28">
          <rect
            className="preloader-seal-fill"
            x="6"
            y="6"
            width="84"
            height="84"
            rx="6"
            fill="#A83A2A"
            opacity="0"
          />
          <rect
            className="preloader-seal-outline"
            x="6"
            y="6"
            width="84"
            height="84"
            rx="6"
            fill="none"
            stroke="#A83A2A"
            strokeWidth="2.5"
            strokeDasharray="340"
            strokeDashoffset="340"
          />
          <text
            x="48"
            y="44"
            textAnchor="middle"
            fontSize="26"
            fill="#F0E7D3"
            className="preloader-seal-fill"
            opacity="0"
            style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}
          >
            诗
          </text>
          <text
            x="48"
            y="78"
            textAnchor="middle"
            fontSize="26"
            fill="#F0E7D3"
            className="preloader-seal-fill"
            opacity="0"
            style={{ fontFamily: "'Ma Shan Zheng','KaiTi',serif" }}
          >
            路
          </text>
        </svg>

        <h1 className="flex gap-4 font-brush text-5xl tracking-brush text-paper-on-dark md:gap-6 md:text-6xl">
          {TITLE_CHARS.map((c) => (
            <span key={c} className="preloader-char opacity-0">
              {c}
            </span>
          ))}
        </h1>
        <p className="preloader-sub font-latin text-sm italic tracking-[0.2em] text-gold-leaf/80 opacity-0">
          Travellers of the Poetry Road
        </p>
      </div>

      <p className="preloader-hint absolute bottom-8 right-8 z-10 font-serif text-xs tracking-[0.25em] text-paper-on-dark/45">
        点击任意处展卷 ▷
      </p>
    </div>
  );
}
