import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SectionHeading from '@/components/SectionHeading';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const NODES = [
  {
    era: '开元四年',
    year: 'A.D. 716',
    title: '开岭',
    text: '张九龄主持开凿大庾岭新路，撰《开凿大庾岭路序》。“坦坦而方五轨，阗阗而走四通”——险峻山隘变为通衢大道。',
  },
  {
    era: '唐宋三百年',
    year: '716–1279',
    title: '逐臣',
    text: '岭路既通，南北人流物流络绎。而政治风暴中的逐臣——宋之问、寇准、苏轼、苏辙……皆负笈南行，踽踽过岭。',
  },
  {
    era: '过岭成诗',
    year: 'Poetry',
    title: '绝唱',
    text: '岭上梅花南北路。过岭一刻，身世苍茫，遂成千古绝唱：《度大庾岭》《过大庾岭》《南安军》……一部贬谪史，半部过岭诗。',
  },
];

const QUOTE = '岭海之通衢，南北之咽喉。';

/**
 * 项目缘起 — 开岭与诗路（home.md §2）
 * 横卷开卷动画 + pin 150vh 三节点时间叙事 + 张九龄引言块
 * 移动端降级：取消 pin，纵向堆叠
 */
export default function OriginSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // 横卷插画开卷：clip-path 自中央向左右展开
      gsap.fromTo(
        '.origin-scroll-img',
        { clipPath: 'inset(0% 50% 0% 50%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.4,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.origin-scroll-frame', start: 'top 75%', once: true },
        },
      );
      gsap.fromTo(
        '.origin-scroll-frame',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.9,
          delay: 0.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.origin-scroll-frame', start: 'top 75%', once: true },
        },
      );

      // 引言块：字级 stagger 墨晕入场
      gsap.fromTo(
        '.origin-quote-char',
        { opacity: 0, y: 16, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.7,
          stagger: 0.06,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.origin-quote', start: 'top 80%', once: true },
        },
      );

      // Pin 叙事段：桌面 150vh，移动端降级纵向堆叠
      mm.add('(min-width: 768px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '.origin-pin',
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 0.6,
          },
        });

        // 初始：节点一激活，其余沉暗
        gsap.set('.origin-node', { opacity: 0.25 });
        gsap.set('.origin-node-0', { opacity: 1 });
        gsap.set('.origin-node-line', { scaleY: 0, transformOrigin: 'top center' });
        gsap.set('.origin-node-0 .origin-node-line', { scaleY: 1 });
        gsap.set('.origin-node-year', { scale: 0.92, transformOrigin: 'left center' });
        gsap.set('.origin-node-0 .origin-node-year', { scale: 1.15 });

        for (let i = 1; i < NODES.length; i++) {
          const at = i; // 每个节点占一段时间
          tl.to(`.origin-node-${i - 1}`, { opacity: 0.25, duration: 0.35, ease: 'power3.inOut' }, at)
            .to(`.origin-node-${i - 1} .origin-node-line`, { scaleY: 0, duration: 0.35 }, at)
            .to(`.origin-node-${i - 1} .origin-node-year`, { scale: 0.92, duration: 0.35 }, at)
            .to(`.origin-node-${i}`, { opacity: 1, duration: 0.35, ease: 'power3.inOut' }, at)
            .to(`.origin-node-${i} .origin-node-line`, { scaleY: 1, duration: 0.4, ease: 'power2.out' }, at)
            .to(`.origin-node-${i} .origin-node-year`, { scale: 1.15, duration: 0.4, ease: 'power2.out' }, at)
            .to({}, { duration: 0.6 }); // 停留
        }
      });

      mm.add('(max-width: 767px)', () => {
        gsap.set('.origin-node', { opacity: 1 });
        gsap.set('.origin-node-line', { scaleY: 1 });
      });
    },
    { scope: rootRef },
  );

  return (
    <section id="origin" ref={rootRef} className="paper-grain-overlay relative bg-paper">
      {/* 上界栏 */}
      <div className="divider-rail mx-auto max-w-[1200px]" />

      <div className="mx-auto max-w-[1200px] px-6 py-[clamp(6rem,14vh,10rem)] md:px-10">
        <SectionHeading
          index={1}
          title="项目缘起"
          note="Origin of the Road"
          intro="大庾岭横亘赣粤之交，为南岭五岭之首。唐开元四年（A.D. 716），韶州曲江人张九龄奉命开凿岭路，自此“岭海之通衢”贯通南北。而后数百年，一位位贬谪诗人由此岭南下或北还——古道成了诗路，梅关成了诗眼。"
        />

        {/* 横卷插画：手卷装裱 */}
        <div className="mx-auto mt-16 max-w-[1440px] md:-mx-[max(0px,calc((1440px-1200px)/2))]">
          <div
            className="origin-scroll-frame border-[24px] border-umber bg-umber p-[1px] opacity-0 shadow-[0_20px_60px_rgba(36,24,16,0.25)]"
            data-cursor-label="展"
          >
            <div className="border border-gold-leaf/60">
              <img
                src="/origin-scroll.png"
                alt="唐代开凿大庾岭路水墨长卷"
                loading="lazy"
                className="origin-scroll-img block w-full transition-transform duration-700 hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pin 叙事段 */}
      <div className="origin-pin mx-auto max-w-[1200px] px-6 pb-[clamp(4rem,10vh,8rem)] md:px-10">
        <div className="flex min-h-[70dvh] flex-col justify-center gap-10 md:min-h-[80dvh] md:flex-row md:gap-16">
          {/* 左 40%：节点列表 */}
          <div className="flex flex-row gap-8 md:w-[40%] md:flex-col md:gap-14">
            {NODES.map((node, i) => (
              <div key={node.title} className={`origin-node origin-node-${i} flex gap-4 md:gap-5`}>
                {/* 朱砂竖线 */}
                <span className="origin-node-line block w-[3px] self-stretch bg-cinnabar md:w-1" />
                <div>
                  <span className="origin-node-year block font-latin text-xl italic tracking-[0.04em] text-ochre md:text-2xl">
                    {node.year}
                  </span>
                  <h3 className="mt-2 font-serif text-lg font-black tracking-[0.06em] text-ink md:text-2xl">
                    节点{['一', '二', '三'][i]} · {node.era}
                  </h3>
                </div>
              </div>
            ))}
          </div>
          {/* 右 60%：说明文字 */}
          <div className="flex flex-col gap-10 md:w-[60%] md:gap-14">
            {NODES.map((node, i) => (
              <p
                key={node.title}
                className={`origin-node origin-node-${i} max-w-[560px] font-serif text-base leading-[2.0] tracking-[0.05em] text-ink-soft md:text-lg`}
              >
                {node.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 张九龄引言块 */}
      <div className="origin-quote mx-auto max-w-[720px] px-6 pb-[clamp(6rem,14vh,10rem)] text-center">
        <blockquote className="writing-vertical mx-auto flex h-[280px] justify-center gap-4 font-serif text-2xl font-semibold leading-[2.2] tracking-verse text-ink md:text-3xl">
          {QUOTE.split('').map((c, i) => (
            <span key={`${c}-${i}`} className="origin-quote-char opacity-0">
              {c}
            </span>
          ))}
        </blockquote>
        <p className="mt-8 font-serif text-xs tracking-[0.2em] text-ink-soft">
          —— 张九龄《开凿大庾岭路序》（据文意拟）
        </p>
      </div>

      {/* 下界栏 */}
      <div className="divider-rail mx-auto max-w-[1200px]" />
    </section>
  );
}
