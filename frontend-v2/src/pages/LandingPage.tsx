/*
  DIRECTION CONTRACT — Sanrachna Landing Page
  THESIS: Construction operations war room. Refuses SaaS screenshot-hero default.
  OWN-WORLD: #06090f ground, #00D4AA structural-green, #F59E0B amber. Geist/Inter/Geist Mono.
  STORY: Visitor sees AI terminal mechanism, understands 60-second planning, shares or signs up.
  FIRST VIEWPORT: Dramatic construction-at-night photo + live AI estimation terminal panel.
  FORM: Immersive hero with embedded live demo panel. Seed: 98cbb32f / Index 3.
*/

import { useEffect, useRef, useState, useCallback } from 'react';
import '../landing.css';

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IconCPWD = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#00D4AA" strokeWidth="1.5"/>
    <path d="M12 7v5l3 3" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l7 3.5v5C19 15.5 15.5 20 12 22 8.5 20 5 15.5 5 10.5v-5L12 2z" stroke="#00D4AA" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPlay = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M5 3l9 5-9 5V3z" fill="currentColor"/>
  </svg>
);
const IconSanrachna = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 21L12 3l9 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 15h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Typewriter terminal ──────────────────────────────────────────────────────
const TERMINAL_LINES = [
  { delay: 0,    html: '<span class="green">✓</span> <span class="key">project  </span> <span class="val">Riverside Commercial Complex, Pune</span>' },
  { delay: 800,  html: '<span class="green">✓</span> <span class="key">type     </span> <span class="val">G+12 RCC Frame · 8,200 sqm</span>' },
  { delay: 1400, html: '<span class="amber">⟳</span> <span class="key">loading  </span> <span class="val">CPWD DSR 2024 rates · RSMeans Q4…</span>' },
  { delay: 2600, html: '<span class="green">✓</span> <span class="key">rates    </span> <span class="val">₹ 6,420/sqm composite indexed</span>' },
  { delay: 3200, html: '<span class="amber">⟳</span> <span class="key">estimate </span> <span class="val">Running ML model (97 parameters)…</span>' },
  { delay: 5000, html: '<span class="green">✓</span> <span class="key">cost     </span> <span class="green">₹ 5.27 Cr  (±7.4%)</span>' },
  { delay: 5600, html: '<span class="green">✓</span> <span class="key">gantt    </span> <span class="val">284-day schedule · 12 milestones</span>' },
  { delay: 6200, html: '<span class="blue">ℹ</span> <span class="key">source   </span> <span class="val">DSR-2024 §3.1.2, §5.4.8, §11.2.1</span>' },
  { delay: 6800, html: '<span class="green">✓</span> <span class="key">ready    </span> <span class="green">Plan exported — 61 seconds</span>' },
];

function TerminalPanel() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TERMINAL_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
      }, line.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCursor(c => !c), 550);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="lp3-terminal-wrap">
      <div className="lp3-terminal-glow" />
      <div className="lp3-terminal">
        <div className="lp3-terminal-bar">
          <div className="lp3-terminal-dot" style={{ background: '#FF5F57' }} />
          <div className="lp3-terminal-dot" style={{ background: '#FFBD2E' }} />
          <div className="lp3-terminal-dot" style={{ background: '#28C840' }} />
          <div className="lp3-terminal-title">SANRACHNA · AI ESTIMATION ENGINE</div>
        </div>
        <div className="lp3-terminal-body">
          <div className="lp3-terminal-prompt">
            <span style={{ color: 'var(--s-green)' }}>sanrachna</span>
            <span style={{ color: 'rgba(240,244,248,0.3)' }}> estimate --project &quot;new&quot;</span>
          </div>
          <div className="lp3-terminal-output">
            {TERMINAL_LINES.map((line, i) =>
              visibleLines.includes(i) ? (
                <div key={i} dangerouslySetInnerHTML={{ __html: line.html }} />
              ) : null
            )}
            {cursor && <span className="lp3-cursor" />}
          </div>
          <div className="lp3-terminal-divider" />
          <div className="lp3-terminal-stats">
            <div className="lp3-t-stat">
              <div className="lp3-t-stat-val" style={{ color: 'var(--s-green)' }}>61s</div>
              <div className="lp3-t-stat-lbl">Time to plan</div>
            </div>
            <div className="lp3-t-stat">
              <div className="lp3-t-stat-val" style={{ color: 'var(--s-amber)' }}>±7.4%</div>
              <div className="lp3-t-stat-lbl">Accuracy</div>
            </div>
            <div className="lp3-t-stat">
              <div className="lp3-t-stat-val" style={{ color: 'var(--s-blue)' }}>DSR</div>
              <div className="lp3-t-stat-lbl">Source cited</div>
            </div>
          </div>
        </div>
      </div>
      {/* Float chips */}
      <div className="lp3-float lp3-float-1">
        <div className="lp3-float-val" style={{ color: 'var(--s-green)' }}>₹5.27 Cr</div>
        <div className="lp3-float-lbl">Cost estimate · CPWD DSR</div>
      </div>
      <div className="lp3-float lp3-float-2">
        <div className="lp3-float-val" style={{ color: 'var(--s-amber)' }}>284 days</div>
        <div className="lp3-float-lbl">Auto-generated Gantt</div>
      </div>
    </div>
  );
}

