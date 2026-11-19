'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FIESTA_LOGO_B64 } from '@/lib/fiesta-logo-b64';

const INTRO_SEEN_KEY = 'intro_seen';

const INTRO_CSS = `
.fiesta-intro-wrap {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000;
  overflow: hidden;
  font-family: Inter, system-ui, sans-serif;
  color: #F4F2FA;
  transition: opacity 0.38s ease;
}
.fiesta-intro-wrap.leaving {
  opacity: 0;
  pointer-events: none;
}
.fiesta-intro-wrap .scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #000;
}
.fiesta-intro-wrap .bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 40%, rgba(120,60,190,.55), transparent 62%),
    radial-gradient(rgba(255,79,216,.30) 1.4px, transparent 1.7px) 0 0/9px 9px,
    linear-gradient(180deg, #3B1E57, #2A1440 70%, #1F0F33);
  clip-path: circle(0% at 50% 40%);
}
.fiesta-intro-wrap.play .bg {
  animation: intro_reveal 2.3s cubic-bezier(.25,.6,.25,1) 1.2s forwards;
}
.fiesta-intro-wrap.finished .bg,
.fiesta-intro-wrap.leaving .bg {
  clip-path: circle(150% at 50% 40%) !important;
}
@keyframes intro_reveal {
  to { clip-path: circle(150% at 50% 40%); }
}

.fiesta-intro-wrap .fiesta {
  position: absolute;
  left: 50%;
  top: 40%;
  width: min(82vw, 380px);
  height: auto;
  transform: translate(-50%, -50%);
  z-index: 5;
  filter: drop-shadow(0 10px 0 rgba(0,0,0,.25));
}
.fiesta-intro-wrap.play .fiesta {
  animation: intro_drop .9s both;
  animation-delay: .57s;
}
.fiesta-intro-wrap.finished .fiesta,
.fiesta-intro-wrap.leaving .fiesta {
  transform: translate(-50%, -50%) scale(1) rotate(0) !important;
  opacity: 1 !important;
}
@keyframes intro_drop {
  0% {
    transform: translate(-50%, -85vh) scale(1.8) rotate(-9deg);
    animation-timing-function: cubic-bezier(.6,0,.95,.55);
  }
  70% {
    transform: translate(-50%, -50%) scale(1.04) rotate(1.5deg);
    animation-timing-function: ease-out;
  }
  80% {
    transform: translate(-50%, -47%) scale(1.06, .88) rotate(0);
  }
  91% {
    transform: translate(-50%, -52%) scale(.97, 1.05);
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0);
  }
}

.fiesta-intro-wrap.play .scene {
  animation: intro_shake .45s 1.2s both;
}
@keyframes intro_shake {
  0%, 100% { transform: none; }
  15% { transform: translate(-9px, 5px); }
  30% { transform: translate(8px, -6px); }
  45% { transform: translate(-6px, -4px); }
  60% { transform: translate(5px, 5px); }
  80% { transform: translate(-2px, 2px); }
}

.fiesta-intro-wrap .boom {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  border: 5px solid #FFD60A;
  opacity: 0;
  z-index: 4;
}
.fiesta-intro-wrap .boom.b2 {
  border-color: #FF4FD8;
  border-width: 3px;
}
.fiesta-intro-wrap.play .boom {
  animation: intro_boom .8s ease-out 1.2s forwards;
}
.fiesta-intro-wrap.play .boom.b2 {
  animation-delay: 1.3s;
}
@keyframes intro_boom {
  0% { transform: scale(.2); opacity: .95; }
  100% { transform: scale(5.5); opacity: 0; }
}

.fiesta-intro-wrap .flash {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
  z-index: 6;
  pointer-events: none;
}
.fiesta-intro-wrap.play .flash {
  animation: intro_flash .4s ease-out 1.2s forwards;
}
@keyframes intro_flash {
  0% { opacity: .5; }
  100% { opacity: 0; }
}

.fiesta-intro-wrap .conf {
  position: absolute;
  left: 50%;
  top: 40%;
  z-index: 7;
  pointer-events: none;
}
.fiesta-intro-wrap .conf i {
  position: absolute;
  display: block;
  background: var(--c);
  border-radius: 2px;
  opacity: 0;
}
.fiesta-intro-wrap.play .conf i {
  animation: intro_conf 1.4s cubic-bezier(.15,.7,.3,1) forwards;
}
@keyframes intro_conf {
  0% { opacity: 1; transform: translate(0,0) rotate(0); }
  100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) + 90px)) rotate(calc(var(--r) * 3)); }
}

.fiesta-intro-wrap .l {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 8;
  display: block;
  text-align: center;
  font-family: Bungee, sans-serif;
  line-height: 1;
  user-select: none;
  will-change: transform;
}
.fiesta-intro-wrap .l:nth-child(1) { color: #9B6CFF; }
.fiesta-intro-wrap .l:nth-child(2) { color: #F4F2FA; }
.fiesta-intro-wrap .l:nth-child(3) { color: #FFD60A; }
.fiesta-intro-wrap .l:nth-child(4) { color: #FF4FD8; }
.fiesta-intro-wrap .l:nth-child(5) { color: #22D3EE; }
.fiesta-intro-wrap .l:nth-child(6) { color: #C6FF3D; }
.fiesta-intro-wrap .l:nth-child(7) { color: #FF9F43; }

.fiesta-intro-wrap .row {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 4;
  visibility: hidden;
}
.fiesta-intro-wrap .row .mk {
  height: 1.25em;
  width: auto;
  flex: none;
  visibility: visible;
}
.fiesta-intro-wrap .row .slot {
  display: block;
  text-align: center;
  font-family: Bungee, sans-serif;
  line-height: 1;
  visibility: hidden;
}
.fiesta-intro-wrap .by {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .3em;
  color: #E7D8FF;
}
.fiesta-intro-wrap.play .by {
  animation: intro_rise .6s ease-out 2.9s both;
}
.fiesta-intro-wrap.play .row .mk {
  animation: intro_mark .55s cubic-bezier(.3,1.7,.5,1) 3.15s both;
}
.fiesta-intro-wrap.finished .by,
.fiesta-intro-wrap.leaving .by {
  opacity: 1 !important;
  transform: none !important;
}
.fiesta-intro-wrap.finished .row,
.fiesta-intro-wrap.leaving .row {
  visibility: visible !important;
}
.fiesta-intro-wrap.finished .row .mk,
.fiesta-intro-wrap.leaving .row .mk {
  opacity: 1 !important;
  transform: none !important;
}
.fiesta-intro-wrap.finished .l,
.fiesta-intro-wrap.leaving .l {
  opacity: 1 !important;
}

@keyframes intro_rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
@keyframes intro_mark {
  from { transform: scale(0) rotate(-40deg); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.fiesta-intro-wrap .skip {
  position: absolute;
  right: 14px;
  top: max(14px, env(safe-area-inset-top));
  z-index: 99;
  height: 36px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,.3);
  background: rgba(0,0,0,.45);
  color: #F4F2FA;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.fiesta-intro-wrap .skip:hover {
  background: rgba(255,255,255,.18);
  border-color: rgba(255,255,255,.55);
}

.fiesta-intro-wrap .replay-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(26px + env(safe-area-inset-bottom));
  text-align: center;
  z-index: 9;
  font-size: 12px;
  color: #BDB8CF;
  letter-spacing: .06em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.fiesta-intro-wrap.finished:not(.leaving) .replay-hint {
  opacity: 0.9;
}

@media (prefers-reduced-motion: reduce) {
  .fiesta-intro-wrap *,
  .fiesta-intro-wrap *::before,
  .fiesta-intro-wrap *::after {
    animation: none !important;
    transition: none !important;
  }
  .fiesta-intro-wrap .boom,
  .fiesta-intro-wrap .flash,
  .fiesta-intro-wrap .conf {
    display: none;
  }
}
`;

