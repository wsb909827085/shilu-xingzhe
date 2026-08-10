import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import Layout from './components/Layout';

/* 路由级代码拆分：长卷主站首屏直出，其余页面懒加载。
   地图页（含 Leaflet）与后台体积大，按需加载可显著降低首屏体积。 */
import ScrollHome from './pages/ScrollHome';

const Poets = lazy(() => import('./pages/Poets'));
const MapHome = lazy(() => import('./pages/Home'));
const Admin = lazy(() => import('./pages/Admin'));
const ContentAdmin = lazy(() => import('./pages/ContentAdmin'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));

/* 仅长卷主站路由（/ 与 /poets）套 scroll Layout（Navbar + Footer + InkCursor + Lenis）；
   /map、/admin、/map-admin、/login 渲染裸页面——它们自带界面框架，
   且 Lenis 会与 Leaflet 冲突。 */
const SCROLL_PREFIXES = ['/', '/poets'];

function useIsScrollRoute() {
  const { pathname } = useLocation();
  return SCROLL_PREFIXES.some((p) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p),
  );
}

function PageFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#efe6cf',
        color: '#8a7a54',
        fontFamily: '"Noto Serif SC", serif',
        letterSpacing: '2px',
      }}
    >
      加载中…
    </div>
  );
}

function AppRoutes() {
  const isScroll = useIsScrollRoute();

  const routes = (
    <Routes>
      <Route path="/" element={<ScrollHome />} />
      <Route path="/poets" element={<Poets />} />
      <Route path="/map" element={<MapHome />} />
      <Route path="/admin" element={<ContentAdmin />} />
      <Route path="/map-admin" element={<Admin />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  /* Layout 在 / ⇄ /poets 间保持挂载（Lenis/GSAP 不重建），
     进入裸页面路由时整体卸载 */
  return isScroll ? <Layout>{routes}</Layout> : routes;
}

function App() {
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = 'zh-CN';
    document.title = location.pathname.startsWith('/map')
      ? '诗路行者 · 数字地图'
      : '诗路行者——大庾岭贬谪诗人数字地图';
  }, [location.pathname]);

  return (
    <Suspense fallback={<PageFallback />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;
