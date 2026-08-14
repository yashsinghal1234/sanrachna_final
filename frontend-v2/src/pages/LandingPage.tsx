import { useEffect } from 'react';
import '../landing.css';

// SVGs for complex image masking (wavy shapes)
const SVGDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <clipPath id="wavyMaskTop" clipPathUnits="objectBoundingBox">
        <path d="M0,0.1 Q0.25,-0.05 0.5,0.05 T1,0 L1,1 L0,1 Z" />
      </clipPath>
      <clipPath id="wavyMaskCase" clipPathUnits="objectBoundingBox">
        <path d="M0,0 Q0.25,-0.05 0.5,0.05 T1,0 L1,1 Q0.75,1.05 0.5,0.95 T0,1 Z" />
      </clipPath>
    </defs>
  </svg>
);

const IconArrowRight = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function LandingPage() {
  useEffect(() => {
    // Optionally add scroll animations here
  }, []);

  return (
    <div className="dnoin-landing">
      <SVGDefs />

      {/* ── HERO SECTION ── */}
      <section className="dnoin-hero">
        <div className="dnoin-hero-img-container">
          <img src="/dnoin-hero.jpg" alt="Sanrachna Background" className="dnoin-hero-bg" />
          <div className="dnoin-hero-overlay" />
          
          {/* Nav */}
          <nav className="dnoin-nav">
            <div className="dnoin-nav-inner">
              <a href="/" className="dnoin-nav-logo">Sanrachna</a>
              <div className="dnoin-nav-links">
                <a href="#features" className="dnoin-nav-link">Features</a>
                <a href="#about" className="dnoin-nav-link">About platform</a>
                <a href="#roles" className="dnoin-nav-link">Roles</a>
                <a href="#contact" className="dnoin-nav-link">Contact</a>
              </div>
              <a href="/login" className="dnoin-nav-btn">
                Log in
                <span className="dnoin-nav-btn-icon"><IconArrowRight /></span>
              </a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="dnoin-hero-content">
            <div className="dnoin-hero-left">
              <p className="dnoin-hero-p">
                Sanrachna collapses 2–3 days of manual pre-construction planning into a single seamless, AI-driven workflow.
              </p>
              <h1 className="dnoin-h1 dnoin-serif">
                Construction
                <span className="dnoin-hero-title-italic">Intelligence</span>
              </h1>
              <a href="/signup" className="dnoin-hero-contact">
                Start estimating free
                <span className="dnoin-hero-contact-icon"><IconArrowRight /></span>
              </a>
            </div>
            
            <div className="dnoin-hero-right">
              <h3 className="dnoin-serif">Project<br/>Management</h3>
              <p>
                An AI-powered ecosystem designed to streamline planning, workforce coordination, and cost estimation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section id="about" className="dnoin-about">
        <div className="dnoin-label">About Us</div>
        <div className="dnoin-about-text">
          Sanrachna is an intelligent construction platform bridging communication and operational gaps between owners, engineers, and on-site workers.
        </div>
      </section>

      {/* ── PLATFORM FEATURES ── */}
      <section id="features" className="dnoin-projects">
        <div className="dnoin-projects-header">
          <h2 className="dnoin-h2 dnoin-serif">Platform<br/><span style={{fontStyle:'italic'}}>Features</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px' }}>
            <p className="dnoin-projects-desc">
              Our suite of tools ensures that from the first estimate to the final handover, every step is tracked, optimized, and fully auditable by your team.
            </p>
            <a href="/features" className="dnoin-view-all">
              Explore All Tools
              <span className="dnoin-view-all-icon"><IconArrowRight /></span>
            </a>
          </div>
        </div>

        <div className="dnoin-projects-grid">
          {[
            { img: '/dnoin-project1.jpg', loc: 'CPWD DSR 2024', title: 'Smart Estimation Engine' },
            { img: '/dnoin-project2.jpg', loc: 'Automated Scheduling', title: 'Intelligent Timeline' },
            { img: '/dnoin-project3.jpg', loc: 'Site-to-Office', title: 'Real-time Progress Tracking' }
          ].map((proj, i) => (
            <div key={i} className="dnoin-project-card">
              <div className="dnoin-project-img-wrap">
                <img src={proj.img} alt={proj.title} className="dnoin-wavy-top" />
              </div>
              <div className="dnoin-project-location">{proj.loc}</div>
              <div className="dnoin-project-title dnoin-serif">{proj.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DESIGNED FOR SECTION ── */}
      <section id="roles" className="dnoin-architects">
        <div className="dnoin-architects-inner">
          <div className="dnoin-label">User Roles</div>
          <div className="dnoin-arch-list">
            {[
              { name: 'Project Owner', desc: 'Executive-level view across all active projects. Cost vs. actual tracking and AI risk flags.' },
              { name: 'Site Engineer', desc: 'Estimation, Gantt management, daily log approval, and RFI coordination from a single workspace.', img: '/dnoin-arch.jpg' },
              { name: 'Site Worker', desc: 'Mobile-first daily log submission with photo uploads and instant safety incident reporting.' }
            ].map((role, i) => (
              <div key={i} className="dnoin-arch-item">
                {role.img && <img src={role.img} alt={role.name} className="dnoin-arch-hover-img" />}
                <div className="dnoin-arch-name dnoin-serif">{role.name}</div>
                <div className="dnoin-arch-desc">{role.desc}</div>
                <a href="#" className="dnoin-arch-link">View Capabilities</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES ── */}
      <section className="dnoin-categories">
        <div className="dnoin-cat-img-wrap">
          <img src="/dnoin-categories.jpg" alt="Categories" className="dnoin-cat-bg" />
          <div className="dnoin-cat-overlay" />
          
          <div className="dnoin-cat-content">
            <h2 className="dnoin-h1 dnoin-serif">Core<br/><span style={{fontStyle:'italic'}}>Capabilities</span></h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
              <div className="dnoin-cat-list">
                <div className="dnoin-cat-item">AI Copilot Integration</div>
                <div className="dnoin-cat-item">Centralized Document Management</div>
                <div className="dnoin-cat-item">Safety & Emergency Workflows</div>
                <div className="dnoin-cat-item">Issue Tracking System</div>
              </div>
              <a href="/contact" className="dnoin-hero-contact" style={{ marginTop: 0 }}>
                Request a demo
                <span className="dnoin-hero-contact-icon"><IconArrowRight /></span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM HIGHLIGHTS ── */}
      <section className="dnoin-cases">
        <div className="dnoin-label">Platform Highlights</div>
        
        <div className="dnoin-case-item">
          <div className="dnoin-case-info">
            <div className="dnoin-case-title">Built for Indian Standards</div>
            <div className="dnoin-case-desc">Every other platform uses generic Western unit costs. Sanrachna's AI estimation engine is grounded entirely in CPWD DSR 2024 and local labor market data.</div>
            <a href="/signup" className="dnoin-view-all">
              Try Estimation
              <span className="dnoin-view-all-icon"><IconArrowRight /></span>
            </a>
          </div>
          <div className="dnoin-case-img-wrap">
            <img src="/dnoin-case1.jpg" alt="Built for Indian Standards" className="dnoin-case-img" />
          </div>
        </div>

        <div className="dnoin-case-item">
          <div className="dnoin-case-info">
            <div className="dnoin-case-title">±8% Accuracy in 60 Seconds</div>
            <div className="dnoin-case-desc">Sign up, enter your project parameters, and see a highly accurate, source-cited cost estimate and intelligent Gantt chart in under a minute.</div>
            <a href="/signup" className="dnoin-view-all">
              Start Building
              <span className="dnoin-view-all-icon"><IconArrowRight /></span>
            </a>
          </div>
          <div className="dnoin-case-img-wrap">
            <img src="/dnoin-case2.jpg" alt="High Accuracy" className="dnoin-case-img" />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="dnoin-footer">
        <div className="dnoin-footer-inner">
          <div className="dnoin-footer-left">
            <div className="dnoin-footer-logo dnoin-serif">Sanrachna</div>
            <p className="dnoin-footer-desc">
              AI-powered construction project management for Indian SMEs. Cost estimation, Gantt planning, daily site intelligence — unified in one platform.
            </p>
          </div>
          <div className="dnoin-footer-links-grid">
            <div>
              <h4>Platform</h4>
              <a href="#features">AI Estimation</a>
              <a href="#features">Gantt Planning</a>
              <a href="#roles">Daily Logs</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#">Blog</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
        </div>
        <div className="dnoin-footer-bottom">
          <span>© 2025 Sanrachna. All rights reserved.</span>
          <div className="dnoin-footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
      
    </div>
  );
}

export default LandingPage;
