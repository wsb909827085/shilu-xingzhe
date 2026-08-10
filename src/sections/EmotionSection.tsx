import { useState } from 'react';
import { motion } from 'framer-motion';
import SectionHeading from '@/components/SectionHeading';
import PoemModal from '@/components/PoemModal';
import { SENTIMENT_CURVES, SENTIMENT_DISCLAIMER, smoothPath } from '@/data/map.ts';
import type { Pt } from '@/data/map.ts';
import type { PoemVerse } from '@/data/poets';
import { cn } from '@/lib/utils';

const KAI = "'KaiTi','STKaiti','Noto Serif SC',serif";
const POWER2_INOUT = [0.455, 0.03, 0.515, 0.955] as [number, number, number, number];

/* 坐标几何：viewBox 0 0 1000 560，定性值 -10…+10 */
const X0 = 90;
const X1 = 960;
const Y_MID = 270;
const Y_SCALE = 20; // 每单位心绪 20px
const xi = (i: number) => X0 + (i * (X1 - X0)) / 8;
const yv = (v: number) => Y_MID - v * Y_SCALE;

const PHASE_LABELS = [
  { tick: 1, text: '过岭前' },
  { tick: 4, text: '过岭时' },
  { tick: 7, text: '过岭后' },
];

const BUBBLE_W = 196;
const BUBBLE_H = 50;

/* MAP-AGENT-SCOPE */
/**
 * 情感曲线板块（home.md §5）
 * 四条手绘心绪曲线：描线动画 + 图例 hover 高亮/点击锁定 + 诗句注气泡
 */
