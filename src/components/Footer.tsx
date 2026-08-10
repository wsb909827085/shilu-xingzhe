import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowUpRight } from 'lucide-react';

const ANCHORS = [
  { id: 'origin', label: '项目缘起' },
  { id: 'triad', label: '诗路三叠' },
  { id: 'map', label: '行迹地图' },
  { id: 'sentiment', label: '情感曲线' },
] as const;

/**
 * 页脚（design.md §8.5）
 * 焦茶底、纸色文字、三栏结构 + 梅枝横贯 + 底部版权行
 */
export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const scrollToAnchor = (id: string) => {
    const doScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth' });
    };
    if (!isHome) {
      /* 非首页：携带哈希回到首页，由首页展卷后统一滚动 */
      navigate(`/#${id}`);
    } else {
      doScroll();
    }
  };

  return (
    <footer className="paper-grain-overlay-dark relative overflow-hidden bg-umber-deep text-paper-on-dark">
      {/* 顶部梅枝横贯 */}
      <div className="pointer-events-none flex justify-center pt-8 opacity-70">
        <img src="/plum-branch.svg" alt="" className="w-[min(480px,80vw)]" loading="lazy" />
      </div>

      <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-12 md:px-10">
        <div className="grid gap-12 md:grid-cols-3">
          {/* ① 印章 + 全称 + 题辞 */}
          <div>
            <div className="flex items-center gap-3">
              <img src="/seal-logo.svg" alt="诗路印章" className="h-12 w-12" loading="lazy" />
              <div className="font-serif text-sm leading-relaxed tracking-[0.12em] text-paper-on-dark/85">
                诗路行者
                <br />
                <span className="text-paper-on-dark/60">
                  唐宋贬谪诗人过大庾岭行迹数字地图
                </span>
              </div>
            </div>
            <p className="mt-6 font-brush text-3xl tracking-brush text-paper-on-dark">
              岭上梅花，诗里行人
            </p>
          </div>

          {/* ② 站内锚点 + 档案页 */}
          <nav className="flex flex-col gap-3 font-serif text-sm tracking-[0.15em]">
            <span className="mb-1 text-xs tracking-[0.3em] text-gold-leaf">站内导航</span>
            {ANCHORS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => scrollToAnchor(a.id)}
                className="w-fit text-paper-on-dark/75 transition-colors hover:text-cinnabar"
              >
                {a.label}
              </button>
            ))}
            <Link
              to="/poets"
              data-cursor-label="览"
              className="mt-2 flex w-fit items-center gap-1 text-paper-on-dark transition-colors hover:text-cinnabar"
            >
              诗人行迹档案
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/map"
              data-cursor-label="图"
              className="flex w-fit items-center gap-1 text-cinnabar transition-colors hover:text-gold-leaf"
            >
              行迹全图（数字地图）
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </nav>

          {/* ③ 项目说明 */}
          <div className="font-serif text-xs leading-[2.1] tracking-[0.08em] text-paper-on-dark/55">
            <span className="mb-2 block text-xs tracking-[0.3em] text-gold-leaf">项目说明</span>
            本网站为数字人文演示项目，地图为手绘示意图（参照 CHGIS
            历史地理数据），情感曲线为定性示意数据，不作学术引用依据。
          </div>
        </div>

        <div className="mt-12 border-t border-paper-on-dark/15 pt-6 text-center font-serif text-xs tracking-[0.2em] text-paper-on-dark/45">
          © 2025 诗路行者 · 数字人文
        </div>
      </div>
    </footer>
  );
}
