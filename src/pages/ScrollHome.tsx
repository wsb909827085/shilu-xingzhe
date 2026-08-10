import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Preloader from '@/components/Preloader';
import Hero from '@/sections/Hero';
import OriginSection from '@/sections/OriginSection';
import TriadSection from '@/sections/TriadSection';
import MapEmbedSection from '@/sections/MapEmbedSection';
import EmotionSection from '@/sections/EmotionSection';

/* Preloader 展卷动画仅在每个会话首次访问 / 时播放 */
const PRELOADER_KEY = 'shilu-preloader-done';

function scrollToEl(el: HTMLElement | null, smooth = true) {
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(el, { offset: -80 });
  else el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * 长卷主站主页（/）：Preloader → 首屏 → 项目缘起 → 诗路三叠 → 行迹地图（内嵌数字地图）→ 情感曲线
 */
export default function ScrollHome() {
  const [revealed, setRevealed] = useState(() => {
    try {
      return sessionStorage.getItem(PRELOADER_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();

  const markRevealed = () => {
    try {
      sessionStorage.setItem(PRELOADER_KEY, '1');
    } catch {
      /* 私密模式等场景下 sessionStorage 不可写，忽略 */
    }
    setRevealed(true);
  };

  // 深链：/?poet=<id>（档案页回链）或 /#<anchor>（导航跨页锚点），展卷后滚动到位
  useEffect(() => {
    if (!revealed) return;
    const q = new URLSearchParams(window.location.search).get('poet');
    const hash = location.hash ? location.hash.slice(1) : '';
    const target = q ? 'map' : hash;
    if (!target) return;
    const timer = setTimeout(() => scrollToEl(document.getElementById(target)), 600);
    return () => clearTimeout(timer);
  }, [revealed, location.hash, location.key]);

  return (
    <>
      {!revealed && <Preloader onComplete={markRevealed} />}
      <Hero active={revealed} />
      <OriginSection />
      <TriadSection />
      <MapEmbedSection />
      <EmotionSection />
    </>
  );
}