export default function EmotionSection() {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);
  const activeId = lockId ?? hoverId;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalPoem, setModalPoem] = useState<PoemVerse | null>(null);
  const [modalPoet, setModalPoet] = useState<string | undefined>();

  const openPoem = (curveId: string) => {
    const c = SENTIMENT_CURVES.find((s) => s.id === curveId);
    if (!c) return;
    setModalPoem(c.verse);
    setModalPoet(`${c.poetName} · ${c.trip}`);
    setModalOpen(true);
  };

  return (
    <section id="sentiment" className="paper-grain-overlay-dark relative bg-umber text-paper-on-dark">
      <div className="mx-auto max-w-[1200px] px-6 py-[clamp(6rem,14vh,10rem)] md:px-10">
        <SectionHeading
          index={4}
          title="情感曲线"
          note="Sentiment Arcs"
          intro="过岭前、过岭时、过岭后——四段行迹，四种心绪。据诗意定性描摹，非量化数据。"
          dark
        />

        {/* 纸色裱纸容器 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 border border-ink/25 bg-paper p-4 text-ink shadow-[0_24px_70px_rgba(20,12,6,0.45)] sm:p-8 md:p-12"
        >
          {/* 图表（移动端横向滑动） */}
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <svg viewBox="0 0 1000 560" className="h-auto w-full">
                <defs>
                  <filter id="axis-wobble" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="11" result="n" />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
                  </filter>
                </defs>

                {/* ---------- 手绘坐标系（0.8s 描出） ---------- */}
                <g filter="url(#axis-wobble)" stroke="#2A1E14" fill="none" strokeLinecap="round">
                  <motion.path
                    d={`M ${X0} 64 L ${X0} 470 L ${X1} 470`}
                    strokeWidth={2.5}
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, margin: '-15% 0px' }}
                    transition={{ duration: 0.8, ease: POWER2_INOUT }}
                  />
                  {/* 中线「平」 */}
                  <motion.line
                    x1={X0}
                    y1={Y_MID}
                    x2={X1}
                    y2={Y_MID}
                    strokeWidth={1.5}
                    strokeDasharray="8 8"
                    opacity={0.4}
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, margin: '-15% 0px' }}
                    transition={{ duration: 0.8, delay: 0.3, ease: POWER2_INOUT }}
                  />
                  {/* 9 个刻度 */}
                  {Array.from({ length: 9 }, (_, i) => (
                    <motion.line
                      key={i}
                      x1={xi(i)}
                      y1={464}
                      x2={xi(i)}
                      y2={476}
                      strokeWidth={1.5}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 0.7 }}
                      viewport={{ once: true, margin: '-15% 0px' }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.04 }}
                    />
                  ))}
                </g>

                {/* ---------- 轴题与标注 ---------- */}
                <g style={{ fontFamily: KAI }} fill="#5B4632">
                  <text x={48} y={120} fontSize={22} style={{ fontFamily: KAI, writingMode: 'vertical-rl' }}>
                    心緒
                  </text>
                  <text x={X0 + 10} y={58} fontSize={16}>
                    曠達 / 欣然
                  </text>
                  <text x={X0 + 10} y={500} fontSize={16}>
                    沉鬱 / 哀痛
                  </text>
                  <text x={X0 - 14} y={Y_MID + 5} fontSize={15} textAnchor="end">
                    平
                  </text>
                  {PHASE_LABELS.map((p) => (
                    <text key={p.text} x={xi(p.tick)} y={505} fontSize={19} textAnchor="middle" fill="#3E2C1D">
                      {p.text}
                    </text>
                  ))}
                </g>

                {/* ---------- 四条心绪曲线（各 2s，stagger 0.5s） ---------- */}
                {SENTIMENT_CURVES.map((c, i) => {
                  const pts: Pt[] = c.values.map((v, j) => [xi(j), yv(v)]);
                  const dim = activeId !== null && activeId !== c.id;
                  const hot = activeId === c.id;
                  return (
                    <motion.path
                      key={c.id}
                      d={smoothPath(pts)}
                      fill="none"
                      stroke={c.color}
                      strokeWidth={hot ? 4.5 : 3}
                      strokeLinecap="round"
                      strokeDasharray={c.dashed ? '12 9' : undefined}
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, margin: '-15% 0px' }}
                      transition={{ duration: 2, delay: 0.8 + i * 0.5, ease: POWER2_INOUT }}
                      style={{
                        opacity: dim ? 0.15 : 1,
                        transition: 'opacity 0.35s ease, stroke-width 0.25s ease',
                        filter: hot ? 'drop-shadow(0 0 6px rgba(168,58,42,0.25))' : undefined,
                      }}
                    />
                  );
                })}

                {/* ---------- 关键点注释气泡（pop stagger 0.2s） ---------- */}
                {SENTIMENT_CURVES.map((c, i) => {
                  const px = xi(c.annotation.tick);
                  const py = yv(c.values[c.annotation.tick]);
                  const bx = px + c.annotation.dx;
                  const by = py + c.annotation.dy;
                  const [l1, l2] = c.annotation.text.split('，');
                  const dim = activeId !== null && activeId !== c.id;
                  return (
                    <motion.g
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: '-15% 0px' }}
                      transition={{ delay: 3.0 + i * 0.2, type: 'spring', stiffness: 320, damping: 20 }}
                      style={{ transformOrigin: `${px}px ${py}px` }}
                      className="cursor-pointer"
                      onClick={() => openPoem(c.id)}
                    >
                      <g
                        style={{
                          opacity: dim ? 0.15 : 1,
                          transition: 'opacity 0.35s ease',
                        }}
                      >
                        {/* 朱砂引线 */}
                        <line x1={px} y1={py} x2={bx + BUBBLE_W / 2} y2={by + BUBBLE_H / 2} stroke="#A83A2A" strokeWidth={1.2} opacity={0.65} />
                        <circle cx={px} cy={py} r={4} fill="#A83A2A" />
                        {/* 小纸签 */}
                        <rect
                          x={bx}
                          y={by}
                          width={BUBBLE_W}
                          height={BUBBLE_H}
                          fill="#E6D9BE"
                          stroke="#2A1E14"
                          strokeOpacity={0.35}
                        />
                        <text x={bx + BUBBLE_W / 2} y={by + 21} fontSize={14} textAnchor="middle" fill="#2A1E14" style={{ fontFamily: KAI }}>
                          {l1}，
                        </text>
                        <text x={bx + BUBBLE_W / 2} y={by + 40} fontSize={14} textAnchor="middle" fill="#2A1E14" style={{ fontFamily: KAI }}>
                          {l2}
                        </text>
                      </g>
                    </motion.g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 图例：hover 高亮 / 点击锁定 */}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/15 pt-6">
            {SENTIMENT_CURVES.map((c) => {
              const locked = lockId === c.id;
              const hot = activeId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setLockId(locked ? null : c.id)}
                  className={cn(
                    'flex items-center gap-3 border px-4 py-2.5 transition-all duration-300',
                    locked
                      ? 'border-cinnabar bg-cinnabar/10'
                      : hot
                        ? 'border-ink/40 bg-paper-deep'
                        : 'border-ink/15 bg-paper-deep/50 hover:border-ink/40',
                  )}
                >
                  {/* 色样 */}
                  <svg width="34" height="8" className="shrink-0">
                    <line
                      x1="1"
                      y1="4"
                      x2="33"
                      y2="4"
                      stroke={c.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={c.dashed ? '7 5' : undefined}
                    />
                  </svg>
                  <span className="font-serif text-sm tracking-[0.1em] text-ink">
                    {c.poetName} · {c.trip}
                  </span>
                  {/* 小印章 */}
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-[4px] font-brush text-sm leading-none',
                      locked ? 'bg-cinnabar text-paper' : 'border border-cinnabar/60 text-cinnabar',
                    )}
                  >
                    {c.sealChar}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 免责标注 */}
          <p className="mt-6 text-right font-serif text-[0.78rem] leading-[1.9] tracking-[0.08em] text-ink-soft">
            {SENTIMENT_DISCLAIMER}
          </p>
        </motion.div>
      </div>

      <PoemModal open={modalOpen} onOpenChange={setModalOpen} poem={modalPoem} poetName={modalPoet} place="过岭心绪" />
    </section>
  );
}
