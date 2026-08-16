import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FolderOpen, ChevronRight, Star } from 'lucide-react';
import { SiZoom, SiGooglemeet, SiAppstore, SiZapier, SiZendesk } from 'react-icons/si';
import { FaSalesforce } from 'react-icons/fa';

const roles = [
  {
    id: "ai-planning",
    title: "AI Construction Planning",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
    desc: "Generate complete construction plans instantly. Our AI automatically optimizes cost estimation, resource allocation, and timeline mapping before ground is even broken."
  },
  {
    id: "attendance",
    title: "Workforce Attendance",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    desc: "Track your crew effortlessly. Manage daily worker attendance, log subcontractor hours, and simplify your field payroll directly from the site."
  },
  {
    id: "daily-logs",
    title: "Daily Work Records",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
    desc: "Never miss a site update. Easily log daily work progress, track material arrivals, and record site conditions to maintain a bulletproof single source of truth."
  },
  {
    id: "cost-resources",
    title: "Cost & Resource Tracking",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>,
    desc: "Protect your profit margins. Monitor budget burn rates and resource utilization in real-time to catch overruns before they impact the bottom line."
  },
  {
    id: "search",
    title: "Semantic Search",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    desc: "Find answers in seconds. Query your blueprints, contracts, and safety logs naturally to get precise, cited answers without manual digging."
  },
  {
    id: "safety",
    title: "Safety & Compliance",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>,
    desc: "Prevent incidents before they occur. Surface recurring hazards and maintain a verifiable, OSHA-compliant paper trail for every site zone."
  }
];

