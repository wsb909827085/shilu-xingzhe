import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import MapView from '@/components/MapView';
import type { PoetView } from '@/components/MapView';
import { useContent } from '@/hooks/useContent';
import { useSwipe } from '@/hooks/useSwipe';
import type { MapNode } from '@db/schema';
import { cn } from '@/lib/utils';

/* 稳定 noop（模块级常量，引用永不变化）：MapView 回调走 cbRef，
   此处再保证身份稳定，杜绝任何 effect 重启风险 */
const NOOP = () => {};

const EMPTY_TOUR_STOPS = new Map<string, string>();

/**
 * 行迹板块（序号叁 · 锚点 #map）
 * 内嵌完整数字地图（Leaflet）：15 位诗人印章选择条 + 受控 selectedPoet
 * + 「进入完整行迹地图」CTA → /map
 */
export default function MapEmbedSection() {
  const { content } = useContent();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  /* 未手动选择时默认第一位诗人（派生值，无需 effect） */
  const selectedPoet = selectedSlug ?? content.poets[0]?.slug ?? null;

  /* 稳定引用：content 来自 useContent（query.data / useMemo fallback），
     映射结果用 useMemo 固定身份，避免 MapView 绘制 effect 反复重启 */
  const poetsView = useMemo<PoetView[]>(
    () =>
      content.poets.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        dynasty: p.dynasty,
        color: p.color,
        route: p.route,
      })),
    [content.poets],
  );
  const nodes = useMemo<MapNode[]>(
    () =>
      content.nodes.map((n) => ({
        id: n.id,
        slug: n.slug,
        name: n.name,
        lon: n.lon,
        lat: n.lat,
        highlight: n.highlight,
        note: n.note,
        source: null,
        sortOrder: 0,
        createdAt: new Date(0),
      })),
    [content.nodes],
  );

  /* 选择诗人：useCallback 固定引用 */
  const onSelectPoet = useCallback((slug: string) => setSelectedSlug(slug), []);

  /* 左右滑动切换诗人（无定时自动切换，纯手动点选 + 滑动手势） */
  const stepPoet = useCallback(
    (dir: 1 | -1) => {
      const list = content.poets;
      if (list.length === 0) return;
      const cur = list.findIndex((p) => p.slug === selectedPoet);
      const next = (cur + dir + list.length) % list.length;
      setSelectedSlug(list[next].slug);
    },
    [content.poets, selectedPoet],
  );
  const swipe = useSwipe({
    onSwipeLeft: () => stepPoet(1),
    onSwipeRight: () => stepPoet(-1),
  });

  return (
    <section id="map" className="paper-grain-overlay relative bg-paper">
      <div className="divider-rail mx-auto max-w-[1200px]" />
      <div className="mx-auto max-w-[1440px] px-4 py-[clamp(6rem,14vh,10rem)] md:px-10">
        <SectionHeading
          index={3}
          title="行迹地图"
          note="The Map · 唐宋贬谪诗人过岭行迹"
          intro="十五位唐宋诗人，自长江—赣江溯流而上，翻越大庾岭梅关，沿浈水—北江南下。择一位诗人，观其过岭行迹于真实山川之间浮现。"
        />

        {/* 诗人选择栏：印章式按钮（可横向滚动 / 左右滑动切换） */}
        <div
          {...swipe}
          className="mt-14 flex select-none gap-3 overflow-x-auto pb-3 [touch-action:pan-y] md:flex-wrap md:justify-center"
        >
          {content.poets.map((poet) => {
            const active = poet.slug === selectedPoet;
            return (
              <button
                key={poet.slug}
                type="button"
                aria-label={`选择${poet.name}`}
                title={`${poet.name} · ${poet.dynasty}`}
                onClick={() => setSelectedSlug(poet.slug)}
                className={cn(
                  'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-md border transition-all duration-300',
                  active
                    ? 'scale-[1.08] border-cinnabar bg-cinnabar text-paper shadow-[0_6px_18px_rgba(168,58,42,0.35)]'
                    : 'border-ink/30 bg-paper-deep/60 text-ink hover:border-cinnabar/60 hover:bg-cinnabar/10 hover:text-cinnabar',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="poet-seal-ring"
                    className="pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-cinnabar/50"
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  />
                )}
                <span className="font-brush text-2xl leading-none">{poet.name.charAt(0)}</span>
              </button>
            );
          })}
          <span className="ml-2 hidden items-center font-serif text-xs tracking-[0.25em] text-ink-soft md:flex">
            择一诗人 · 观其过岭
          </span>
        </div>

        {/* 内嵌数字地图：纸色卡片容器（Leaflet 需要明确高度） */}
        <div className="mt-8 overflow-hidden rounded-md border border-ink/15 bg-paper-deep/50 p-2 shadow-[0_18px_60px_rgba(36,24,16,0.18)]">
          <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-sm">
            <MapView
              poets={poetsView}
              nodes={nodes}
              selectedPoet={selectedPoet}
              comparePoet={null}
              baseLayer="gaode"
              tour={false}
              tourStops={EMPTY_TOUR_STOPS}
              poems={[]}
              onTourEnd={NOOP}
              onTourProgress={NOOP}
              onTourPlaying={NOOP}
              onTileFail={NOOP}
              onSelectPoet={onSelectPoet}
              onSelectNode={NOOP}
              onNodeCard={NOOP}
              theme="silk"
              ambient={false}
            />
          </div>
        </div>

        {/* CTA：进入完整行迹地图 */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/map"
            data-cursor-label="图"
            className="group flex items-center gap-3 border border-cinnabar/60 bg-cinnabar/10 px-8 py-3.5 font-serif text-[15px] tracking-[0.25em] text-cinnabar transition-all duration-300 hover:bg-cinnabar hover:text-paper hover:shadow-[0_10px_28px_rgba(168,58,42,0.35)]"
          >
            进入完整行迹地图
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
