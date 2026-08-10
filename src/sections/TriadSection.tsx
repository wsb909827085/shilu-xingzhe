import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import SectionHeading from '@/components/SectionHeading';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CARDS = [
  {
    key: 'gudao',
    img: '/san-gudao.png',
    glyph: '骨',
    title: '古道之骨',
    latin: 'The Road',
    num: '壹',
    text: '梅关古道为线性文化遗产：北起南安（今江西大余），逾梅关而抵南雄，全长约四十里，石板为径，关口为枢。驿道、关楼、古梅、碑刻，共同构成一副完整的文化景观骨架。',
  },
  {
    key: 'bianzhe',
    img: '/san-bianzhe.png',
    glyph: '魂',
    title: '贬谪之魂',
    latin: 'The Exiles',
    num: '贰',
    text: '自宋之问“度岭方辞国”，至文天祥“出岭同谁出”，三百余年间，贬谪诗人把个人命运的至暗时刻，写进岭上的梅花与风雨。过岭诗，是中国诗歌史上最沉郁的一个诗群。',
  },
  {
    key: 'shuzi',
    img: '/san-shuzi.png',
    glyph: '翼',
    title: '数字之翼',
    latin: 'The Digital Wing',
    num: '叁',
    text: '以 GIS 为参照（CHGIS 历史地理数据），以手绘示意地图为纸，以描线动画为笔，以 AIGC 为墨——让沉睡在史册中的行迹重新浮现于数字长卷之上。',
  },
];

/**
 * 诗路三叠（home.md §3）
 * 深褐底，pin 200vh 横向三帧推进；移动端降级纵向堆叠
 */
export default function TriadSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const track = rootRef.current?.querySelector<HTMLElement>('.triad-track');
        if (!track) return;

        const getShift = () => -(track.scrollWidth - window.innerWidth);

        // 轨道横向推进（scrub）
        const scrollTween = gsap.to(track, {
          x: getShift,
          ease: 'none',
          scrollTrigger: {
            trigger: '.triad-pin',
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        // 进度指示：横线朱砂填充 + 墨点依次点亮
        gsap.fromTo(
          '.triad-progress-fill',
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            transformOrigin: 'left center',
            scrollTrigger: {
              trigger: '.triad-pin',
              start: 'top top',
              end: '+=200%',
              scrub: 0.6,
            },
          },
        );
        gsap.utils.toArray<HTMLElement>('.triad-dot').forEach((dot, i) => {
          gsap.fromTo(
            dot,
            { backgroundColor: 'rgba(239,228,203,0.25)' },
            {
              backgroundColor: '#A83A2A',
              ease: 'none',
              scrollTrigger: {
                trigger: '.triad-pin',
                start: `top+=${(i / CARDS.length) * 150}% top`,
                end: `top+=${((i + 0.5) / CARDS.length) * 150}% top`,
                scrub: true,
              },
            },
          );
        });

        // 每帧进入视口中心：插图回落、正文浮现、编号大字 blur 淡入
        CARDS.forEach((card) => {
          const sel = `.triad-card-${card.key}`;
          const st = {
            trigger: sel,
            containerAnimation: scrollTween,
            start: 'left 65%',
            once: true,
          } as ScrollTrigger.Vars;
          gsap.fromTo(
            `${sel} .triad-card-img`,
            { scale: 1.06 },
            { scale: 1, duration: 1.2, ease: 'power2.out', scrollTrigger: st },
          );
          gsap.fromTo(
            `${sel} .triad-card-line`,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', scrollTrigger: { ...st } },
          );
          gsap.fromTo(
            `${sel} .triad-card-glyph`,
            { opacity: 0, filter: 'blur(10px)' },
            { opacity: 0.1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out', scrollTrigger: { ...st } },
          );
        });
      });

      // 移动端：纵向堆叠，各自入场
      mm.add('(max-width: 767px)', () => {
        gsap.utils.toArray<HTMLElement>('.triad-card').forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power2.out',
              scrollTrigger: { trigger: card, start: 'top 80%', once: true },
            },
          );
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <section id="triad" ref={rootRef} className="paper-grain-overlay-dark relative bg-umber text-paper-on-dark">
      <div className="triad-pin flex min-h-[100dvh] flex-col justify-center overflow-hidden py-16 md:h-[100dvh] md:py-0">
        {/* 顶部题签 */}
        <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10">
          <SectionHeading
            index={2}
            title="诗路三叠"
            note="Three Layers"
            intro="一条古道，三重意蕴：其为线性文化遗产之骨，为过岭诗之魂，亦为数字人文之翼。"
            dark
          />
        </div>

        {/* 横向轨道 */}
        <div className="mt-10 md:mt-6">
          <div className="triad-track flex flex-col gap-16 px-6 md:w-max md:flex-row md:items-stretch md:gap-[6vw] md:px-[15vw]">
            {CARDS.map((card) => (
              <article
                key={card.key}
                className={`triad-card triad-card-${card.key} group relative flex flex-col gap-6 md:w-[70vw] md:flex-row md:items-center md:gap-10`}
              >
                {/* 编号大字（半透明 10%） */}
                <span
                  aria-hidden
                  className="triad-card-glyph pointer-events-none absolute -top-10 right-2 z-0 select-none font-brush text-[10rem] leading-none text-paper-on-dark opacity-10 md:text-[16rem]"
                >
                  {card.glyph}
                </span>

                {/* 插图 4:5 */}
                <div className="relative z-[1] overflow-hidden border border-paper-on-dark/15 md:w-[42%]">
                  <div className="aspect-[4/5] w-full">
                    <img
                      src={card.img}
                      alt={card.title}
                      loading="lazy"
                      className="triad-card-img h-full w-full object-cover transition duration-700 group-hover:rotate-[0.5deg] group-hover:scale-[1.03] group-hover:brightness-90"
                    />
                  </div>
                </div>

                {/* 文字区：竖排题字 + 横排正文 */}
                <div className="relative z-[1] flex gap-6 md:w-[52%] md:gap-8">
                  <div className="flex flex-row-reverse items-start gap-3">
                    <h3 className="triad-card-line writing-vertical font-brush text-4xl tracking-[0.12em] text-paper-on-dark md:text-5xl">
                      {card.title}
                    </h3>
                    <span className="triad-card-line writing-vertical mt-1 font-latin text-sm italic tracking-[0.1em] text-gold-leaf">
                      {card.latin}
                    </span>
                  </div>
                  <div className="flex-1 border-l border-paper-on-dark/15 pl-6">
                    {card.text.match(/[^。；]+[。；]/g)?.map((line, i) => (
                      <p
                        key={i}
                        className="triad-card-line font-serif text-[15px] leading-[2.1] tracking-[0.05em] text-paper-on-dark/80 md:text-base"
                      >
                        {line}
                      </p>
                    ))}
                    <span className="triad-card-line mt-4 block font-latin text-xs italic tracking-[0.3em] text-ochre">
                      {card.num} / 叁
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* 底部进度指示（桌面） */}
        <div className="mx-auto mt-12 hidden w-full max-w-[1200px] items-center gap-4 px-10 md:flex">
          {CARDS.map((card) => (
            <span key={card.key} className="triad-dot h-2 w-2 rounded-full" />
          ))}
          <span className="relative h-px flex-1 bg-paper-on-dark/20">
            <span className="triad-progress-fill absolute inset-0 bg-cinnabar" />
          </span>
        </div>
      </div>
    </section>
  );
}