export function LandingPage() {
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const rolesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger when the element crosses the 40% mark of the screen height
      const triggerPoint = window.innerHeight * 0.4;
      let closestIndex = 0;
      let minDistance = Infinity;

      rolesRef.current.forEach((ref, index) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        // Measure distance from the top of the element to our trigger point
        const distance = Math.abs(rect.top - triggerPoint);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      setActiveRoleIndex(prev => prev !== closestIndex ? closestIndex : prev);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check on initial load

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-page-ink font-inter text-snow blueprint-grid relative selection:bg-blue-cornflower/30 overflow-x-hidden">
      
      {/* ── TOP NAV ── */}
      <nav className="flex items-center justify-between px-6 md:px-12 w-full mx-auto relative z-10 pt-10 pb-5">
        <div className="flex items-center gap-10">
          <Link to="/" className="text-xl font-bold tracking-tight text-snow flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-snow">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Sanrachna
          </Link>
          <div className="hidden md:flex items-center gap-12">
            <a href="#product" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Product</a>
            <a href="#solutions" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Solutions</a>
            <a href="#resources" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Resources</a>
            <a href="#enterprise" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Enterprise</a>
            <a href="#customers" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Customers</a>
            <a href="#pricing" className="text-[16px] font-medium text-snow hover:text-ash transition-colors">Pricing</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-[14px] font-medium text-snow hover:text-ash transition-colors hidden sm:block">Log in</Link>
          <Link to="/signup" className="bg-snow text-page-ink px-5 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Let's Connect</Link>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="min-h-[calc(100vh-80px)] flex flex-col justify-center pt-10 pb-20 px-6 text-center max-w-full mx-auto relative z-10 overflow-hidden">
        <div className="max-w-[1440px] mx-auto w-full">
          <h1 className="text-[64px] md:text-[110px] lg:text-[120px] font-semibold leading-none tracking-[-3px] text-snow w-full mx-auto flex flex-col items-center justify-center relative">
            <span className="relative z-0">Build with facts,</span>
            <span className="flex items-center justify-center gap-2 md:gap-4 mt-[-5px] md:mt-[-20px] lg:mt-[-24px] relative z-10">
              not 
              <img 
                src="/blue-keycap.png" 
                alt="Blue Keycap" 
                className="w-20 h-20 md:w-[130px] md:h-[130px] lg:w-[140px] lg:h-[140px] mx-1 md:mx-3 transform -rotate-[6deg] hover:rotate-0 transition-transform duration-300 drop-shadow-2xl" 
              />
              <span className="font-retro font-normal tracking-wide text-[80px] md:text-[130px] lg:text-[140px] ml-1">vibes</span>
            </span>
          </h1>
          
          <p className="mt-10 text-[18px] md:text-[24px] font-normal text-ash max-w-[900px] mx-auto tracking-[-0.2px] leading-[1.4]">
            One platform for every site signal. Sanrachna's AI turns CPWD benchmarks, field logs, and daily reports into answers your estimators and site engineers can act on.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto bg-snow text-page-ink px-6 py-3.5 rounded-[8px] text-[15px] font-medium hover:opacity-90 transition-opacity">
              Let's Connect
            </Link>
            <Link to="/signup" className="w-full sm:w-auto bg-transparent border border-graphite text-snow px-6 py-3.5 rounded-[8px] text-[15px] font-medium hover:bg-card-carbon transition-colors">
              Try Sanrachna free
            </Link>
          </div>
        </div>

        {/* ── INDUSTRIES ── */}
        <div className="mt-20 md:mt-32 w-full border-t border-white/5 pt-8 flex flex-col items-center overflow-hidden relative">
          <span className="text-[11px] font-mono text-ash tracking-[0.2em] uppercase mb-16 mt-8 md:mt-12 relative z-20">Built for modern teams in</span>
          
          {/* Gradient masks for smooth edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-page-ink to-transparent z-10 pointer-events-none mt-16"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-page-ink to-transparent z-10 pointer-events-none mt-16"></div>

          <div className="flex whitespace-nowrap animate-[scrollX_100s_linear_infinite] w-max opacity-60 mix-blend-screen text-snow hover:[animation-play-state:paused]">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex items-center gap-12 md:gap-20 px-6 md:px-10 flex-shrink-0">
                <div className="text-[18px] md:text-[24px] font-bold tracking-tighter">Construction</div>
                <div className="text-[20px] md:text-[26px] font-serif italic">Infrastructure</div>
                <div className="text-[16px] md:text-[20px] font-mono tracking-tight uppercase">Engineering</div>
                <div className="text-[18px] md:text-[22px] font-medium tracking-[0.2em] uppercase">Architecture</div>
                <div className="text-[20px] md:text-[26px] font-serif font-bold">Operations</div>
                <div className="text-[18px] md:text-[22px] font-bold flex items-center gap-2">
                  <span className="text-blue-500">+</span> Safety
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 text-left">
        <h2 className="text-heading md:text-[48px] font-semibold leading-tight tracking-[-0.84px] text-snow max-w-[900px] mb-20 text-left">
          <span className="whitespace-nowrap">Sanrachna transforms <FolderOpen className="inline size-8 md:size-10 text-ash mx-1 -mt-2" /> <span className="font-retro tracking-wide text-[1.1em] inline-block transform -translate-y-1.5">fragmented</span></span> <br className="hidden md:block" />
          construction data into decision-ready <Sparkles className="inline size-8 md:size-10 text-blue-cornflower mx-1 fill-blue-cornflower -mt-2" /> intelligence automatically, <br className="hidden md:block" />
          across your whole organization.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-[1000px]">
          {/* Stat 1 */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-blue-500 text-[48px] font-retro leading-none">↑</span>
              <span className="text-[72px] font-retro font-normal tracking-wide text-snow leading-none">2.3x</span>
            </div>
            <h4 className="text-snow font-medium text-[16px] mb-2">Faster RFI Resolutions</h4>
            <p className="text-ash text-[14px]">AI auto-drafts answers from past field logs and site specs.</p>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-blue-500 text-[48px] font-retro leading-none">↑</span>
              <span className="text-[72px] font-retro font-normal tracking-wide text-snow leading-none">30hrs</span>
            </div>
            <h4 className="text-snow font-medium text-[16px] mb-2">Saved per site manager</h4>
            <p className="text-ash text-[14px]">Automated safety reports give your team a full workweek back.</p>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-blue-500 text-[48px] font-retro leading-none">↑</span>
              <span className="text-[72px] font-retro font-normal tracking-wide text-snow leading-none">66%</span>
            </div>
            <h4 className="text-snow font-medium text-[16px] mb-2">Fewer compliance issues</h4>
            <p className="text-ash text-[14px]">Proactive hazard detection from daily intelligence.</p>
          </div>
        </div>
        
        <div className="mt-20 text-left w-full">
          <p className="text-snow font-semibold text-[16px] mb-1">Faster decisions. Less guesswork. Verified by leading contractors.</p>
          <a href="https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-in-construction-market" target="_blank" rel="noopener noreferrer" className="text-ash hover:text-snow text-[14px] transition-colors flex items-center gap-1">Read the 2024 AI in Construction Market Report (Grand View Research) <span className="ml-1">→</span></a>
        </div>
      </section>

      {/* ── MID-PAGE CTA ── */}
      <section className="my-32 py-40 px-10 md:px-24 lg:px-32 text-center max-w-[1200px] mx-auto relative z-10 border-t border-steel-border">
        <h2 className="text-[48px] md:text-[72px] lg:text-[88px] font-semibold leading-[1.1] tracking-[-3px] text-snow mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-12">
          <span>Equip</span>
          <img src="/images/enter-key.png" alt="Enter" className="h-[40px] md:h-[60px] mx-1 transform -rotate-2" />
          <span>every team with</span>
          <span>jobsite</span>
          <img src="/images/blue-lightning.png" alt="Lightning" className="h-[48px] md:h-[72px] mx-1 transform rotate-12" />
          <span className="font-retro tracking-wide text-[1em] md:text-[1.1em] ml-1 transform -translate-y-1">intelligence</span>
        </h2>

        <p className="text-body text-ash mb-10 max-w-[700px] mx-auto">
          Construction data lives across dozens of tools, belongs to different teams, and takes weeks to make sense of. Sanrachna is the AI platform that unifies it all—turning fragmented field signals into strategic alignment, across every project.
        </p>

        <div className="flex gap-6 justify-center mt-12 relative z-20">
          <Link to="/signup" className="bg-snow text-page-ink px-8 py-4 rounded-[8px] text-[16px] font-semibold hover:opacity-90 transition-opacity">Let's Connect</Link>
          <Link to="/signup" className="bg-transparent border border-graphite text-snow px-8 py-4 rounded-[8px] text-[16px] font-semibold hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
        </div>


      </section>

      {/* ── CENTRALIZE SECTION ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border" id="product">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
          <div className="flex-1">
            <h2 className="text-[64px] md:text-[80px] font-semibold tracking-[-2px] text-snow flex items-start gap-1 mb-6 leading-none">
              Centralize <span className="text-blue-500 text-[24px] md:text-[32px] font-retro tracking-normal leading-none mt-3">01</span>
            </h2>
            <h3 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-6 max-w-[400px]">
              Native integrations with your core construction tech stack
            </h3>
            <p className="text-body text-ash mb-8 max-w-[480px]">
              Every field update, in context—who logged it, when, and how it impacts the project. Sanrachna connects your PM software, drawing management, and site tools, automatically linking
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-8 mt-6">
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <FaSalesforce className="size-5 text-[#00A1E0]" />
              </div>
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <SiZoom className="size-5 text-[#2D8CFF]" />
              </div>
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <SiGooglemeet className="size-5 text-[#00A36C]" />
              </div>
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <SiAppstore className="size-5 text-[#007AFF]" />
              </div>
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <SiZapier className="size-5 text-[#FF4A00]" />
              </div>
              <div className="size-10 bg-[#1A1A1A] rounded-[10px] flex items-center justify-center shadow-lg border border-white/5">
                <SiZendesk className="size-5 text-[#03363D]" />
              </div>
            </div>
            <a href="#" className="text-[14px] font-medium text-snow hover:text-blue-cornflower transition-colors flex items-center gap-1">
              Discover all integrations <ChevronRight className="size-4" />
            </a>
          </div>
          
          <div className="flex-1 flex justify-center items-center relative w-full aspect-square max-w-[500px]">
            {/* Orbiting Logo Graphic */}
            <div className="absolute inset-0 border border-steel-border/30 rounded-full animate-[spin_60s_linear_infinite]"></div>
            <div className="absolute inset-[15%] border border-steel-border/30 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
            <div className="absolute inset-[30%] border border-steel-border/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
            
            <div className="z-10 bg-card-carbon rounded-[16px] p-6 shadow-2xl border border-steel-border relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 drop-shadow-md">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>

            {/* Orbiting Icons */}
            <div className="absolute top-[10%] left-[20%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><FaSalesforce className="size-7 text-[#00A1E0]" /></div>
            <div className="absolute top-[5%] right-[30%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><SiZoom className="size-7 text-[#2D8CFF]" /></div>
            <div className="absolute bottom-[20%] left-[10%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><SiGooglemeet className="size-7 text-[#00A36C]" /></div>
            <div className="absolute bottom-[10%] right-[25%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><SiAppstore className="size-7 text-[#007AFF]" /></div>
            <div className="absolute top-[40%] right-[5%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><SiZapier className="size-7 text-[#FF4A00]" /></div>
            <div className="absolute bottom-[40%] left-[5%] size-14 bg-card-carbon rounded-[12px] border border-steel-border flex items-center justify-center shadow-lg"><SiZendesk className="size-7 text-[#03363D]" /></div>
          </div>
        </div>
      </section>

      {/* ── ANALYZE SECTION ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
        <div className="mb-16">
          <h2 className="text-display font-semibold tracking-[-2.3px] text-snow flex items-start gap-1 mb-6">
            Analyze <span className="text-blue-cornflower text-[24px] font-retro tracking-normal leading-none mt-4">02</span>
          </h2>
          <h3 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-6 max-w-[600px]">
            AI analysis grounded in evidence
          </h3>
          <p className="text-body text-ash mb-6 max-w-[640px]">
            What once took weeks happens in minutes. Sanrachna's AI automatically surfaces trends, themes, and signals across your entire project lifecycle—from supplier quotes and budget estimates to RFIs and site logs—so your team spends time on decisions, not synthesis.
          </p>
          <div className="flex gap-4">
            <Link to="/signup" className="bg-snow text-page-ink px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Let's Connect</Link>
            <Link to="/signup" className="bg-transparent border border-graphite text-snow px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card 1: AI Projects */}
          <div className="bg-card-carbon rounded-[8px] border border-steel-border p-6 flex flex-col h-auto lg:h-[540px]">
            <div className="bg-[#111] border border-steel-border rounded-[8px] flex-1 mb-8 overflow-hidden relative shadow-2xl flex flex-col min-h-[250px]">
              <div className="p-4 border-b border-steel-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-5 rounded-full border border-blue-cornflower flex items-center justify-center"><div className="size-2 bg-blue-cornflower rounded-full"></div></div>
                  <span className="text-[12px] font-medium text-snow">Site Engineer Log</span>
                </div>
                <div className="flex gap-2">
                  <div className="size-6 bg-graphite rounded-full"></div>
                  <div className="size-6 bg-graphite rounded-full flex items-center justify-center text-[10px] text-snow">4</div>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-4 relative">
                <div className="w-full aspect-video bg-steel-border/30 rounded-[8px] mb-4 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&h=300&fit=crop" alt="Construction Site" className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-6 bg-graphite rounded-full overflow-hidden"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" className="w-full h-full object-cover"/></div>
                  <div className="text-[12px] text-snow">Vikram Singh</div>
                </div>
                <div className="text-[12px] text-ash">Concrete pour delayed due to heavy rain. We will need to adjust...</div>
              </div>
            </div>
            <div>
              <h4 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-2 flex items-center gap-2">
                <div className="size-5 rounded-full border-2 border-blue-cornflower flex items-center justify-center"><div className="size-2 bg-blue-cornflower rounded-full"></div></div>
                Daily Site Logs
              </h4>
              <p className="text-body text-ash mb-4">Transform raw site logs, photos, and voice notes into structured progress reports.</p>
              <a href="#" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-snow bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all duration-300 w-max mt-2">
                Explore log processing <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>

          {/* Card 2: AI Channels 2.0 */}
          <div className="bg-card-carbon rounded-[8px] border border-steel-border p-6 flex flex-col h-auto lg:h-[540px]">
            <div className="bg-[#111] border border-steel-border rounded-[8px] flex-1 mb-8 overflow-hidden shadow-2xl flex flex-col min-h-[250px]">
              <div className="p-4 border-b border-steel-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-5 bg-orange-600 rounded-[4px] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                  <span className="text-[12px] font-medium text-snow">RFI Escalations</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[12px] bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-900/50">Urgent</span>
                  <span className="text-[12px] text-ash px-3 py-1">Specs</span>
                </div>
              </div>
              <div className="p-6">
                <h5 className="text-[16px] font-semibold text-snow mb-4">Resolve structural delay on column C4</h5>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-yellow-900/30 text-yellow-500 text-[10px] px-2 py-0.5 rounded-[4px] uppercase border border-yellow-900/50 font-mono">In progress</span>
                  <span className="text-[12px] text-snow flex items-center gap-1"><div className="size-3 bg-blue-400 rounded-sm"></div> RFI-142</span>
                  <span className="text-[12px] text-snow flex items-center gap-1"><div className="size-3 bg-gray-400 rounded-full"></div> #4421</span>
                </div>
                <div className="flex gap-2 mb-6">
                  <span className="bg-blue-900/50 text-blue-400 text-[12px] px-3 py-1 rounded-full">Delay <span className="opacity-50">28</span></span>
                  <span className="bg-blue-900/50 text-blue-400 text-[12px] px-3 py-1 rounded-full">Cost <span className="opacity-50">11</span></span>
                  <span className="bg-blue-900/50 text-blue-400 text-[12px] px-3 py-1 rounded-full">Material <span className="opacity-50">4</span></span>
                  <span className="bg-steel-border text-snow text-[12px] px-3 py-1 rounded-full">+3</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-ash border-t border-steel-border pt-4">
                  <span>Evidence <strong className="text-snow">204</strong> <span className="text-green-500">↑ 8.8%</span></span>
                  <span>Sources <strong className="text-snow">2</strong></span>
                  <span>Impact <strong className="text-snow">High</strong></span>
                  <span>Cost Impact <strong className="text-snow">₹2.4L</strong></span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-2 flex items-center gap-2">
                <div className="size-5 bg-orange-600 rounded-[4px] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                Issue Tracker 2.0
              </h4>
              <p className="text-body text-ash mb-4">Automatically classify site issues and RFI delays, and predict cost implications over time.</p>
              <a href="#" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-snow bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all duration-300 w-max mt-2">
                View RFI workflows <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 3: AI Dashboards */}
        <div className="bg-card-carbon rounded-[8px] border border-steel-border p-6 flex flex-col md:flex-row gap-8 items-center h-auto md:h-[440px]">
          <div className="flex-1 w-full order-2 md:order-1">
            <h4 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-2 flex items-center gap-2">
              <div className="size-5 bg-green-600 rounded-[4px] grid grid-cols-2 gap-[1px] p-[2px]">
                <div className="bg-white rounded-[1px]"></div><div className="bg-white rounded-[1px]"></div>
                <div className="bg-white rounded-[1px]"></div><div className="bg-white rounded-[1px]"></div>
              </div>
              Budget Dashboards
            </h4>
            <p className="text-body text-ash mb-4 max-w-[400px]">Turn unstructured, qualitative data into quantitative charts to track cost overruns and material usage over time.</p>
            <a href="#" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-snow bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all duration-300 w-max mt-2">
              See cost analytics <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
          <div className="flex-[1.5] w-full bg-[#111] border border-steel-border rounded-[8px] h-full shadow-2xl p-6 flex flex-col sm:flex-row gap-4 order-1 md:order-2 overflow-hidden">
            {/* Fake Dashboard Charts */}
            <div className="flex-1 bg-card-carbon border border-steel-border rounded-[8px] p-4 flex flex-col">
              <div className="text-[12px] text-snow mb-6 flex justify-between"><span>Subcontractor Invoices</span> <span className="text-ash">This month</span></div>
              <div className="flex items-end gap-6 flex-1 pb-4">
                <div className="text-[48px] font-semibold text-snow leading-none">4.6<div className="text-[12px] text-red-500 font-normal mt-2">+13%</div></div>
                <div className="flex-1 flex flex-col gap-2 justify-end">
                  <div className="flex items-center gap-2"><div className="flex gap-1"><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/></div> <span className="text-[10px] text-ash">5</span> <div className="h-1.5 bg-blue-500 rounded-full flex-1 ml-2"></div> <span className="text-[10px] text-snow">75%</span></div>
                  <div className="flex items-center gap-2"><div className="flex gap-1 justify-end w-[60px]"><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/></div> <span className="text-[10px] text-ash">4</span> <div className="h-1.5 bg-blue-500 w-[20%] rounded-full ml-2"></div> <span className="text-[10px] text-snow">17%</span></div>
                  <div className="flex items-center gap-2"><div className="flex gap-1 justify-end w-[60px]"><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/><Star className="size-3 fill-snow text-snow"/></div> <span className="text-[10px] text-ash">3</span> <div className="h-1.5 bg-steel-border w-[5%] rounded-full ml-2"></div> <span className="text-[10px] text-ash">4%</span></div>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-card-carbon border border-steel-border rounded-[8px] p-4 flex flex-col relative">
              <div className="text-[12px] text-snow mb-6">Cost Overrun Predictions</div>
              <div className="flex-1 border-b border-l border-steel-border relative mt-4">
                {/* Fake line chart */}
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,80 Q10,70 20,90 T40,60 T60,80 T80,50 T100,70" fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                  <path d="M0,60 Q10,90 20,70 T40,90 T60,50 T80,80 T100,60" fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUERY SECTION ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
        <div className="mb-16">
          <h2 className="text-display font-semibold tracking-[-2.3px] text-snow flex items-start gap-1 mb-6">
            Query <span className="text-blue-cornflower text-[24px] font-retro tracking-normal leading-none mt-4">03</span>
          </h2>
          <h3 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-6 max-w-[600px]">
            AI Chatbot with CPWD DSR RAG Grounding
          </h3>
          <p className="text-body text-ash mb-9 max-w-[640px]">
            Chat with your project data like you'd message a 20-year veteran. Ask 'What is our estimated cost for flooring?' or 'Which tasks are delayed this week?'. Patterns that no single engineer could see on their own, answered instantly with RAG-grounded precision.
          </p>
          <div className="flex gap-4 mb-3">
            <Link to="/signup" className="bg-snow text-page-ink px-4 pt-[10px] pb-[11px] rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Let's Connect</Link>
            <Link to="/signup" className="bg-transparent border border-graphite text-snow px-4 pt-[10px] pb-[11px] rounded-[8px] text-[14px] font-medium hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
          </div>
        </div>

        {/* Large AI Chat Card */}
        <div className="bg-card-carbon rounded-[8px] border border-steel-border p-8 flex flex-col mb-16">
          <div className="bg-[#111] border border-steel-border rounded-[8px] flex-1 overflow-hidden relative shadow-2xl flex">
            {/* Sidebar */}
            <div className="w-[240px] border-r border-steel-border hidden md:flex flex-col p-4">
               <div className="flex items-center gap-2 text-[14px] text-snow mb-8 font-medium">
                 <div className="size-5 flex items-center justify-center"><Sparkles className="size-4 text-snow" /></div>
                 Chat
               </div>
               <div className="text-[12px] text-snow font-medium mb-6">New chat</div>
               <div className="text-[10px] text-ash mb-2">Today</div>
               <div className="bg-steel-border/50 text-snow text-[12px] p-2 rounded-[6px] mb-4">Analyze daily site logs</div>
               <div className="text-[10px] text-ash mb-2">Past 30 days</div>
               <div className="text-ash text-[12px] p-2 mb-1">RFI Escalation Q3...</div>
               <div className="text-ash text-[12px] p-2">CPWD DSR Guidelines</div>
            </div>
            {/* Main Chat Area */}
            <div className="flex-1 p-6 flex flex-col min-h-[400px]">
               <div className="flex justify-end gap-2 mb-6 opacity-70">
                 <div className="size-8 bg-card-carbon rounded-[6px] border border-steel-border flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></div>
                 <div className="size-8 bg-card-carbon rounded-[6px] border border-steel-border flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></div>
               </div>
               <div className="flex-1">
                 <p className="text-[14px] text-ash mb-4">Based on the attached daily logs and material invoices, the primary causes for the foundation delay are:</p>
                 <ul className="text-[14px] text-snow space-y-3 mb-6 list-disc pl-5">
                   <li>Subcontractor unavailability due to off-site labor shortages <span className="inline-flex bg-graphite/50 px-1 rounded ml-1"><div className="size-3 bg-snow rounded-full inline-block align-middle mr-1"></div><span className="text-[10px] align-middle">+2</span></span></li>
                   <li>Discrepancies between estimated and delivered M25 concrete <span className="inline-flex bg-graphite/50 px-1 rounded ml-1"><div className="size-3 bg-snow rounded-full inline-block align-middle"></div></span></li>
                   <li>Pending RFI approvals for the structural rebar design <span className="inline-flex bg-graphite/50 px-1 rounded ml-1"><div className="size-3 bg-snow rounded-full inline-block align-middle mr-1"></div><div className="size-3 bg-snow rounded-full inline-block align-middle mr-1"></div><span className="text-[10px] align-middle">+2</span></span></li>
                 </ul>
                 <div className="text-[14px] text-snow font-medium flex items-center gap-2 mb-4">3 site evidence files <ChevronRight className="size-4 rotate-90" /></div>
                 
                 {/* Video clip thumbs */}
                 <div className="flex gap-2 overflow-x-hidden">
                   <div className="w-[200px] aspect-video bg-steel-border/50 rounded-[8px] relative overflow-hidden">
                     <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&h=160&fit=crop" className="w-full h-full object-cover opacity-70" />
                     <div className="absolute bottom-0 left-0 w-full bg-black/50 p-1.5 text-[10px] text-snow flex items-center gap-1"><div className="size-3 rounded-full border border-snow/50 flex items-center justify-center"><div className="size-1.5 bg-snow rounded-full"></div></div> Site Log - Oct 12</div>
                   </div>
                   <div className="w-[200px] aspect-video bg-steel-border/50 rounded-[8px] relative overflow-hidden">
                     <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=160&fit=crop" className="w-full h-full object-cover opacity-70" />
                     <div className="absolute bottom-0 left-0 w-full bg-black/50 p-1.5 text-[10px] text-snow flex items-center gap-1"><div className="size-3 rounded-full border border-snow/50 flex items-center justify-center"><div className="size-1.5 bg-snow rounded-full"></div></div> Invoice #4492</div>
                   </div>
                   <div className="w-[200px] aspect-video bg-steel-border/50 rounded-[8px] relative overflow-hidden hidden sm:block">
                     <img src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&h=160&fit=crop" className="w-full h-full object-cover opacity-70" />
                     <div className="absolute bottom-0 left-0 w-full bg-black/50 p-1.5 text-[10px] text-snow flex items-center gap-1"><div className="size-3 rounded-full border border-snow/50 flex items-center justify-center"><div className="size-1.5 bg-snow rounded-full"></div></div> RFI-004 Diagram</div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          <div className="mt-8">
            <h4 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-2 flex items-center gap-2">
              <div className="size-5 rounded-[4px] bg-blue-600 flex items-center justify-center"><Sparkles className="size-3 fill-snow text-snow" /></div>
              AI Chat
            </h4>
            <p className="text-body text-ash mb-2 max-w-none">Find answers in your construction data with AI-powered chat. Get site insights without digging through blueprints, contracts, or daily field logs.</p>
            <a href="#" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-snow bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-all duration-300 w-max mt-2">
              Try AI Chat <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </section>

      {/* ── MORE WAYS TO QUERY ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
         <div className="font-mono text-[12px] text-ash tracking-[1px] uppercase mb-12">
           More ways to query your data
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Search */}
            <div className="group cursor-default">
              <div className="bg-[#0a0a0a] rounded-[12px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative shadow-2xl flex flex-col items-center transition-all duration-500 group-hover:border-white/20">
                 {/* Background glow */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[150px] bg-blue-500/10 blur-[40px] rounded-full pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100"></div>
                 
                 {/* Search Input */}
                 <div className="w-full max-w-[240px] bg-[#1a1a1a] border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded-[8px] py-2.5 px-3 flex items-center gap-2 mb-3 relative z-10 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-400" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                   <span className="text-[12px] text-snow font-medium">M25 concrete rate</span>
                   <div className="w-[1px] h-[12px] bg-blue-400 animate-pulse ml-[-2px]"></div>
                 </div>

                 {/* Results dropdown */}
                 <div className="w-full max-w-[240px] bg-[#161616] border border-steel-border rounded-[8px] p-1 flex flex-col gap-1 relative z-10 transform transition-transform duration-500 translate-y-2 opacity-80 group-hover:translate-y-0 group-hover:opacity-100 shadow-xl">
                   <div className="bg-white/5 rounded-[6px] p-2.5 hover:bg-white/10 transition-colors">
                     <div className="flex items-center gap-2 text-[10px] text-blue-400 font-medium mb-1"><Sparkles className="size-3 fill-blue-400" /> Source: CPWD DSR 2023</div>
                     <div className="text-[10px] text-snow leading-tight line-clamp-2">The current benchmark rate for M25 grade concrete in Maharashtra region is ₹5,400 per cu.m.</div>
                   </div>
                   <div className="p-2.5 opacity-50">
                     <div className="flex items-center gap-2 text-[10px] text-ash font-medium mb-1">📄 Project_BOQ_v2.xlsx</div>
                     <div className="text-[10px] text-ash/60 line-clamp-1">Subcontractor quoted ₹5,800...</div>
                   </div>
                 </div>
                 {/* Fade gradient */}
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#0a0a0a] to-transparent z-20"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Semantic Search
              </h5>
              <p className="text-[14px] text-ash">Lightning fast keyword and semantic search with RAG enables your team to find insights in seconds.</p>
            </div>

            {/* Hub */}
            <div className="group cursor-default">
              <div className="bg-[#0a0a0a] rounded-[12px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center transition-all duration-500 group-hover:border-white/20">
                 {/* Background glow */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] bg-purple-500/10 blur-[40px] rounded-full pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100"></div>

                 {/* Folder Interface */}
                 <div className="w-full max-w-[240px] bg-[#161616] border border-steel-border shadow-xl rounded-[8px] overflow-hidden relative z-10 transform transition-transform duration-500 group-hover:scale-105">
                   <div className="bg-[#1a1a1a] border-b border-steel-border px-3 py-2 flex items-center justify-between">
                     <div className="flex gap-1.5 items-center text-[10px] text-ash font-mono"><FolderOpen className="size-3 text-purple-400" /> /project-alpha</div>
                     <div className="flex gap-1"><div className="size-2 rounded-full bg-red-500/50"></div><div className="size-2 rounded-full bg-yellow-500/50"></div><div className="size-2 rounded-full bg-green-500/50"></div></div>
                   </div>
                   <div className="p-2 flex flex-col gap-1">
                     <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-[4px] cursor-pointer transition-colors">
                       <div className="flex items-center gap-2 text-[11px] text-snow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-400" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Foundation_Blueprints.pdf</div>
                       <div className="text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider">v3.2</div>
                     </div>
                     <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-[4px] cursor-pointer transition-colors bg-white/5 border border-white/5">
                       <div className="flex items-center gap-2 text-[11px] text-snow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-400" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Subcontractor_SLA.docx</div>
                       <div className="text-[8px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded uppercase tracking-wider">Approved</div>
                     </div>
                     <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-[4px] cursor-pointer transition-colors">
                       <div className="flex items-center gap-2 text-[11px] text-snow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-yellow-400" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Soil_Test_Report.xlsx</div>
                       <div className="text-[8px] text-ash">2 mins ago</div>
                     </div>
                   </div>
                 </div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <FolderOpen className="size-4" />
                Document Hub
              </h5>
              <p className="text-[14px] text-ash">Central place for blueprints, contracts, and soil reports. Tagged to project phases with version tracking.</p>
            </div>

            {/* Reporting */}
            <div className="group cursor-default">
              <div className="bg-[#0a0a0a] rounded-[12px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center transition-all duration-500 group-hover:border-white/20">
                 {/* Background glow */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] bg-teal-500/10 blur-[40px] rounded-full pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100"></div>

                 {/* Report Mockup */}
                 <div className="w-[160px] bg-[#161616] border border-steel-border shadow-xl rounded-[8px] p-3 relative z-10 transform transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105">
                   {/* Header */}
                   <div className="flex items-center justify-between mb-3 border-b border-steel-border pb-2">
                     <div className="text-[10px] text-snow font-medium">Weekly Summary</div>
                     <div className="flex items-center gap-1 bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-[4px] text-[7px] uppercase tracking-wider">
                       <Sparkles className="size-2" /> Auto
                     </div>
                   </div>
                   
                   {/* Content lines */}
                   <div className="flex flex-col gap-2">
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-teal-400 w-[65%]"></div>
                     </div>
                     <div className="text-[8px] text-ash flex justify-between">
                       <span>Phase 2 Progress</span>
                       <span className="text-teal-400">65%</span>
                     </div>
                     
                     <div className="mt-2 space-y-1.5">
                       <div className="h-1.5 w-[90%] bg-white/5 rounded"></div>
                       <div className="h-1.5 w-[75%] bg-white/5 rounded"></div>
                       <div className="h-1.5 w-[85%] bg-white/5 rounded"></div>
                     </div>
                   </div>
                   
                   {/* Highlight box */}
                   <div className="mt-3 bg-white/5 border border-white/10 rounded-[4px] p-2 flex items-start gap-1.5">
                     <div className="size-3 bg-teal-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                       <div className="size-1 bg-teal-400 rounded-full"></div>
                     </div>
                     <div className="text-[7px] text-snow leading-tight opacity-80">
                       Concrete pouring completed on schedule. No critical issues reported.
                     </div>
                   </div>
                 </div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Automated Reporting
              </h5>
              <p className="text-[14px] text-ash">Generate comprehensive daily logs and weekly progress summaries instantly from scattered site data.</p>
            </div>
         </div>
      </section>

      {/* ── ACT SECTION ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
        <div className="mb-16">
          <h2 className="text-display font-semibold tracking-[-2.3px] text-snow flex items-start gap-1 mb-6">
            Act <span className="text-blue-cornflower text-[24px] font-retro tracking-normal leading-none mt-4">04</span>
          </h2>
          <h3 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-6 max-w-[600px]">
            Actionable context across every team
          </h3>
          <p className="text-body text-ash mb-9 max-w-[640px]">
            From estimate to handover, the site is in the room. Sanrachna plugs directly into your existing infrastructure, auto-escalating RFIs and updating your Gantt charts based on daily site logs.
          </p>
          <div className="flex gap-4 mb-8">
            <Link to="/signup" className="bg-snow text-page-ink px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Let's Connect</Link>
            <Link to="/signup" className="bg-transparent border border-graphite text-snow px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: AI Agent */}
          <div className="bg-card-carbon rounded-[8px] border border-steel-border p-8 flex flex-col h-[500px]">
             <div className="bg-[#111] border border-steel-border rounded-[8px] flex-1 overflow-hidden relative shadow-2xl flex flex-col">
               <div className="p-4 border-b border-steel-border flex items-center justify-between text-snow text-[14px]">
                 <div className="flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> / <div className="bg-purple-600 rounded-[4px] p-0.5"><Sparkles className="size-3 text-snow"/></div> AI Agent</div>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
               </div>
               <div className="p-6">
                 <div className="text-[12px] text-snow font-medium mb-3">Instructions</div>
                 <div className="bg-card-carbon border border-steel-border rounded-[6px] p-4 text-[12px] leading-relaxed text-snow">
                   <span className="text-blue-400">Log site issue</span>: Crack in foundation. Escalate to <span className="text-blue-400">Senior Architect</span> and attach <span className="text-blue-400">site photo</span>, include...
                 </div>
               </div>
             </div>
          </div>

          {/* Card 2: Password links */}
          <div className="bg-card-carbon rounded-[8px] border border-steel-border p-8 flex flex-col h-[500px]">
             <div className="bg-[#111] border border-steel-border rounded-[8px] flex-1 overflow-hidden relative shadow-2xl flex flex-col">
               <div className="p-4 border-b border-steel-border flex items-center gap-2 text-snow text-[14px]">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> / <div className="bg-pink-600 rounded-[4px] p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div> Structural Delay RFI
               </div>
               <div className="p-6 mt-8">
                 <h4 className="text-[24px] font-semibold text-snow mb-4 leading-tight">Structural Delay RFI</h4>
                 <div className="flex items-center gap-4 text-[10px] text-ash">
                   <span className="flex items-center gap-1 text-snow"><div className="size-4 bg-gray-500 rounded-full"></div> Mei Weiss</span>
                   <span>Published 23 March 2026</span>
                   <span>This doc was generated using AI</span>
                 </div>
                 <div className="mt-8 space-y-4">
                   <div className="h-2 bg-steel-border/50 rounded w-full"></div>
                   <div className="h-2 bg-steel-border/50 rounded w-5/6"></div>
                   <div className="h-2 bg-steel-border/50 rounded w-4/6"></div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>




      {/* ── TARGET AUDIENCES ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto border-t border-steel-border relative z-10 flex flex-col md:flex-row gap-16 md:gap-32">
        <div className="md:w-1/3">
          <h2 className="text-[40px] md:text-display font-semibold tracking-[-2px] text-snow sticky top-24">
            Sanrachna for
          </h2>
        </div>
        <div className="md:w-2/3 flex flex-col gap-8 pb-8">
           {roles.map((role, i) => {
             const isActive = activeRoleIndex === i;
             return (
               <div 
                 key={role.id} 
                 ref={(el) => { if (el) rolesRef.current[i] = el; }}
                 className={`flex flex-col cursor-pointer transition-all duration-700 ${isActive ? 'opacity-100 py-4' : 'opacity-30 hover:opacity-60 py-2'}`}
                 onClick={() => {
                    setActiveRoleIndex(i);
                    rolesRef.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }}
               >
                 <div className="flex items-center gap-6">
                   <div className={`w-[48px] flex justify-center transition-all duration-700 ${isActive ? 'text-blue-cornflower scale-110 opacity-100' : 'text-ash opacity-40 scale-100'}`}>
                     {role.icon}
                   </div>
                   <h3 
                     className={`text-[32px] md:text-[48px] font-retro tracking-wide transition-all duration-700 ${isActive ? 'text-snow leading-none' : 'text-transparent'}`}
                     style={!isActive ? { WebkitTextStroke: '1px white' } : {}}
                   >
                     {role.title}
                   </h3>
                 </div>
                 
                 <div className={`overflow-hidden transition-all duration-700 ${isActive ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                   <p className="text-body text-ash max-w-[500px] ml-12">
                     {role.desc}
                   </p>
                   <a href="#" className="text-[14px] font-medium text-snow hover:text-blue-cornflower transition-colors ml-12 mt-6 flex items-center gap-1 w-fit">
                     Learn more <ChevronRight className="size-4" />
                   </a>
                 </div>
               </div>
             );
           })}
        </div>
      </section>


      {/* ── AI NATIVE PLATFORM / SECURITY ── */}
      <section className="py-24 px-10 md:px-24 lg:px-32 border-t border-steel-border relative z-10 bg-page-ink">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="text-[40px] md:text-[72px] font-semibold leading-[1.05] tracking-[-3px] text-snow max-w-[1000px] mb-8">
            Your <img src="/images/brain.png" alt="Brain" className="inline-block h-[56px] md:h-[80px] object-contain align-middle transform -translate-y-1 mx-1" /> AI native construction intelligence platform—secure, compliant, and ready to scale <img src="/images/globe.png" alt="Globe" className="inline-block h-[56px] md:h-[80px] object-contain align-middle transform -translate-y-1 mx-1" /> <span className="font-retro tracking-wide font-normal">org-wide</span>
          </h2>
          <p className="text-[18px] text-ash max-w-[900px] mb-20 leading-relaxed">
            Sanrachna is built for organizations where security, privacy, and control aren't optional. SOC 2 Type II, ISO 27001, HIPAA, and GDPR compliance are table stakes—but what sets Sanrachna apart is how it lets your team move fast without trading away governance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-32">
            {/* Built for trust at scale */}
            {/* Offline Fallback */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="bg-card-carbon border border-steel-border rounded-[8px] p-4 w-full flex items-center justify-between z-10">
                   <div>
                     <div className="text-[12px] text-snow font-medium flex items-center gap-2"><div className="size-2 rounded-full bg-orange-500 shadow-[0_0_8px_orange]"></div> Offline Mode</div>
                     <div className="text-[10px] text-ash">14 logs queued for sync</div>
                   </div>
                   <div className="size-6 border border-steel-border rounded-full flex items-center justify-center text-ash bg-page-ink">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/></svg>
                   </div>
                 </div>
                 <div className="w-full bg-[#151515] border border-steel-border rounded-[6px] py-3 px-4 flex items-center justify-between opacity-50 mt-3 z-10">
                    <span className="text-[12px] text-snow">DSR Benchmarks</span>
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-2 rounded border border-green-400/20">Cached</span>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Offline Fallback System
              </h5>
              <p className="text-[14px] text-ash">Construction sites lose internet. Sanrachna stores CPWD DSR benchmarks locally and queues daily logs for sync.</p>
            </div>

            {/* Emergency Alert */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="bg-page-ink border border-red-900/50 rounded-[12px] p-6 w-full max-w-[200px] flex flex-col items-center justify-center shadow-2xl z-10 relative overflow-hidden">
                   <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
                   <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                     <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                   </div>
                   <div className="text-[14px] text-snow font-bold mb-1">Trigger SOS</div>
                   <div className="text-[9px] text-ash text-center leading-tight">Alerting Site Engineer<br/>& Safety Officer</div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 22 22 22"></polygon></svg>
                Emergency Alert Button
              </h5>
              <p className="text-[14px] text-ash">One-tap SOS triggers for safety hazards. Instantly notifies the Site Engineer and Safety Officer with geolocation.</p>
            </div>

            {/* 3-Layer Role System */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="w-full max-w-[240px] bg-card-carbon border border-steel-border rounded-[8px] p-4 z-10 shadow-2xl">
                   <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-3">
                       <div className="size-8 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center text-[10px] font-bold">O</div>
                       <span className="text-[12px] text-snow font-medium">Owner</span>
                     </div>
                     <div className="text-[10px] text-snow bg-blue-500/20 px-2 py-1 rounded border border-blue-500/20">Portfolio</div>
                   </div>
                   <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-3">
                       <div className="size-8 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center text-[10px] font-bold">SE</div>
                       <span className="text-[12px] text-snow font-medium">Senior Eng</span>
                     </div>
                     <div className="text-[10px] text-snow bg-purple-500/20 px-2 py-1 rounded border border-purple-500/20">Timeline</div>
                   </div>
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                       <div className="size-8 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-full flex items-center justify-center text-[10px] font-bold">JW</div>
                       <span className="text-[12px] text-snow font-medium">Jnr Worker</span>
                     </div>
                     <div className="text-[10px] text-snow bg-orange-500/20 px-2 py-1 rounded border border-orange-500/20">Tasks</div>
                   </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                3-Layer Role System
              </h5>
              <p className="text-[14px] text-ash">Owners see the portfolio, Senior Engineers manage the timeline, and Junior Workers only see assigned tasks.</p>
            </div>

            {/* Worker Attendance Tracking */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="w-full max-w-[220px] bg-card-carbon border border-steel-border rounded-[8px] p-4 z-10 shadow-2xl relative">
                   <div className="text-[12px] text-snow font-bold mb-4 flex items-center justify-between">Site A - Attendance <span className="text-[9px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded">Active</span></div>
                   
                   <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-3">
                       <div className="size-6 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center text-[10px] text-blue-400 font-bold">JS</div>
                       <div className="text-[11px] text-snow">John S.</div>
                     </div>
                     <div className="text-[10px] text-green-400 flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> 08:00 AM</div>
                   </div>

                   <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-3">
                       <div className="size-6 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center text-[10px] text-purple-400 font-bold">MR</div>
                       <div className="text-[11px] text-snow">Mike R.</div>
                     </div>
                     <div className="text-[10px] text-green-400 flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> 08:05 AM</div>
                   </div>

                   <div className="flex justify-between items-center opacity-60">
                     <div className="flex items-center gap-3">
                       <div className="size-6 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-[10px] text-red-400 font-bold">AW</div>
                       <div className="text-[11px] text-snow">Alex W.</div>
                     </div>
                     <div className="text-[9px] text-red-400 border border-red-500/20 bg-red-500/10 px-2 py-0.5 rounded">Absent</div>
                   </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Automated Attendance
              </h5>
              <p className="text-[14px] text-ash">Easily manage the daily attendance of your workforce. Track check-ins and absences without messy paper logs.</p>
            </div>

            {/* Grounded in CPWD & DSR */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-2 text-[12px] text-blue-200 mb-6 inline-block z-10 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                   Estimate 500sqm of M25 concrete
                 </div>
                 <div className="w-full max-w-[220px] space-y-3 relative z-10">
                   <div className="h-4 bg-steel-border/50 rounded-full w-full relative">
                      <div className="absolute right-4 -top-2 size-4 bg-blue-600 border border-blue-400 rounded-full flex items-center justify-center text-[8px] text-snow cursor-pointer shadow-[0_0_10px_blue] z-20">
                        [1]
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[160px] bg-card-carbon border border-steel-border rounded-[6px] p-3 text-left z-30 shadow-2xl">
                          <div className="flex items-center gap-1 text-[10px] text-snow font-bold mb-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> CPWD DSR 2023, 4.1.5</div>
                          <div className="text-[9px] text-ash leading-snug">Providing and laying in position cement concrete of specified grade...</div>
                        </div>
                      </div>
                   </div>
                   <div className="h-4 bg-steel-border/50 rounded-full w-5/6"></div>
                   <div className="h-4 bg-steel-border/50 rounded-full w-4/6"></div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Grounded in CPWD & DSR
              </h5>
              <p className="text-[14px] text-ash">Every cost estimate links back to the 2023 CPWD DSR and RSMeans. No AI hallucinations.</p>
            </div>

            {/* Private AI */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] mb-6 overflow-hidden relative flex items-center justify-center">
                 {/* Blueprint grid bg */}
                 <div className="absolute inset-0 blueprint-grid opacity-30 z-0"></div>
                 <div className="relative z-10 flex items-center gap-4">
                   <div className="size-14 bg-card-carbon border border-steel-border rounded-[12px] flex items-center justify-center shadow-2xl relative overflow-hidden text-snow">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                   </div>
                   <div className="h-[2px] w-8 bg-steel-border relative">
                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 bg-blue-600 shadow-[0_0_15px_blue] rounded-[2px] animate-pulse"></div>
                   </div>
                   <div className="size-14 bg-card-carbon border border-steel-border rounded-[12px] flex flex-col items-center justify-center font-bold text-snow shadow-2xl">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                   </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-[#111] to-transparent z-0"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Private AI
              </h5>
              <p className="text-[14px] text-ash">Sanrachna runs generative AI on dedicated private infrastructure. Your data never trains public models and never leaves your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL 3D CTA ── */}
      <section className="py-32 px-10 md:px-24 lg:px-32 relative z-10 border-t border-steel-border overflow-hidden h-[600px] flex flex-col items-center justify-center">
         {/* 3D Wireframe Tunnel Background */}
         <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none" style={{
           background: 'radial-gradient(circle at center, transparent 0%, #0a0a0a 70%)'
         }}>
           <div className="absolute inset-0 opacity-20" style={{
             backgroundImage: `
               linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px',
             transform: 'perspective(600px) rotateX(70deg) scale(2)',
             transformOrigin: 'bottom center'
           }}></div>
           <div className="absolute inset-0 opacity-20" style={{
             backgroundImage: `
               linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px',
             transform: 'perspective(600px) rotateX(-70deg) scale(2)',
             transformOrigin: 'top center'
           }}></div>
           <div className="absolute inset-0 opacity-20" style={{
             backgroundImage: `
               linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px),
               linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px',
             transform: 'perspective(600px) rotateY(70deg) scale(2)',
             transformOrigin: 'left center'
           }}></div>
           <div className="absolute inset-0 opacity-20" style={{
             backgroundImage: `
               linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px),
               linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px',
             transform: 'perspective(600px) rotateY(-70deg) scale(2)',
             transformOrigin: 'right center'
           }}></div>
         </div>
         {/* Deep fade for center */}
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.8)_0%,transparent_50%)] z-0"></div>

         <div className="relative z-10 text-center">
           <h2 className="text-[48px] md:text-[80px] font-semibold tracking-tight text-snow leading-none mb-12 flex flex-col items-center">
             <div className="flex items-center gap-6 md:gap-8">
               <span className="font-serif italic font-bold">Build</span>
               {/* 8-bit smiley */}
                <div className="h-[1em] w-[1.5em] mx-2 relative flex items-center justify-center shrink-0">
                   <img src="/svgexport-68.svg" alt="Build Icon" className="w-[1.5em] h-[1.5em] max-w-none drop-shadow-2xl absolute" />
                 </div>
               <span>with better</span>
             </div>
             <span><span className="font-retro italic text-[#6798ff]">margins</span> and visibility</span>
           </h2>
           
           <div className="flex gap-4 justify-center">
             <Link to="/signup" className="bg-snow text-page-ink px-6 py-3 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Let's Connect</Link>
             <Link to="/signup" className="bg-transparent border border-graphite text-snow px-6 py-3 rounded-[8px] text-[14px] font-medium hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
           </div>
         </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full bg-[#070707] border-t border-steel-border/50 relative z-10 text-[13px]">
        <div className="py-24 px-10 md:px-24 lg:px-32 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row gap-16 md:gap-8 justify-between">
            <div className="w-[100px] shrink-0">
               {/* Logo */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-snow">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 text-ash">

               {/* ROLES */}
               <div className="flex flex-col gap-4">
                 <div className="text-[11px] font-mono tracking-[0.1em] text-ash/60 mb-2 uppercase">Roles</div>
                 <Link to="#" className="footer-link">Project Manager</Link>
                 <Link to="#" className="footer-link">Site Engineer</Link>
                 <Link to="#" className="footer-link">Architect</Link>
                 <Link to="#" className="footer-link">General Contractor</Link>
                 <Link to="#" className="footer-link">Safety Officer</Link>
                 <Link to="#" className="footer-link">Subcontractor</Link>
                 <Link to="#" className="footer-link">BIM Coordinator</Link>
                 <Link to="#" className="footer-link">Quantity Surveyor</Link>
                 <Link to="#" className="footer-link">Client / Owner</Link>
               </div>
                 
               {/* USE CASES */}
               <div className="flex flex-col gap-4">
                 <div className="text-[11px] font-mono tracking-[0.1em] text-ash/60 mb-2 uppercase">Use Cases</div>
                 <Link to="/signup" className="footer-link">Progress Tracking</Link>
                 <Link to="/signup" className="footer-link">Quality Control</Link>
                 <Link to="/signup" className="footer-link">Resource Allocation</Link>
                 <Link to="/signup" className="footer-link">Safety & Compliance</Link>
                 <Link to="/signup" className="footer-link">Cost Estimation</Link>
                 <Link to="/signup" className="footer-link">Field Reporting</Link>
                 <Link to="/signup" className="footer-link">Bid Management</Link>
                 <Link to="/signup" className="footer-link">Labor Attendance</Link>
                 <Link to="/signup" className="footer-link">Document Control</Link>
               </div>


               {/* CONTACT & COMPANY */}
               <div className="flex flex-col gap-10">
                 <div className="flex flex-col gap-4">
                   <div className="text-[11px] font-mono tracking-[0.1em] text-ash/60 mb-2 uppercase">Contact</div>
                   <Link to="#" className="footer-link">Request a demo</Link>
                   <Link to="#" className="footer-link">Let's Connect</Link>
                 </div>
                 
                 <div className="flex flex-col gap-4">
                   <div className="text-[11px] font-mono tracking-[0.1em] text-ash/60 mb-2 uppercase">Company</div>
                   <Link to="#" className="footer-link">Careers</Link>
                   <Link to="#" className="footer-link">Trust center</Link>
                 </div>
               </div>
            </div>
          </div>

          <div className="mt-32 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono tracking-[0.15em] text-ash/60 uppercase">
            <div>© 2026 SANRACHNA INC.</div>
            
            <div className="flex gap-8">
              <Link to="#" className="hover:text-snow transition-colors">Cookie preferences</Link>
              <Link to="#" className="hover:text-snow transition-colors">Legal & privacy</Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-ash/60 uppercase tracking-[0.15em] font-mono">Made by</span>
              <a href="https://github.com/yashsinghal1234" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-1 pr-4 py-1 hover:bg-white/10 transition-colors">
                <img src="https://github.com/yashsinghal1234.png" alt="yashsinghal1234" className="w-7 h-7 rounded-full" />
                <span className="font-mono text-[11px] text-snow normal-case tracking-normal">Yash Singhal</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
