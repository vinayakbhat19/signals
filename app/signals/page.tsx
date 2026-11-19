'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/use-auth';

type LetterSpec = {
  char: string;
  vars: Record<string, string>;
};

const LETTERS: LetterSpec[] = [
  { char: 'S', vars: { '--i': '0', '--sx': '-60vw', '--sy': '-34vh', '--sr': '-540deg', '--cx': '2.46em', '--cy': '-0.15em', '--cr': '-20deg', '--bx': '0.33em', '--by': '-0.95em', '--br': '60deg', '--fx': '0.51em', '--fy': '1.05em', '--fr': '-100deg' } },
  { char: 'I', vars: { '--i': '1', '--sx': '68vw', '--sy': '10vh', '--sr': '630deg', '--cx': '1.79em', '--cy': '0.25em', '--cr': '30deg', '--bx': '1.97em', '--by': '-1.15em', '--br': '-80deg', '--fx': '1.12em', '--fy': '1.17em', '--fr': '160deg' } },
  { char: 'G', vars: { '--i': '2', '--sx': '-76vw', '--sy': '-18vh', '--sr': '-720deg', '--cx': '0.72em', '--cy': '-0.30em', '--cr': '-40deg', '--bx': '-0.99em', '--by': '-1.35em', '--br': '100deg', '--fx': '-0.46em', '--fy': '1.05em', '--fr': '-220deg' } },
  { char: 'N', vars: { '--i': '3', '--sx': '60vw', '--sy': '24vh', '--sr': '540deg', '--cx': '0.00em', '--cy': '0.10em', '--cr': '50deg', '--bx': '0.90em', '--by': '-0.95em', '--br': '-60deg', '--fx': '0.35em', '--fy': '1.17em', '--fr': '100deg' } },
  { char: 'A', vars: { '--i': '4', '--sx': '-68vw', '--sy': '-30vh', '--sr': '-630deg', '--cx': '-0.72em', '--cy': '0.30em', '--cr': '-20deg', '--bx': '-1.56em', '--by': '-1.15em', '--br': '80deg', '--fx': '-0.84em', '--fy': '1.05em', '--fr': '-160deg' } },
  { char: 'L', vars: { '--i': '5', '--sx': '76vw', '--sy': '6vh', '--sr': '720deg', '--cx': '-1.79em', '--cy': '-0.20em', '--cr': '30deg', '--bx': '0.58em', '--by': '-1.35em', '--br': '-100deg', '--fx': '0.18em', '--fy': '1.17em', '--fr': '220deg' } },
  { char: 'S', vars: { '--i': '6', '--sx': '-60vw', '--sy': '-12vh', '--sr': '-540deg', '--cx': '-2.41em', '--cy': '0.20em', '--cr': '-40deg', '--bx': '-2.13em', '--by': '-0.95em', '--br': '60deg', '--fx': '-1.21em', '--fy': '1.05em', '--fr': '-100deg' } },
];