// ── Stat counter ─────────────────────────────────────────────────────────────
function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const dur = 1600;
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(ease * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp3-reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ── Nav scroll ───────────────────────────────────────────────────────────────
function useNavScroll() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return scrolled;
}

// ── Capabilities data ────────────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 7h11M9 12h11M9 17h11M5 7h.01M5 12h.01M5 17h.01" stroke="#00D4AA" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    title: 'AI Cost Estimation',
    desc: 'CPWD DSR 2024 + RSMeans grounded. Source-cited output at ±8% accuracy in under 60 seconds. Every number traced back to a rate reference.',
    accent: '#00D4AA',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="#F59E0B" strokeWidth="1.5"/>
        <path d="M3 9h18M8 4v5M16 4v5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 13h4v4H7z" fill="rgba(245,158,11,0.2)" stroke="#F59E0B" strokeWidth="1"/>
      </svg>
    ),
    title: 'Smart Gantt Timeline',
    desc: 'Auto-generated task dependencies from project parameters. Delay forecasting and AI-suggested recovery sequences.',
    accent: '#F59E0B',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#3B8BFF" strokeWidth="1.5"/>
        <path d="M12 8v4l3 3" stroke="#3B8BFF" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8.5 3.5l7 1M3.5 8.5l1 7" stroke="rgba(59,139,255,0.4)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Daily Site Intelligence',
    desc: 'Photo-verified progress logs, engineer approvals, and daily reports that flow from site to office without WhatsApp chains.',
    accent: '#3B8BFF',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#00D4AA" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 10h8M8 13h5" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'AI Copilot',
    desc: 'RAG-powered Q&A with full project memory and cited answers. Ask anything about budget, schedule, or compliance — get a sourced answer.',
    accent: '#00D4AA',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l7 3.5v5C19 15.5 15.5 20 12 22 8.5 20 5 15.5 5 10.5v-5L12 2z" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Safety & Emergency',
    desc: 'Incident reporting with severity classification. Escalation workflows that reach the right person without relying on phone chains.',
    accent: '#F59E0B',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#3B8BFF" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#3B8BFF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Document Management',
    desc: 'Centralized repository for drawings, approvals, BOQs, and RFIs. Version-aware, role-controlled access — always the right file.',
    accent: '#3B8BFF',
  },
];

const FLOW_STEPS = [
  { n: '01', title: 'Input project parameters', desc: 'Location, type, built-up area, and scope in plain language.' },
  { n: '02', title: 'AI sources the rates', desc: 'CPWD DSR 2024 + RSMeans pulled and indexed automatically.' },
  { n: '03', title: 'Estimate generated', desc: '±8% accuracy cost breakdown with full citation trail.' },
  { n: '04', title: 'Gantt auto-built', desc: 'Task dependencies and durations derived from the estimate.' },
  { n: '05', title: 'Team moves to site', desc: 'Daily logs, RFIs, and safety flows from the same workspace.' },
];

