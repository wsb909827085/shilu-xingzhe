import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './Navbar';
import Footer from './Footer';
import InkCursor from './InkCursor';

gsap.registerPlugin(ScrollTrigger);

/**
 * 全站布局（children 模式：App 用 <Layout><Routes/></Layout> 包裹）
 * - Lenis 平滑滚动 lerp 0.09，与 GSAP ScrollTrigger 同步
 * - Navbar 为 fixed 覆盖式，Layout 不为内容加偏移（首屏全出血；后续板块自带大 padding）
 */
export default function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <InkCursor />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
