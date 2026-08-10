import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { POETS, getPoet } from '@/data/poets';
import PoetsHero from '@/components/poets/PoetsHero';
import PoetChapterNav from '@/components/poets/PoetChapterNav';
import PoetChapter from '@/components/poets/PoetChapter';
import PoemWall from '@/components/poets/PoemWall';
import { cn } from '@/lib/utils';

const ANTHOLOGY_ID = 'poems';
/** sticky 目录（~88px）+ 顶栏（64px）的滚动偏移 */
const SCROLL_OFFSET = -150;

/* POETS-AGENT-SCOPE */
/**
 * 诗人行迹档案页（poets.md）
 * 紧凑 Hero → 印章式 sticky 章节导航（scroll-spy）→ 六位诗人深浅交替档案长卷
 * （章间鱼尾界栏）→ 「过岭诗笺」横向诗墙。支持深链 ?poet=<id> 直抵对应章节。
 * 数据全部来自 @/data/poets。
 */
export default function Poets() {
  const [searchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string>(POETS[0].id);

  const scrollToEl = useCallback((el: HTMLElement | null, offset: number = SCROLL_OFFSET) => {
    if (!el) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
    if (lenis) {
      lenis.scrollTo(el, { offset, duration: 1.4 });
    } else {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
    }
  }, []);

  const scrollToPoet = useCallback(
    (poetId: string) => scrollToEl(document.getElementById(`poet-${poetId}`)),
    [scrollToEl],
  );

  // 深链支持：?poet=<id> 滚动到对应章节；无参则回卷首
  useEffect(() => {
    const target = searchParams.get('poet');
    if (target && getPoet(target)) {
      const timer = window.setTimeout(() => scrollToPoet(target), 450);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [searchParams, scrollToPoet]);

  // scroll-spy：监听六章与诗笺墙
  useEffect(() => {
    const ids = [...POETS.map((p) => `poet-${p.id}`), ANTHOLOGY_ID];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id === ANTHOLOGY_ID ? ANTHOLOGY_ID : entry.target.id.replace(/^poet-/, ''));
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-paper">
      {/* §1 页头 Hero（紧凑 60vh） */}
      <PoetsHero />

      {/* §2 人物选择器（sticky 印章目录 + scroll-spy） */}
      <PoetChapterNav
        activeId={activeId}
        onSelect={scrollToPoet}
        onAnthology={() => scrollToEl(document.getElementById(ANTHOLOGY_ID), -100)}
      />

      {/* §3 六人档案章节（深浅交替，章间鱼尾界栏） */}
      <div id="archives">
        {POETS.map((poet, i) => (
          <Fragment key={poet.id}>
            <PoetChapter poet={poet} index={i} />
            {i < POETS.length - 1 && (
              <div className={cn('divider-rail', i % 2 === 0 ? 'bg-paper' : 'bg-paper-deep')} />
            )}
          </Fragment>
        ))}
      </div>

      {/* §4 过岭诗笺全集（横向诗墙） */}
      <PoemWall />
    </div>
  );
}