const CONFETTI_DATA = [
  { dx: '110px', dy: '-30px', r: '0deg', c: '#FFD60A', w: '6px', h: '10px', d: '1.20s' },
  { dx: '165px', dy: '40px', r: '57deg', c: '#FF4FD8', w: '9px', h: '14px', d: '1.21s' },
  { dx: '149px', dy: '144px', r: '114deg', c: '#22D3EE', w: '12px', h: '10px', d: '1.22s' },
  { dx: '223px', dy: '176px', r: '171deg', c: '#C6FF3D', w: '6px', h: '14px', d: '1.23s' },
  { dx: '45px', dy: '124px', r: '228deg', c: '#9B6CFF', w: '9px', h: '10px', d: '1.24s' },
  { dx: '-42px', dy: '98px', r: '285deg', c: '#FF9F43', w: '12px', h: '14px', d: '1.25s' },
  { dx: '-34px', dy: '162px', r: '342deg', c: '#FFD60A', w: '6px', h: '10px', d: '1.26s' },
  { dx: '-188px', dy: '176px', r: '39deg', c: '#FF4FD8', w: '9px', h: '14px', d: '1.27s' },
  { dx: '-158px', dy: '32px', r: '96deg', c: '#22D3EE', w: '12px', h: '10px', d: '1.28s' },
  { dx: '-213px', dy: '79px', r: '153deg', c: '#C6FF3D', w: '6px', h: '14px', d: '1.29s' },
  { dx: '-240px', dy: '-11px', r: '210deg', c: '#9B6CFF', w: '9px', h: '10px', d: '1.30s' },
  { dx: '-187px', dy: '-108px', r: '267deg', c: '#FF9F43', w: '12px', h: '14px', d: '1.31s' },
  { dx: '-107px', dy: '-149px', r: '324deg', c: '#FFD60A', w: '6px', h: '10px', d: '1.32s' },
  { dx: '31px', dy: '-183px', r: '21deg', c: '#FF4FD8', w: '9px', h: '14px', d: '1.33s' },
  { dx: '127px', dy: '-144px', r: '78deg', c: '#22D3EE', w: '12px', h: '10px', d: '1.34s' },
  { dx: '197px', dy: '-107px', r: '135deg', c: '#C6FF3D', w: '6px', h: '14px', d: '1.35s' },
  { dx: '232px', dy: '24px', r: '192deg', c: '#9B6CFF', w: '9px', h: '10px', d: '1.36s' },
  { dx: '216px', dy: '119px', r: '249deg', c: '#FF9F43', w: '12px', h: '14px', d: '1.37s' },
  { dx: '88px', dy: '155px', r: '306deg', c: '#FFD60A', w: '6px', h: '10px', d: '1.38s' },
  { dx: '287px', dy: '-207px', r: '3deg', c: '#FF4FD8', w: '9px', h: '14px', d: '1.39s' },
  { dx: '108px', dy: '-45px', r: '60deg', c: '#22D3EE', w: '12px', h: '10px', d: '1.40s' },
  { dx: '179px', dy: '-72px', r: '117deg', c: '#C6FF3D', w: '6px', h: '14px', d: '1.41s' },
];