export default function SignalsPage() {
  const { user } = useAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const notifyBtnRef = useRef<HTMLButtonElement | null>(null);
  const [playCycle, setPlayCycle] = useState(0);
  const [doneOpening, setDoneOpening] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const [notified, setNotified] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('signals_notify') === '1';
    } catch {
      return false;
    }
  });

  // Key demo state for "Host Your Event in Signals"
  const [kdChars, setKdChars] = useState<string[]>([]);
  const [kdMsg, setKdMsg] = useState('Only people with the key can get in.');
  const [kdBtnText, setKdBtnText] = useState('Join event');
  const [kdIn, setKdIn] = useState(false);
  const kdBusyRef = useRef(false);
  const kdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleKeyDemoPlay = useCallback(() => {
    if (kdTimerRef.current) {
      clearInterval(kdTimerRef.current);
      kdTimerRef.current = null;
    }
    kdBusyRef.current = true;
    setKdIn(false);
    setKdChars([]);
    setKdMsg('Typing secret access key...');
    setKdBtnText('Checking key...');

    const KEY = 'FESTAB26XK';
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setKdChars(KEY.slice(0, idx).split(''));
      if (idx >= 10) {
        clearInterval(timer);
        kdTimerRef.current = null;
        setKdBtnText('Access granted ✓');
        setKdMsg('Key verified!');
        setTimeout(() => {
          setKdIn(true);
          kdBusyRef.current = false;
        }, 550);
      }
    }, 140);
    kdTimerRef.current = timer;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      handleKeyDemoPlay();
    }, 1200);
    return () => {
      clearTimeout(t);
      if (kdTimerRef.current) clearInterval(kdTimerRef.current);
    };
  }, [handleKeyDemoPlay]);

  // Opening timer + 8s letter hop wave
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const raf = window.requestAnimationFrame(() => setDoneOpening(true));
      return () => window.cancelAnimationFrame(raf);
    }

    const doneTimer = window.setTimeout(() => setDoneOpening(true), 3000);
    let waveLoop: number | undefined;

    function runWave() {
      const letters = rootRef.current?.querySelectorAll('.sig-l');
      letters?.forEach((el, idx) => {
        window.setTimeout(() => {
          el.classList.remove('hop');
          void (el as HTMLElement).offsetWidth;
          el.classList.add('hop');
        }, idx * 70);
      });
      waveLoop = window.setTimeout(runWave, 8000);
    }

    const startWave = window.setTimeout(runWave, 9000);
    return () => {
      window.clearTimeout(doneTimer);
      window.clearTimeout(startWave);
      if (waveLoop) window.clearTimeout(waveLoop);
    };
  }, [playCycle]);

  // Scroll reveal + example Signals interested counter
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.sig-reveal'));

    function countUp(card: HTMLElement) {
      const b = card.querySelector<HTMLElement>('.sig-cnt');
      if (!b || b.dataset.done) return;
      b.dataset.done = '1';
      const to = parseInt(b.dataset.to || '0', 10);
      let n = 0;
      const t = window.setInterval(() => {
        n += 1;
        b.textContent = String(n);
        if (n >= to) {
          window.clearInterval(t);
          card.classList.add('match');
        }
      }, reduce ? 1 : 260);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const target = e.target as HTMLElement;
              target.classList.add('in');
              io.unobserve(target);
              if (target.classList.contains('sig-post')) {
                countUp(target);
              }
            }
          }
        },
        { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
      );
      els.forEach((el) => io.observe(el));
      return () => io.disconnect();
    } else {
      els.forEach((el) => {
        el.classList.add('in');
        if (el.classList.contains('sig-post')) countUp(el);
      });
    }
  }, []);

  // Sticky Notify me pill after scrolling past hero
  useEffect(() => {
    function onScroll() {
      const h = heroRef.current?.offsetHeight || 600;
      setShowPill(window.scrollY > h * 0.8);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function replayOpening() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    setDoneOpening(false);
    setPlayCycle((c) => c + 1);
  }

  function hopLetter(el: HTMLElement) {
    el.classList.remove('hop');
    void el.offsetWidth;
    el.classList.add('hop');
  }

  function handleNotifyToggle() {
    const next = !notified;
    setNotified(next);
    try {
      localStorage.setItem('signals_notify', next ? '1' : '0');
    } catch {
      // ignore
    }
    if (next) {
      toast.success(
        user
          ? "You're on the list! We'll ping you when Signals opens."
          : "Saved on this device! Sign in anytime to get push alerts when Signals opens."
      );
    } else {
      toast.info('Signals opening alert turned off.');
    }
  }

  return (
    <div
      ref={rootRef}
      className={`sig-page sig-play${doneOpening ? ' sig-done' : ''}`}
    >
      {/* Floating top bar */}
      <div className="sig-top">
        <Link href="/" className="sig-back" aria-label="Back to Fiesta'26 Live">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Fiesta&apos;26
        </Link>
        <button
          type="button"
          className={`sig-pill${showPill ? ' show' : ''}`}
          onClick={() =>
            notifyBtnRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
          }
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <g fill="none" strokeWidth="12" strokeLinecap="round">
              <path d="M44.4 76.4A22 22 0 0 1 75.6 76.4" stroke="#000" />
              <path d="M21.8 53.8A54 54 0 0 1 98.2 53.8" stroke="#000" />
            </g>
            <circle cx="60" cy="92" r="11" fill="#000" />
          </svg>
          <span>Notify me</span>
        </button>
      </div>

      {/* 1. Opening animation */}
      <header className="sig-hero" id="hero" ref={heroRef} key={playCycle}>
        <div className="sig-stage">
          <div
            className="sig-logo"
            role="button"
            tabIndex={0}
            aria-label="Signals logo. Tap to replay the animation"
            onClick={replayOpening}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') replayOpening();
            }}
          >
            <span className="sig-ripple sig-r1" />
            <span className="sig-ripple sig-r2" />
            <span className="sig-ripple sig-r3" />
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <path
                className="sig-arc sig-a3"
                pathLength={1}
                d="M21.8 53.8A54 54 0 0 1 98.2 53.8"
              />
              <path
                className="sig-arc sig-a2"
                pathLength={1}
                d="M33.1 65.1A38 38 0 0 1 86.9 65.1"
              />
              <path
                className="sig-arc sig-a1"
                pathLength={1}
                d="M44.4 76.4A22 22 0 0 1 75.6 76.4"
              />
              <circle className="sig-dot" cx="60" cy="92" r="9" />
            </svg>
          </div>

          <div className="sig-wordbox">
            <h1 className="sig-word sig-display" aria-label="Signals">
              {LETTERS.map((l, idx) => (
                <span
                  key={idx}
                  className="sig-l"
                  style={l.vars as CSSProperties}
                  aria-hidden="true"
                  onClick={(e) => hopLetter(e.currentTarget)}
                >
                  {l.char}
                </span>
              ))}
            </h1>
            <span className="sig-boom" aria-hidden="true" />
            <span className="sig-frame" aria-hidden="true" />
          </div>

          <span className="sig-soon">COMING SOON</span>
          <p className="sig-tag">Find your people. Host your event.</p>
        </div>

        <a className="sig-cue" href="#what" aria-label="Scroll down">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </header>

      <main className="sig-wrap">
        {/* 1b. Two Doors: Students and Organisers */}
        <section className="sig-sec" id="two">
          <div className="sig-kicker sig-reveal">ONE APP, TWO THINGS</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Signals is for <span style={{ color: 'var(--purple)' }}>students</span> and for{' '}
            <span style={{ color: 'var(--y)' }}>organisers</span>.
          </h2>
          <div className="sig-two">
            <a
              className="sig-door a sig-reveal"
              href="#what"
              style={{ '--d': '.05s' } as CSSProperties}
            >
              <svg viewBox="13 29 94 76" aria-hidden="true">
                <g fill="none" strokeWidth="10" strokeLinecap="round">
                  <path d="M44.4 76.4A22 22 0 0 1 75.6 76.4" stroke="#000" />
                  <path d="M33.1 65.1A38 38 0 0 1 86.9 65.1" stroke="#000" />
                  <path d="M21.8 53.8A54 54 0 0 1 98.2 53.8" stroke="#000" />
                </g>
                <circle cx="60" cy="92" r="10" fill="#000" />
              </svg>
              <div>
                <strong>Find your people</strong>
                <span>Raise a Signal, join groups.</span>
              </div>
            </a>
            <a
              className="sig-door b sig-reveal"
              href="#host"
              style={{ '--d': '.12s' } as CSSProperties}
            >
              <em>NEW</em>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
                <circle cx="12" cy="15.5" r="1.8" fill="#000" />
              </svg>
              <div>
                <strong>Host your event</strong>
                <span>A private space for your event.</span>
              </div>
            </a>
          </div>
        </section>

        {/* 2. What is Signals */}
        <section className="sig-sec" id="what">
          <div className="sig-kicker sig-reveal">WHAT IS SIGNALS?</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Your campus.{' '}
            <span style={{ color: 'var(--purple)' }}>Your people.</span> No
            phone numbers.
          </h2>
          <p
            className="sig-lead sig-reveal"
            style={{ '--d': '.1s' } as CSSProperties}
          >
            Signals is a place <strong>only for people on our campus</strong>.
            Raise a Signal to find the people you need. Start a community, make
            a group for your friends, run a meme page that only we can see.{' '}
            <strong>Post anything. Join anything. Connect with anyone</strong>,
            without ever handing out your number.
          </p>
        </section>

        {/* 3. Raise a Signal */}
        <section className="sig-sec" id="raise">
          <div className="sig-kicker sig-reveal">RAISE A SIGNAL</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Need someone?{' '}
            <span style={{ color: 'var(--y)' }}>Raise a Signal.</span>
          </h2>
          <p
            className="sig-lead sig-reveal"
            style={{ '--d': '.1s' } as CSSProperties}
          >
            One short post that reaches everyone on campus who can say{' '}
            <strong>&ldquo;I&apos;m in&rdquo;</strong>.
          </p>

          <div className="sig-raise">
            <div
              className="sig-rw sig-reveal"
              style={{ background: 'var(--orange)', '--d': '.04s' } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 5.5l4 4-9 9H5.5v-4z" />
                <path d="M12.5 7.5l4 4" />
              </svg>
              <div>
                <strong>Builders for your idea</strong>
                <span>Developer, designer, someone who ships. Find them here.</span>
              </div>
            </div>

            <div
              className="sig-rw sig-reveal"
              style={{ background: 'var(--cyan)', '--d': '.1s' } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5M17 7v6M14 10h6" />
              </svg>
              <div>
                <strong>Teammates for any event</strong>
                <span>Hackathon, dance, quiz, sports, a fest contest: fill your team.</span>
              </div>
            </div>

            <div
              className="sig-rw sig-reveal"
              style={{ background: 'var(--pink)', '--d': '.16s' } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 20V5M5 5h11l-2 4 2 4H5" />
              </svg>
              <div>
                <strong>Clubs finding their team</strong>
                <span>Recruit members, volunteers or a crew for your club.</span>
              </div>
            </div>

            <div
              className="sig-rw sig-reveal"
              style={{ background: 'var(--lime)', '--d': '.22s' } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="9" r="3" />
                <circle cx="17" cy="10" r="2.4" />
                <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 15.2c.8-.4 1.6-.6 2.5-.6 2.4 0 4.5 1.5 4.5 4.4" />
              </svg>
              <div>
                <strong>Communities to join</strong>
                <span>Find groups you like and tap &ldquo;I&apos;m in&rdquo; to join them.</span>
              </div>
            </div>
          </div>

          <div className="sig-posts">
            <div className="sig-post sig-reveal" style={{ '--d': '.02s' } as CSSProperties}>
              <div className="sig-post-row">
                <span className="sig-chip" style={{ background: 'var(--cyan)' }}>
                  NEED A TEAMMATE
                </span>
                <span style={{ color: 'var(--dim)' }}>ends in 5 h</span>
              </div>
              <p>
                Hackathon team needs 1 ML person. Idea and frontend ready, we
                just need brains for the model.
              </p>
              <div className="sig-btnrow">
                <span className="sig-imin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  I&apos;m in
                </span>
                <span className="sig-count">
                  <b className="sig-cnt" data-to="4">0</b> interested
                </span>
              </div>
            </div>

            <div className="sig-post sig-reveal" style={{ '--d': '.02s' } as CSSProperties}>
              <div className="sig-post-row">
                <span className="sig-chip" style={{ background: 'var(--pink)' }}>
                  CLUB TEAM
                </span>
                <span style={{ color: 'var(--dim)' }}>ends in 2 days</span>
              </div>
              <p>
                Dance club is looking for 3 new members for our fest team.
                Beginners welcome.
              </p>
              <div className="sig-btnrow">
                <span className="sig-imin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  I&apos;m in
                </span>
                <span className="sig-count">
                  <b className="sig-cnt" data-to="9">0</b> interested
                </span>
              </div>
            </div>

            <div className="sig-post sig-reveal" style={{ '--d': '.02s' } as CSSProperties}>
              <div className="sig-post-row">
                <span className="sig-chip" style={{ background: 'var(--orange)' }}>
                  WANT TO BUILD
                </span>
                <span style={{ color: 'var(--dim)' }}>ends in 3 days</span>
              </div>
              <p>
                Canteen pre-order app for our campus. No more 20-minute queues.
                Need a Flutter dev and a designer.
              </p>
              <div className="sig-btnrow">
                <span className="sig-imin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  I&apos;m in
                </span>
                <span className="sig-count">
                  <b className="sig-cnt" data-to="6">0</b> interested
                </span>
              </div>
            </div>

            <div className="sig-private sig-reveal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span>
                Nobody sees your phone number. You only talk after the poster
                accepts you.
              </span>
            </div>
            <p className="sig-cap sig-reveal">Example Signals.</p>
          </div>
        </section>

        {/* 4. Make it yours */}
        <section className="sig-sec" id="more">
          <div className="sig-kicker sig-reveal">AND MUCH MORE</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Make it <span style={{ color: 'var(--purple)' }}>yours.</span>
          </h2>
          <div className="sig-uses">
            <div className="sig-u sig-reveal" style={{ background: 'var(--cyan)', '--d': '.04s' } as CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="9" r="3" />
                <circle cx="17" cy="10" r="2.4" />
                <path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 15.2c.8-.4 1.6-.6 2.5-.6 2.4 0 4.5 1.5 4.5 4.4" />
              </svg>
              <strong>Start a community</strong>
              <span>For your college, branch, club or hostel.</span>
            </div>

            <div className="sig-u sig-reveal" style={{ background: 'var(--pink)', '--d': '.1s' } as CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
              </svg>
              <strong>Friend groups</strong>
              <span>A private corner for your gang.</span>
            </div>

            <div className="sig-u sig-reveal" style={{ background: 'var(--y)', '--d': '.16s' } as CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14c1 1.8 2.2 2.5 3.5 2.5s2.5-.7 3.5-2.5M9 9.5v.5M15 9.5v.5" />
              </svg>
              <strong>Meme pages</strong>
              <span>Memes that only campus people see.</span>
            </div>

            <div className="sig-u sig-reveal" style={{ background: 'var(--lime)', '--d': '.22s' } as CSSProperties}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h16v11H9l-5 4z" />
                <path d="M8 9h8M8 12h5" />
              </svg>
              <strong>Post anything</strong>
              <span>A thought, a plan, a question, a need.</span>
            </div>
          </div>
        </section>

        {/* 5. How it works + Notify me */}
        <section className="sig-sec">
          <div className="sig-kicker sig-reveal">HOW IT WORKS</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Post it. Join it. Talk.
          </h2>
          <div className="sig-steps">
            <div className="sig-step sig-reveal">
              <span className="sig-num">1</span>
              <div>
                <h3 className="sig-head">Raise a Signal</h3>
                <p>Say who you need, or start a community or group in a few taps.</p>
              </div>
            </div>
            <div className="sig-step sig-reveal" style={{ '--d': '.1s' } as CSSProperties}>
              <span className="sig-num">2</span>
              <div>
                <h3 className="sig-head">People join in</h3>
                <p>Anyone on campus who likes it taps &ldquo;I&apos;m in&rdquo;.</p>
              </div>
            </div>
            <div className="sig-step sig-reveal" style={{ '--d': '.2s' } as CSSProperties}>
              <span className="sig-num">3</span>
              <div>
                <h3 className="sig-head">Connect, privately</h3>
                <p>Talk without sharing your number with strangers.</p>
              </div>
            </div>
          </div>

          <div className="sig-reveal">
            <button
              ref={notifyBtnRef}
              type="button"
              aria-pressed={notified}
              onClick={handleNotifyToggle}
              className={`sig-notify${notified ? ' on' : ''}`}
            >
              <svg width="24" height="24" viewBox="0 0 120 120" aria-hidden="true">
                <g fill="none" strokeWidth="12" strokeLinecap="round">
                  <path d="M44.4 76.4A22 22 0 0 1 75.6 76.4" stroke="currentColor" />
                  <path d="M21.8 53.8A54 54 0 0 1 98.2 53.8" stroke="currentColor" />
                </g>
                <circle cx="60" cy="92" r="11" fill="currentColor" />
              </svg>
              <span>
                {notified
                  ? "You're on the list. We'll ping you."
                  : 'Notify me when it opens'}
              </span>
            </button>
          </div>
          <p className="sig-small sig-reveal">
            One alert when Signals opens. Nothing else.
          </p>
        </section>

        {/* Bridge for Organisers */}
        <div className="sig-bridge sig-reveal">
          <span>AND NOW, FOR ORGANISERS</span>
        </div>

        {/* Host your event in Signals */}
        <section className="sig-sec" id="host" style={{ paddingTop: '26px' }}>
          <div className="sig-kicker sig-reveal">HOST YOUR EVENT IN SIGNALS</div>
          <h2
            className="sig-head sig-big sig-reveal"
            style={{ '--d': '.05s' } as CSSProperties}
          >
            Your event. <span style={{ color: 'var(--y)' }}>Your look.</span> Your key.
          </h2>
          <p
            className="sig-lead sig-reveal"
            style={{ '--d': '.1s' } as CSSProperties}
          >
            Your event gets its <strong>own private space</strong> in Signals, with your look and an admin panel. People join with <strong>a secret key only you share</strong>.
          </p>

          <div style={{ marginTop: '20px' }}>
            <div
              className={`sig-plate sig-keydemo${kdIn ? ' takeover in' : ''}`}
              onClick={handleKeyDemoPlay}
              aria-label="Demo: entering an event key"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleKeyDemoPlay();
                }
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: 'var(--y)' }}>
                ENTER YOUR EVENT KEY
              </div>
              <div className="sig-kd-boxes">
                {/* Group 1: 4 chars */}
                {[0, 1, 2, 3].map((i) => (
                  <i key={i} className={kdChars[i] ? 'on' : ''}>
                    {kdChars[i] || ''}
                  </i>
                ))}
                <b>-</b>
                {/* Group 2: 4 chars */}
                {[4, 5, 6, 7].map((i) => (
                  <i key={i} className={kdChars[i] ? 'on' : ''}>
                    {kdChars[i] || ''}
                  </i>
                ))}
                <b>-</b>
                {/* Group 3: 2 chars */}
                {[8, 9].map((i) => (
                  <i key={i} className={kdChars[i] ? 'on' : ''}>
                    {kdChars[i] || ''}
                  </i>
                ))}
              </div>
              <div className="sig-kd-msg">{kdMsg}</div>
              <span className="sig-kd-btn">{kdBtnText}</span>
              <div className="sig-kd-take" aria-hidden="true">
                <small>YOU&apos;RE IN</small>
                <div className="ev">YOUR EVENT</div>
                <div className="by">BY SIGNALS</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleKeyDemoPlay}
              className="sig-cap2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <span>Demo. Tap here to replay animation</span>
            </button>
          </div>

          <div className="sig-rules">
            <div className="sig-rl sig-reveal">
              <i style={{ background: 'var(--pink)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </i>
              <div>
                <strong>Private by key</strong>
                <span>Only people with your key can get in.</span>
              </div>
            </div>

            <div className="sig-rl sig-reveal" style={{ '--d': '.06s' } as CSSProperties}>
              <i style={{ background: 'var(--cyan)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </i>
              <div>
                <strong>One event, one time</strong>
                <span>Opens for your dates, then closes.</span>
              </div>
            </div>

            <div className="sig-rl sig-reveal" style={{ '--d': '.12s' } as CSSProperties}>
              <i style={{ background: 'var(--lime)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </i>
              <div>
                <strong>We read your brief first</strong>
                <span>You send a short brief. We set it up.</span>
              </div>
            </div>
          </div>

          <div className="sig-cta sig-reveal">
            <h3>Want your event here?</h3>
            <p>A short brief is enough.</p>
            <a
              href="mailto:vinayakkbhatt@gmail.com?subject=Host%20my%20event%20in%20Signals&body=Hi%2C%20I%20want%20to%20host%20my%20event%20in%20Signals.%0A%0AEvent%20name%3A%0ACollege%20/%20club%3A%0ADates%20%28start%20and%20end%29%3A%0AHow%20many%20people%20%28roughly%29%3A%0AFeatures%20I%20need%20%28schedule%2C%20alerts%2C%20voting%2C%20treasure%20hunt%2C%20registrations%2C%20stage%20screen%2C%20QR%20tools%29%3A%0AOur%20logo%20and%20colours%20%28send%20the%20logo%20as%20an%20attachment%29%3A%0AMy%20name%20and%20phone%3A%0A"
              id="briefBtn"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Send my event brief
            </a>
          </div>
        </section>

        {/* 6. Developer card */}
        <section className="sig-sec" id="maker">
          <div className="sig-me">
            <div className="sig-av2 overflow-hidden" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/vinayak.jpg"
                alt="Vinayak Bhat"
                className="size-full object-cover rounded-full"
              />
            </div>
            <div className="sig-info">
              <span className="sig-role">DEVELOPER</span>
              <strong>Vinayak Bhat</strong>
              <a
                className="sig-mail"
                href="https://vinayakbhatpf.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://vinayakbhatpf.vercel.app/
              </a>
            </div>
            <a
              className="sig-go"
              href="https://vinayakbhatpf.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Vinayak's Portfolio"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <p className="sig-me-note">
            Got an idea, or want your event here? View my portfolio or reach out.
          </p>
        </section>

        <footer className="sig-foot">
          Signals · coming soon ·{' '}
          <Link href="/privacy" className="underline hover:text-[#FFD60A]">
            Privacy
          </Link>{' '}
          ·{' '}
          <Link href="/terms" className="underline hover:text-[#FFD60A]">
            Terms
          </Link>
        </footer>
      </main>
    </div>
  );
}
