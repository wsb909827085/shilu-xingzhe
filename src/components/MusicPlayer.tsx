import { useEffect, useRef, useState } from "react";
import { Music, SkipForward } from "lucide-react";

/**
 * 背景音乐：WebAudio 实时合成古风曲调，六首循环（三舒缓 + 三明快）。
 * 无需外部音频资源，体积为零，天然可离线播放。
 * 播放器实例挂在 AiChat 外层，打开/关闭聊天窗口不影响播放状态。
 * 浏览器自动播放策略要求首次用户交互后才能出声：
 * 进入网站后第一次点击/触摸/按键即自动开播。
 */

const TRACKS = ["幽兰", "忆故人", "梅花引", "阳关三叠·急", "竹枝词", "岭上谣"];

/* 五声音阶频率（D 调系统） */
const N = {
  D2: 73.42, E2: 82.41, G2: 98.0, A2: 110.0,
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, A4: 440.0,
};

type Note = [freqs: number[], dur: number];

const MELODIES: Note[][] = [
  /* 幽兰 */
  [
    [[N.D2], 1.6], [[N.A2], 1.4], [[N.C3], 1.6], [[N.D3], 1.2],
    [[N.E3], 1.4], [[N.D3], 1.0], [[N.C3], 1.6], [[N.A2], 1.4],
    [[N.D2, N.A2 * 0.5], 2.0], [[N.G2], 1.4], [[N.A2], 1.2], [[N.C3], 1.6],
    [[N.D3], 1.6], [[N.E3, N.G3 * 0.5], 2.0], [[N.D3], 1.4], [[N.A2], 2.2],
  ],
  /* 忆故人 */
  [
    [[N.C3], 1.4], [[N.E3], 1.2], [[N.G3], 1.6], [[N.E3], 1.2],
    [[N.D3], 1.4], [[N.C3], 1.6], [[N.A2], 1.4], [[N.G2], 1.6],
    [[N.C3], 1.6], [[N.D3], 1.2], [[N.E3], 1.6], [[N.G3, N.E3 * 0.5], 1.8],
    [[N.A3], 1.4], [[N.G3], 1.2], [[N.E3], 1.6], [[N.C3], 2.4],
  ],
  /* 梅花引 */
  [
    [[N.G3], 1.0], [[N.A3], 0.9], [[N.D4], 1.4], [[N.C4], 1.0],
    [[N.A3], 1.2], [[N.G3], 1.0], [[N.E3], 1.4], [[N.D3], 1.2],
    [[N.G3], 1.2], [[N.A3], 1.0], [[N.C4, N.E4 * 0.5], 1.6], [[N.D4], 1.2],
    [[N.C4], 1.0], [[N.A3], 1.2], [[N.G3, N.D3 * 0.5], 2.4],
  ],
  /* 阳关三叠·急：节奏明快的行旅曲 */
  [
    [[N.D3], 0.5], [[N.E3], 0.5], [[N.G3], 0.6], [[N.A3], 0.5],
    [[N.D4], 0.6], [[N.A3], 0.5], [[N.G3], 0.6], [[N.E3], 0.5],
    [[N.D3, N.A2 * 0.5], 0.7], [[N.G3], 0.5], [[N.A3], 0.5], [[N.C4], 0.6],
    [[N.D4], 0.5], [[N.E4], 0.6], [[N.D4], 0.5], [[N.A3, N.E3 * 0.5], 1.0],
  ],
  /* 竹枝词：巴渝民歌风的轻快节奏 */
  [
    [[N.A3], 0.5], [[N.G3], 0.4], [[N.A3], 0.5], [[N.C4], 0.6],
    [[N.D4], 0.5], [[N.C4], 0.4], [[N.A3], 0.6], [[N.G3], 0.5],
    [[N.E3], 0.5], [[N.G3], 0.4], [[N.A3], 0.6], [[N.E3], 0.5],
    [[N.D3], 0.5], [[N.E3], 0.4], [[N.G3], 0.5], [[N.A2], 1.2],
  ],
  /* 岭上谣：翻山越岭的昂扬快板 */
  [
    [[N.G3], 0.45], [[N.A3], 0.45], [[N.D4], 0.5], [[N.D4], 0.45],
    [[N.C4], 0.5], [[N.A3], 0.45], [[N.G3], 0.5], [[N.A3], 0.45],
    [[N.D4, N.G3 * 0.5], 0.6], [[N.E4], 0.5], [[N.D4], 0.45], [[N.C4], 0.5],
    [[N.A3], 0.45], [[N.G3], 0.5], [[N.E3], 0.45], [[N.D3, N.G2 * 0.5], 1.1],
  ],
];

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const stopFlagRef = useRef(false);
  const playTrackRef = useRef<(idx: number) => void>(() => {});

  const stopAll = () => {
    stopFlagRef.current = true;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.gain.cancelScheduledValues(0);
      gainRef.current.gain.setTargetAtTime(0, ctxRef.current!.currentTime, 0.15);
    }
    setPlaying(false);
  };

  const pluck = (ctx: AudioContext, dest: GainNode, freq: number, when: number, amp: number) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.28;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
    osc.connect(g);
    osc2.connect(g2).connect(g);
    g.connect(dest);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + 1.7);
    osc2.stop(when + 1.7);
  };

  const playTrack = (idx: number) => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = 0.5;
      gainRef.current.connect(ctxRef.current.destination);
    }
    const ctx = ctxRef.current;
    void ctx.resume();
    if (gainRef.current) {
      gainRef.current.gain.cancelScheduledValues(0);
      gainRef.current.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2);
    }
    stopFlagRef.current = false;
    setTrack(idx);
    setPlaying(true);

    const melody = MELODIES[idx % MELODIES.length];
    let t = ctx.currentTime + 0.1;
    for (const [freqs, dur] of melody) {
      freqs.forEach((f, i) => pluck(ctx, gainRef.current!, f, t, i === 0 ? 0.32 : 0.18));
      t += dur * 0.62 + 0.02;
    }
    /* 曲目结束后播下一首 */
    const totalMs = (t - ctx.currentTime) * 1000 + 800;
    timerRef.current = window.setTimeout(() => {
      if (!stopFlagRef.current) playTrack((idx + 1) % MELODIES.length);
    }, totalMs);
  };

  const toggle = () => {
    if (playing) {
      stopAll();
    } else {
      playTrack(track);
    }
  };

  const next = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    playTrack((track + 1) % MELODIES.length);
  };

  /* 自动播放：浏览器要求首次用户交互后才能出声，
     进入网站后第一次点击/触摸/按键即开播（一次性监听） */
  useEffect(() => {
    playTrackRef.current = playTrack;
  });
  useEffect(() => {
    const autoStart = () => {
      playTrackRef.current(0);
      window.removeEventListener("pointerdown", autoStart);
      window.removeEventListener("keydown", autoStart);
      window.removeEventListener("touchstart", autoStart);
    };
    window.addEventListener("pointerdown", autoStart, { once: true });
    window.addEventListener("keydown", autoStart, { once: true });
    window.addEventListener("touchstart", autoStart, { once: true });
    return () => {
      window.removeEventListener("pointerdown", autoStart);
      window.removeEventListener("keydown", autoStart);
      window.removeEventListener("touchstart", autoStart);
      stopFlagRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/50 bg-[#f6f1e3]/80 py-1 pl-3 pr-1 shadow-lg backdrop-blur-md">
      <Music className={`h-3.5 w-3.5 text-[#6b5d3f] ${playing ? "animate-pulse" : ""}`} />
      <span className="max-w-[72px] truncate text-[11px] text-[#6b5d3f]">
        {playing ? TRACKS[track] : "古乐"}
      </span>
      <button
        onClick={toggle}
        aria-label={playing ? "暂停音乐" : "播放音乐"}
        title={playing ? "暂停" : "播放"}
        className="rounded-full p-1.5 text-[#4a3f2a] transition hover:bg-[#e7dcc0]"
      >
        {playing ? (
          <span className="flex h-3.5 w-3.5 items-center justify-center gap-[3px]">
            <span className="h-3 w-[3px] rounded-sm bg-[#4a3f2a]" />
            <span className="h-3 w-[3px] rounded-sm bg-[#4a3f2a]" />
          </span>
        ) : (
          <span className="block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#4a3f2a]" />
        )}
      </button>
      <button
        onClick={next}
        aria-label="下一首"
        title="下一首"
        className="rounded-full p-1.5 text-[#4a3f2a] transition hover:bg-[#e7dcc0]"
      >
        <SkipForward className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