const LETTERS = ['S', 'I', 'G', 'N', 'A', 'L', 'S'];

export function FiestaIntro({ onFinished }: { onFinished?: () => void }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const byRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);

  const handleFinish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Ignore
    }

    setTimeout(() => {
      setActive(false);
      onFinished?.();
    }, 400);
  }, [leaving, onFinished]);

  const handleSkip = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsFinished(true);
      lettersRef.current.forEach((l) => {
        if (l) {
          l.getAnimations().forEach((a) => a.cancel());
          l.style.opacity = '1';
          l.style.transform = 'none';
        }
      });
      handleFinish();
    },
    [handleFinish]
  );

  const runIntro = useCallback(() => {
    setIsPlaying(false);
    setIsFinished(false);

    requestAnimationFrame(() => {
      setIsPlaying(true);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const lw = Math.min(W * 0.82, 380);
      const lh = (lw * 500) / 900;
      const Cx = W / 2;
      const Cy = H * 0.4;
      const f = Math.max(24, Math.min(34, W * 0.075));
      const F = Math.max(34, Math.min(62, W * 0.116));

      if (rowRef.current) {
        rowRef.current.style.top = `${Cy + lh / 2 + 58}px`;
        rowRef.current.style.fontSize = `${f}px`;
      }
      if (byRef.current) {
        byRef.current.style.top = `${Cy + lh / 2 + 22}px`;
      }

      slotsRef.current.forEach((s) => {
        if (s) {
          s.style.width = `${0.82 * f}px`;
          s.style.height = `${f}px`;
        }
      });

      lettersRef.current.forEach((l) => {
        if (l) {
          l.style.fontSize = `${f}px`;
          l.style.width = `${0.82 * f}px`;
          l.style.height = `${f}px`;
          l.getAnimations().forEach((a) => a.cancel());
        }
      });

      const slotCoords = slotsRef.current.map((s) => {
        if (!s) return { x: Cx, y: Cy };
        const r = s.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      lettersRef.current.forEach((l, i) => {
        if (l && slotCoords[i]) {
          l.style.left = `${slotCoords[i].x - 0.41 * f}px`;
          l.style.top = `${slotCoords[i].y - f / 2}px`;
        }
      });

      const T_IMPACT = 1200;
      const T_ORBIT_END = 2450;
      const D = 3600;
      const s0 = F / f;
      const R = Math.min(W * 0.4, lw * 0.62);

      lettersRef.current.forEach((el, i) => {
        if (!el || !slotCoords[i]) return;
        const side = i % 2 ? 1 : -1;
        const targetSlot = slotCoords[i];

        function tr(x: number, y: number, sc: number, rot: number) {
          return `translate(${x - targetSlot.x}px, ${y - targetSlot.y}px) rotate(${rot}deg) scale(${sc})`;
        }

        const Wx = Cx + (i - 3) * 0.82 * F;
        const Wy = Cy;
        const Px = Cx + (i - 3) * 0.82 * F * 0.35 + side * F * (0.35 + 0.2 * (i % 3));
        const Py = Cy + F * (1.05 + 0.12 * (i % 2));
        const th0 = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const tEnd = T_ORBIT_END + i * 45;

        function orbit(u: number, k?: number) {
          const th = th0 + u * Math.PI * 2 * 1.5;
          const rr = R * (k || 1) * (0.92 + 0.08 * Math.sin(u * Math.PI));
          return {
            x: Cx + Math.cos(th) * rr,
            y: Cy + Math.sin(th) * rr * 0.62,
            th,
          };
        }

        const kf: Keyframe[] = [];
        function add(t: number, x: number, y: number, sc: number, rot: number, op: number, ease?: string) {
          kf.push({
            offset: t / D,
            transform: tr(x, y, sc, rot),
            opacity: op,
            easing: ease || 'linear',
          });
        }

        add(0, Px, Py, s0, side * 120, 0);
        add(160, Px, Py, s0, side * 120, 1, 'cubic-bezier(.3,.9,.4,1)');
        add(520, Px + (Wx - Px) * 0.25, Py + (Wy - Py) * 0.25 - 0.75 * F, s0, side * 60, 1, 'cubic-bezier(.55,0,.9,.6)');
        add(800, Px + (Wx - Px) * 0.5, Py + (Wy - Py) * 0.5, s0, side * 28, 1, 'cubic-bezier(.3,.9,.4,1)');
        add(1000, Px + (Wx - Px) * 0.65, Py + (Wy - Py) * 0.65 - 0.5 * F, s0, side * 12, 1, 'ease-in');
        add(T_IMPACT - 10, Px + (Wx - Px) * 0.8, Py + (Wy - Py) * 0.8, s0, side * 6, 1, 'cubic-bezier(.1,.8,.3,1)');

        const o0 = orbit(0, 1.35);
        add(T_IMPACT + 60, o0.x, o0.y, s0 * 0.78, o0.th * 57.3 + 90, 1);

        const n = Math.round((tEnd - (T_IMPACT + 60)) / 90);
        for (let k = 1; k <= n; k++) {
          const u = k / n;
          const o = orbit(u, 1);
          const t = T_IMPACT + 60 + k * ((tEnd - (T_IMPACT + 60)) / n);
          add(t, o.x, o.y, s0 * (0.78 - 0.1 * u), o.th * 57.3 + 90, 1);
        }

        const oe = orbit(1, 1);
        add(tEnd + 380, (oe.x + targetSlot.x) / 2, Math.min(oe.y, targetSlot.y) - 40, s0 * 0.55, 20 * side, 1, 'ease-out');
        add(tEnd + 640, targetSlot.x, targetSlot.y + 9, 1.06, -6 * side, 1, 'ease-out');
        add(tEnd + 800, targetSlot.x, targetSlot.y, 1, 0, 1);

        kf.forEach((k) => {
          if (typeof k.offset === 'number') {
            k.offset = Math.min(1, k.offset);
          }
        });

        const arr = kf.filter((k) => typeof k.offset === 'number' && k.offset <= 1);
        el.animate(arr, { duration: D, fill: 'both', easing: 'linear' });
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsFinished(true);
        handleFinish();
      }, 4400);
    });
  }, [handleFinish]);

  const handleSceneClick = useCallback(() => {
    // Tapping the scene only replays when already finished; does NOT skip while playing
    if (isFinished && !leaving) {
      runIntro();
    }
  }, [isFinished, leaving, runIntro]);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      // Ignore
    }

    const forced = typeof window !== 'undefined' && /[?&]intro=1/.test(window.location.search);

    if (seen && !forced) {
      return;
    }

    setActive(true);
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Ignore
    }

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      timerRef.current = setTimeout(handleFinish, 800);
      return;
    }

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(runIntro);
    } else {
      runIntro();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleFinish, runIntro, router]);

  if (!active) return null;

  return (
    <div
      className={`fiesta-intro-wrap ${isPlaying ? 'play' : ''} ${isFinished ? 'finished' : ''} ${leaving ? 'leaving' : ''}`}
      onClick={handleSceneClick}
    >
      <style dangerouslySetInnerHTML={{ __html: INTRO_CSS }} />

      <div className="scene" id="scene">
        <div className="bg" />

        <div className="boom" />
        <div className="boom b2" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="fiesta"
          id="fiesta"
          alt="Fiesta 2026, intra college cultural fest"
          src={FIESTA_LOGO_B64}
        />

        <div className="flash" />

        <div className="conf" aria-hidden="true">
          {CONFETTI_DATA.map((c, idx) => (
            <i
              key={idx}
              style={
                {
                  '--dx': c.dx,
                  '--dy': c.dy,
                  '--r': c.r,
                  '--c': c.c,
                  width: c.w,
                  height: c.h,
                  animationDelay: c.d,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="by" id="by" ref={byRef}>
          BY SIGNALS
        </div>

        <div className="row" id="row" ref={rowRef}>
          <svg className="mk" viewBox="13 29 94 76" aria-hidden="true">
            <g fill="none" strokeWidth="9" strokeLinecap="round">
              <path d="M44.4 76.4A22 22 0 0 1 75.6 76.4" stroke="#FFD60A" />
              <path d="M33.1 65.1A38 38 0 0 1 86.9 65.1" stroke="#FF4FD8" />
              <path d="M21.8 53.8A54 54 0 0 1 98.2 53.8" stroke="#9B6CFF" />
            </g>
            <circle cx="60" cy="92" r="9" fill="#22D3EE" />
          </svg>
          <span id="slots" style={{ display: 'contents' }}>
            {LETTERS.map((char, i) => (
              <span
                key={i}
                className="slot"
                ref={(el) => {
                  slotsRef.current[i] = el;
                }}
              >
                {char}
              </span>
            ))}
          </span>
        </div>

        <div id="letters" aria-label="Signals">
          {LETTERS.map((char, i) => (
            <span
              key={i}
              className="l"
              data-i={i}
              aria-hidden="true"
              ref={(el) => {
                lettersRef.current[i] = el;
              }}
            >
              {char}
            </span>
          ))}
        </div>

        <button
          className="skip"
          id="skip"
          type="button"
          onClick={handleSkip}
          aria-label="Skip intro animation"
        >
          Skip
        </button>

        <div className="replay-hint">tap anywhere to replay</div>
      </div>
    </div>
  );
}
