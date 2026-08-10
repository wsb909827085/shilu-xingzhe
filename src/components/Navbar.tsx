import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { id: 'origin', label: '缘起' },
  { id: 'triad', label: '三叠' },
  { id: 'map', label: '行迹' },
  { id: 'sentiment', label: '心绪' },
] as const;

/**
 * 顶部导航（design.md §8.2）
 * - 滚动 <100vh：透明，印章 logo + 右侧竖排小字
 * - 滚动 >100vh：纸色 95% + 界栏线 + 阴影，锚点链接 scroll-spy 朱砂指示点
 * - 移动端：全屏深褐抽屉，链接竖排大字 stagger 入场
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // scroll-spy：基于滚动位置计算当前板块（对 pin 板块与长板块更稳健）
  useEffect(() => {
    if (!isHome) {
      setActive('');
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.scrollY + window.innerHeight * 0.4;
      let current = '';
      for (const link of NAV_LINKS) {
        const el = document.getElementById(link.id);
        if (!el) continue;
        // getBoundingClientRect().top + scrollY 对 pin spacer 同样成立
        if (el.getBoundingClientRect().top + window.scrollY <= line) current = link.id;
      }
      // 滚过最后一个板块底部后清除高亮（页脚区域）
      const last = document.getElementById(NAV_LINKS[NAV_LINKS.length - 1].id);
      if (last && last.getBoundingClientRect().bottom < window.innerHeight * 0.4) current = '';
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isHome]);

  const scrollToAnchor = (id: string) => {
    setDrawerOpen(false);
    const doScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.4 });
      else window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    };
    if (!isHome) {
      /* 非首页：携带哈希回到首页，由首页展卷后统一滚动（见 ScrollHome 的 hash 深链处理） */
      navigate(`/#${id}`);
    } else {
      doScroll();
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled || !isHome
            ? 'border-b border-ink/15 bg-paper/95 shadow-[0_2px_16px_rgba(36,24,16,0.12)] backdrop-blur-sm'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:h-[72px] md:px-10">
          {/* 左：印章 + 站名 */}
          <Link
            to="/"
            className="flex items-center gap-3"
            data-cursor-label="览"
            onClick={() => setDrawerOpen(false)}
          >
            <img src="/seal-logo.svg" alt="诗路印章" className="h-10 w-10 md:h-12 md:w-12" />
            <span
              className={cn(
                'font-brush text-2xl tracking-brush transition-colors duration-500 md:text-3xl',
                scrolled || !isHome ? 'text-ink' : 'text-paper-on-dark',
              )}
            >
              诗路行者
            </span>
          </Link>

          {/* 右：桌面锚点 */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToAnchor(link.id)}
                className={cn(
                  'relative pb-2 font-serif text-[15px] tracking-[0.2em] transition-colors duration-300',
                  scrolled || !isHome
                    ? 'text-ink-soft hover:text-cinnabar'
                    : 'text-paper-on-dark/85 hover:text-paper-on-dark',
                )}
              >
                {link.label}
                {active === link.id && (
                  <motion.span
                    layoutId="nav-spy-dot"
                    className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cinnabar"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            ))}
            <Link
              to="/poets"
              data-cursor-label="览"
              className={cn(
                'relative pb-2 font-serif text-[15px] tracking-[0.2em] transition-colors duration-300',
                location.pathname === '/poets'
                  ? 'text-cinnabar'
                  : scrolled || !isHome
                    ? 'text-ink-soft hover:text-cinnabar'
                    : 'text-paper-on-dark/85 hover:text-paper-on-dark',
              )}
            >
              诗笺
              {location.pathname === '/poets' && (
                <motion.span
                  layoutId="nav-spy-dot"
                  className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cinnabar"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
            <Link
              to="/map"
              data-cursor-label="图"
              className={cn(
                'relative pb-2 font-serif text-[15px] tracking-[0.2em] transition-colors duration-300',
                location.pathname === '/map'
                  ? 'text-cinnabar'
                  : scrolled || !isHome
                    ? 'text-cinnabar hover:text-cinnabar-deep'
                    : 'text-gold-leaf hover:text-paper-on-dark',
              )}
            >
              行迹全图
              {location.pathname === '/map' && (
                <motion.span
                  layoutId="nav-spy-dot"
                  className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cinnabar"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
            {/* 竖排小字（仅首屏透明态展示） */}
            {!scrolled && isHome && (
              <span className="writing-vertical hidden h-28 font-serif text-[11px] tracking-[0.3em] text-paper-on-dark/50 lg:block">
                唐宋贬谪诗人过大庾岭行迹数字地图
              </span>
            )}
          </nav>

          {/* 移动端汉堡 */}
          <button
            type="button"
            aria-label="打开菜单"
            className={cn(
              'md:hidden',
              scrolled || !isHome ? 'text-ink' : 'text-paper-on-dark',
            )}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* 移动端全屏抽屉 */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="paper-grain-overlay-dark fixed inset-0 z-[60] bg-umber-deep"
          >
            <button
              type="button"
              aria-label="关闭菜单"
              className="absolute right-5 top-5 text-paper-on-dark/80"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-7 w-7" />
            </button>
            <div className="flex h-full items-center justify-center gap-10">
              {[...NAV_LINKS, { id: 'poets', label: '诗笺' }, { id: 'fullmap', label: '全图' }].map((link, i) => (
                <motion.button
                  key={link.id}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.5 }}
                  className="writing-vertical font-brush text-4xl tracking-[0.25em] text-paper-on-dark"
                  onClick={() => {
                    if (link.id === 'poets') {
                      setDrawerOpen(false);
                      navigate('/poets');
                    } else if (link.id === 'fullmap') {
                      setDrawerOpen(false);
                      navigate('/map');
                    } else {
                      scrollToAnchor(link.id);
                    }
                  }}
                >
                  {link.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
