'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/use-auth';
import './signals-teaser.css';

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
          <p className="sig-tag">Something on campus is about to light up.</p>
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

          <button
            ref={notifyBtnRef}
            type="button"
            aria-pressed={notified}
            onClick={handleNotifyToggle}
            className={`sig-notify sig-reveal${notified ? ' on' : ''}`}
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
          <p className="sig-small sig-reveal">
            One alert when Signals opens. Nothing else.
          </p>
        </section>

        {/* 6. Developer card */}
        <section className="sig-sec" id="maker">
          <div className="sig-me sig-reveal">
            <div className="sig-av2" aria-hidden="true">
              VB
            </div>
            <div className="sig-info">
              <span className="sig-role">DEVELOPER</span>
              <strong>Vinayak Bhat</strong>
              <a
                className="sig-mail"
                href="mailto:vinayakkbhatt@gmail.com?subject=Signals%20app"
              >
                vinayakkbhatt@gmail.com
              </a>
            </div>
            <a
              className="sig-go"
              href="mailto:vinayakkbhatt@gmail.com?subject=Signals%20app"
              aria-label="Email Vinayak"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </a>
          </div>
          <p className="sig-me-note sig-reveal">
            Got an idea or want to help build it? Write to me.
          </p>
        </section>

        <footer className="sig-foot">Signals · coming soon</footer>
      </main>
    </div>
  );
}
