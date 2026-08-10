import { memo, useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from 'framer-motion';

/**
 * 墨点光标（design.md §7）
 * - 默认：12px 墨点（--ink 60%），120ms 延迟拖尾圆环
 * - 悬停可交互元素：朱砂色放大至 28px，可显示小字（data-cursor-label）
 * - 移动端（触摸设备 / 窄屏）禁用
 */
function isTouchDevice() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
  );
}

const InkCursor = memo(function InkCursor() {
  const [enabled] = useState(() => !isTouchDevice());
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState('');

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // 拖尾圆环：弹性跟随 ≈ 120ms 延迟感
  const ringX = useSpring(x, { stiffness: 240, damping: 24, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 240, damping: 24, mass: 0.6 });

  const labelRef = useRef('');

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('ink-cursor-active');

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest(
        'a, button, [role="button"], [data-cursor]',
      );
      setHovering(!!interactive);
      const nextLabel =
        (interactive as HTMLElement | null)?.dataset?.cursorLabel ??
        target?.closest('[data-cursor-label]')?.getAttribute('data-cursor-label') ??
        '';
      if (labelRef.current !== nextLabel) {
        labelRef.current = nextLabel;
        setLabel(nextLabel);
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.classList.remove('ink-cursor-active');
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* 墨点 */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] flex items-center justify-center rounded-full"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: hovering ? 28 : 12,
          height: hovering ? 28 : 12,
          backgroundColor: hovering
            ? 'rgba(168, 58, 42, 0.85)'
            : 'rgba(42, 30, 20, 0.6)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <AnimatePresence>
          {hovering && label && (
            <motion.span
              key={label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="select-none font-serif text-[10px] leading-none text-paper-on-dark"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      {/* 拖尾圆环 */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[99] rounded-full border"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: 'rgba(42, 30, 20, 0.35)',
        }}
        animate={{ width: hovering ? 44 : 30, height: hovering ? 44 : 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      />
    </>
  );
});

export default InkCursor;