const ROLES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="#00D4AA" strokeWidth="1.5"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00D4AA" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Project Owner',
    desc: 'Executive-level view across all active projects. Cost vs. actual tracking, milestone status, and AI risk flags.',
    features: ['Portfolio cost dashboard', 'Milestone & delay alerts', 'Budget vs. actual', 'AI risk summary'],
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" stroke="#F59E0B" strokeWidth="1.5"/>
        <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM3 5h11M3 10h6M3 15h11M3 20h11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9.5 15c-.83 0-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5c0-.83-.67-1.5-1.5-1.5z" stroke="#F59E0B" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Site Engineer',
    desc: 'Estimation, Gantt management, daily log approval, and RFI coordination from a single project workspace.',
    features: ['Cost estimation tool', 'Gantt editing & delays', 'Log approval queue', 'RFI escalation'],
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#3B8BFF" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="#3B8BFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Site Worker',
    desc: 'Mobile-first daily log submission with photo uploads. Safety incident reporting that reaches the right engineer instantly.',
    features: ['Daily log (photo + notes)', 'Safety incident report', 'Emergency alert', 'Work confirmation'],
  },
];

const MARQUEE_ITEMS = [
  'CPWD DSR 2024', 'RSMeans Q4', 'AI Cost Estimation', 'Auto Gantt', 'Source Citations',
  'Daily Logs', 'RFI Workflow', 'Safety Reporting', 'Role-Based Access', 'Document Management',
  '±8% Accuracy', '60-Second Plans', 'Indian Standards', 'Project Memory', 'AI Copilot',
];

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function LandingPage() {
  const navScrolled = useNavScroll();
  useReveal();

  const scrollToFeatures = useCallback(() => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="lp3">
      {/* ── NAV ── */}
      <nav className={`lp3-nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="lp3-nav-inner">
          <a href="/" className="lp3-logo">
            <div className="lp3-logo-mark"><IconSanrachna /></div>
            <div>
              <div className="lp3-logo-name">Sanrachna</div>
              <div className="lp3-logo-sub">संरचना · Construction Intelligence</div>
            </div>
          </a>
          <div className="lp3-nav-links">
            {['Features', 'How it works', 'Roles', 'Platform'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="lp3-nav-link">{l}</a>
            ))}
          </div>
          <div className="lp3-nav-ctas">
            <a href="/login" className="lp3-btn-ghost">Log in</a>
            <a href="/signup" className="lp3-btn-primary"><span>Start free</span> <IconArrow /></a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp3-hero">
        <div className="lp3-hero-photo" />
        <div className="lp3-hero-vignette" />
        <div className="lp3-hero-grid-lines" />
        <div className="lp3-hero-inner">
          {/* Left */}
          <div>
            <div className="lp3-hero-eyebrow">
              <div className="lp3-live-dot" />
              CPWD DSR 2024 · AI estimation engine
            </div>
            <h1 className="lp3-hero-h1">
              <em>60 seconds.</em>
              <span>Full project plan.</span>
            </h1>
            <p className="lp3-hero-sub">
              Sanrachna compresses 2–3 days of pre-construction planning into a single session.
              AI cost estimation grounded in Indian standards. Auto-generated Gantt. 
              Everything your team needs to start building — in under a minute.
            </p>
            <div className="lp3-hero-actions">
              <a href="/signup" className="lp3-hero-btn-primary">
                <IconPlay /> Start estimating free
              </a>
              <button className="lp3-hero-btn-outline" onClick={scrollToFeatures}>
                See how it works <IconArrow />
              </button>
            </div>
            <div className="lp3-hero-trust">
              <div className="lp3-hero-trust-item">
                <span className="lp3-hero-trust-icon"><IconCPWD /></span>
                CPWD DSR grounded
              </div>
              <div className="lp3-hero-trust-item">
                <span className="lp3-hero-trust-icon"><IconClock /></span>
                ±8% accuracy
              </div>
              <div className="lp3-hero-trust-item">
                <span className="lp3-hero-trust-icon"><IconShield /></span>
                Source-cited output
              </div>
            </div>
          </div>
          {/* Right — terminal */}
          <TerminalPanel />
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="lp3-marquee-strip">
        <div className="lp3-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} className="lp3-marquee-item">
              <span className="lp3-marquee-sep">✦</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="lp3-stats-row">
        <div className="lp3-stats-inner">
          {[
            { v: 60, s: 's', label: 'Time to full project plan', sub: 'from zero to Gantt' },
            { v: 8, s: '%', p: '±', label: 'Estimation accuracy', sub: 'CPWD DSR grounded' },
            { v: 3, s: ' roles', label: 'Tailored interfaces', sub: 'Owner, Engineer, Worker' },
            { v: 100, s: '%', label: 'Source-cited answers', sub: 'every AI output auditable' },
          ].map((stat, i) => (
            <div key={i} className="lp3-stat">
              <div className="lp3-stat-val">
                <CountUp target={stat.v} suffix={stat.s} prefix={stat.p ?? ''} />
              </div>
              <div className="lp3-stat-lbl">{stat.label}</div>
              <div className="lp3-stat-sub">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CAPABILITIES ── */}
      <section className="lp3-section" id="features">
        <div className="lp3-section-inner">
          <div className="lp3-reveal">
            <div className="lp3-section-kicker">Platform Capabilities</div>
            <h2 className="lp3-section-h2">Everything a construction project needs.</h2>
            <p className="lp3-section-p">
              From first estimate to final handover — every workflow in one workspace. No spreadsheets, no WhatsApp chains, no information buried in email.
            </p>
          </div>
          <div className="lp3-cap-grid">
            {CAPABILITIES.map((cap, i) => (
              <div key={i} className={`lp3-cap-card lp3-reveal lp3-reveal-d${(i % 6) + 1}`}
                style={{ '--cap-accent': cap.accent } as React.CSSProperties}>
                <div className="lp3-cap-icon" style={{ background: `${cap.accent}12`, borderColor: `${cap.accent}25` }}>
                  {cap.icon}
                </div>
                <div className="lp3-cap-title">{cap.title}</div>
                <div className="lp3-cap-desc">{cap.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp3-section" id="how-it-works" style={{ paddingTop: 0 }}>
        <div className="lp3-section-inner">
          <div className="lp3-reveal">
            <div className="lp3-section-kicker">How It Works</div>
            <h2 className="lp3-section-h2">From parameters to plan in one session.</h2>
            <p className="lp3-section-p">
              The manual flow takes 2–3 days and three Excel files. Sanrachna collapses it to under 60 seconds, then keeps the team aligned through execution.
            </p>
          </div>
          <div className="lp3-flow">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className={`lp3-flow-step lp3-reveal lp3-reveal-d${i + 1}`}>
                <div className="lp3-flow-num">Step {step.n}</div>
                <div className="lp3-flow-title">{step.title}</div>
                <div className="lp3-flow-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM PROOF ── */}
      <div className="lp3-proof-wrap" id="platform">
        <div className="lp3-proof-inner">
          <div className="lp3-proof-card lp3-reveal">
            <div className="lp3-proof-content">
              <div className="lp3-section-kicker">Indian-First</div>
              <h2 className="lp3-section-h2" style={{ fontSize: 'clamp(1.7rem, 2.8vw, 2.2rem)' }}>
                Built for CPWD DSR.<br />Not adapted from it.
              </h2>
              <p className="lp3-section-p" style={{ marginTop: 12, fontSize: 15 }}>
                Every other platform uses generic Western unit costs. Sanrachna's AI estimation engine is grounded in CPWD DSR 2024 and Indian labor market data — the only platform that can cite the exact schedule of rate behind every number it produces.
              </p>
              <div className="lp3-check-list">
                {[
                  'CPWD DSR 2024 — full schedule of rates',
                  'RSMeans Q4 cross-reference for material validation',
                  'Indian labor market composite rates',
                  'Audit trail to specific DSR section per line item',
                  'Monsoon-season schedule adjustment model',
                ].map((item, i) => (
                  <div key={i} className="lp3-check-item">
                    <div className="lp3-check-mark"><IconCheck /></div>
                    {item}
                  </div>
                ))}
              </div>
              <a href="/signup" className="lp3-hero-btn-primary" style={{ display: 'inline-flex' }}>
                Run your first estimate <IconArrow />
              </a>
            </div>
            <div className="lp3-proof-img-wrap">
              <img src="/hero-night.png" alt="Indian construction site at night with active cranes and steel framework" className="lp3-proof-img" />
              <div className="lp3-proof-img-overlay" />
            </div>
          </div>
        </div>
      </div>

      {/* ── ROLES ── */}
      <section className="lp3-section" id="roles" style={{ paddingTop: 0 }}>
        <div className="lp3-section-inner">
          <div className="lp3-reveal">
            <div className="lp3-section-kicker">Role-Based Access</div>
            <h2 className="lp3-section-h2">The right view for every person on the project.</h2>
            <p className="lp3-section-p">
              Owner, Engineer, and Worker each get a tailored interface — nothing irrelevant, nothing hidden. One project, three perspectives, zero confusion.
            </p>
          </div>
          <div className="lp3-roles-grid">
            {ROLES.map((role, i) => (
              <div key={i} className={`lp3-role-card lp3-reveal lp3-reveal-d${i + 1}`}>
                <div className="lp3-role-icon-wrap">{role.icon}</div>
                <div className="lp3-role-title">{role.title}</div>
                <div className="lp3-role-desc">{role.desc}</div>
                <div className="lp3-role-features">
                  {role.features.map((feat, j) => (
                    <div key={j} className="lp3-role-feat">
                      <IconCheck />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTRIBUTORS STRIP ── */}
      <div className="lp3-contrib">
        <div className="lp3-contrib-inner lp3-reveal">
          <div>
            <div className="lp3-contrib-h">Built by people who understand construction.</div>
            <div className="lp3-contrib-p">
              Sanrachna is designed with Indian SME contractors in mind — not adapted from a Western enterprise tool. Every workflow reflects how construction actually works on Indian sites.
            </div>
          </div>
          <a href="/signup" className="lp3-hero-btn-primary" style={{ flexShrink: 0 }}>
            Join the platform <IconArrow />
          </a>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="lp3-cta">
        <div className="lp3-cta-inner lp3-reveal">
          <div className="lp3-cta-photo" />
          <div className="lp3-cta-overlay" />
          <div className="lp3-cta-grid" />
          <div className="lp3-cta-top-line" />
          <div className="lp3-cta-glow" />
          <div className="lp3-cta-content">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(0,212,170,0.25)',
              background: 'rgba(0,212,170,0.08)', marginBottom: 20 }}>
              <div className="lp3-live-dot" />
              <span style={{ fontFamily: 'var(--s-ff-mono)', fontSize: 11, color: 'var(--s-green)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Free to start
              </span>
            </div>
            <h2 className="lp3-cta-h">
              Your next project starts<br />with one estimate.
            </h2>
            <p className="lp3-cta-p">
              Sign up, enter your project parameters, and see a CPWD-grounded cost estimate and Gantt in under 60 seconds. Share it with your team. Start building.
            </p>
            <div className="lp3-cta-btns">
              <a href="/signup" className="lp3-cta-btn-1">
                <IconPlay /> Start estimating — it's free
              </a>
              <a href="/login" className="lp3-cta-btn-2">
                Log in to your project <IconArrow />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp3-footer">
        <div className="lp3-footer-inner">
          <div>
            <div className="lp3-footer-brand">
              <div className="lp3-logo-mark" style={{ width: 30, height: 30 }}><IconSanrachna /></div>
              <div>
                <div style={{ fontFamily: 'var(--s-ff-display)', fontWeight: 800, fontSize: 15, letterSpacing: '-0.03em' }}>Sanrachna</div>
                <div style={{ fontFamily: 'var(--s-ff-mono)', fontSize: 10, color: 'var(--s-text-3)', letterSpacing: '0.3px' }}>संरचना · Construction Intelligence</div>
              </div>
            </div>
            <div className="lp3-footer-desc">
              AI-powered construction project management for Indian SMEs. Cost estimation, Gantt planning, daily site intelligence — unified in one platform.
            </div>
            <div className="lp3-footer-tags">
              {['CPWD DSR 2024', 'RSMeans', 'India-First', 'Source-Cited AI'].map(t => (
                <span key={t} className="lp3-footer-tag">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="lp3-footer-col-h">Platform</div>
            <div className="lp3-footer-links">
              {['AI Estimation', 'Gantt Planning', 'Daily Logs', 'AI Copilot', 'Safety & RFI', 'Documents'].map(l => (
                <a key={l} href="#features" className="lp3-footer-link">{l}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="lp3-footer-col-h">Company</div>
            <div className="lp3-footer-links">
              {['About', 'Blog', 'Changelog', 'Contact'].map(l => (
                <a key={l} href="#" className="lp3-footer-link">{l}</a>
              ))}
            </div>
            <div className="lp3-footer-col-h" style={{ marginTop: 32 }}>Get started</div>
            <div className="lp3-footer-links">
              <a href="/signup" className="lp3-footer-link" style={{ color: 'var(--s-green)' }}>
                <span>→</span> Sign up free
              </a>
              <a href="/login" className="lp3-footer-link">Log in</a>
            </div>
          </div>
        </div>
        <div className="lp3-footer-bottom">
          <span>© 2025 Sanrachna. All rights reserved.</span>
          <div className="lp3-footer-bottom-links">
            <a href="#" className="lp3-footer-bottom-link">Privacy</a>
            <a href="#" className="lp3-footer-bottom-link">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
