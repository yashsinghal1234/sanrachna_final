import { Link } from 'react-router-dom';
import { Sparkles, FolderOpen, ChevronRight, Star, Search } from 'lucide-react';
import { SiZoom, SiGooglemeet, SiAppstore, SiZapier, SiZendesk } from 'react-icons/si';
import { FaSalesforce } from 'react-icons/fa';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-page-ink font-inter text-snow blueprint-grid relative selection:bg-blue-cornflower/30">
      
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
          <Link to="/signup" className="bg-snow text-page-ink px-5 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Contact sales</Link>
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
              Contact sales
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
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 text-left">
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
      <section className="my-32 py-40 px-6 text-center max-w-[1200px] mx-auto relative z-10 border-t border-steel-border">
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
          <Link to="/signup" className="bg-snow text-page-ink px-8 py-4 rounded-[8px] text-[16px] font-semibold hover:opacity-90 transition-opacity">Contact sales</Link>
          <Link to="/signup" className="bg-transparent border border-graphite text-snow px-8 py-4 rounded-[8px] text-[16px] font-semibold hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
        </div>


      </section>

      {/* ── CENTRALIZE SECTION ── */}
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border" id="product">
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
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
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
            <Link to="/signup" className="bg-snow text-page-ink px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Contact sales</Link>
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
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
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
            <Link to="/signup" className="bg-snow text-page-ink px-4 pt-[10px] pb-[11px] rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Contact sales</Link>
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
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
         <div className="font-mono text-[12px] text-ash tracking-[1px] uppercase mb-12">
           More ways to query your data
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Search */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[180px] p-6 mb-6 overflow-hidden relative shadow-2xl flex flex-col items-center">
                 <div className="w-full max-w-[240px] bg-card-carbon border border-steel-border rounded-full py-2 px-4 flex items-center gap-2 mb-4">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-snow" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                   <span className="text-[12px] text-snow">M25 concrete rate Maharashtra</span>
                 </div>
                 <div className="w-full max-w-[240px] bg-card-carbon border border-steel-border rounded-[8px] p-3 text-left">
                   <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium mb-1"><Sparkles className="size-3 fill-blue-400" /> Source: CPWD DSR 2023</div>
                   <div className="text-[10px] text-ash opacity-50">According to the benchmark, the rate is...</div>
                 </div>
                 {/* Fade gradient */}
                 <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-[#111] to-transparent"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
              </h5>
              <p className="text-[14px] text-ash">Lightning fast keyword and semantic search with RAG enables your team to find insights in seconds.</p>
            </div>

            {/* Explore */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[180px] p-6 mb-6 overflow-hidden relative shadow-2xl flex items-center justify-center">
                 <div className="flex gap-2">
                   <div className="bg-card-carbon border border-steel-border rounded-[6px] px-3 py-1.5 text-[12px] text-ash">Sort</div>
                   <div className="bg-card-carbon border border-steel-border rounded-[6px] px-3 py-1.5 text-[12px] text-ash">More</div>
                   <div className="bg-card-carbon border border-steel-border rounded-[6px] p-1.5 text-snow relative shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-blue-900/20">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8v8M16 8v8M4 12h16"/></svg>
                     <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-snow text-[10px] px-2 py-1 rounded-[4px] whitespace-nowrap border border-steel-border z-10">Explore</div>
                     <div className="absolute top-4 left-4">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                     </div>
                   </div>
                   <div className="bg-card-carbon border border-steel-border rounded-[6px] px-3 py-1.5 text-[12px] text-snow flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                   </div>
                 </div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8v8M16 8v8M4 12h16"/></svg>
                Document Management Hub
              </h5>
              <p className="text-[14px] text-ash">Central place for blueprints, contracts, and soil reports. Tagged to project phases with version tracking.</p>
            </div>

            {/* Slack */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[180px] p-6 mb-6 overflow-hidden relative shadow-2xl">
                 <div className="flex gap-3 text-left">
                   <div className="size-6 bg-purple-600 rounded-[4px] mt-1 shrink-0 flex items-center justify-center font-bold text-snow text-[10px]">#</div>
                   <div>
                     <div className="text-[12px] text-snow font-medium">Harry <span className="text-ash text-[10px] font-normal">9:16 AM</span></div>
                     <div className="text-[12px] text-snow"><span className="text-blue-400 bg-blue-900/30 px-1 rounded">@Sanrachna</span> is the foundation task delayed?</div>
                   </div>
                 </div>
                 <div className="flex gap-3 text-left mt-4">
                   <div className="size-6 bg-page-ink border border-steel-border rounded-[4px] mt-1 shrink-0 flex items-center justify-center"><Sparkles className="size-3 text-snow"/></div>
                   <div>
                     <div className="text-[12px] text-snow font-medium">Sanrachna <span className="bg-steel-border/50 text-[8px] px-1 rounded ml-1">APP</span> <span className="text-ash text-[10px] font-normal">9:16 AM</span></div>
                     <div className="text-[12px] text-snow">Yes, recalculating Gantt chart...</div>
                     <div className="text-[10px] text-ash opacity-50 mt-1 pl-2 border-l border-steel-border">You will finish Dec 14, not Oct 30...</div>
                   </div>
                 </div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Chat on WhatsApp & Mobile
              </h5>
              <p className="text-[14px] text-ash">Simply @Sanrachna on WhatsApp for instant answers pulled from your data—site intelligence for workers on the go.</p>
            </div>
         </div>
      </section>

      {/* ── ACT SECTION ── */}
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-10 border-t border-steel-border">
        <div className="mb-16">
          <h2 className="text-display font-semibold tracking-[-2.3px] text-snow flex items-start gap-1 mb-6">
            Act <span className="text-blue-cornflower text-[24px] font-retro tracking-normal leading-none mt-4">04</span>
          </h2>
          <h3 className="text-heading-sm font-semibold tracking-[-0.5px] text-snow mb-6 max-w-[600px]">
            Actionable context across every team
          </h3>
          <p className="text-body text-ash mb-8 max-w-[640px]">
            From estimate to handover, the site is in the room. Sanrachna plugs directly into your existing infrastructure, auto-escalating RFIs and updating your Gantt charts based on daily site logs.
          </p>
          <div className="flex gap-4">
            <Link to="/signup" className="bg-snow text-page-ink px-4 py-2.5 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Contact sales</Link>
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
      <section className="py-24 px-6 max-w-[1440px] mx-auto border-t border-steel-border relative z-10 flex flex-col md:flex-row gap-16 md:gap-32">
        <div className="md:w-1/3">
          <h2 className="text-[40px] md:text-display font-semibold tracking-[-2px] text-snow sticky top-24">
            Sanrachna for
          </h2>
        </div>
        <div className="md:w-2/3 flex flex-col gap-6">
           <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
               <div className="size-8"><svg viewBox="0 0 24 24" fill="none" stroke="#6798ff" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
               <h3 className="text-[32px] md:text-[48px] font-semibold tracking-tight text-snow leading-none">Project Managers</h3>
             </div>
             <p className="text-body text-ash max-w-[500px] ml-12">
               Stop guessing your estimates. Sanrachna surfaces real-time benchmarks and site signals so junior engineers can estimate with the confidence of a 20-year veteran.
             </p>
             <a href="#" className="text-[14px] font-medium text-snow hover:text-blue-cornflower transition-colors ml-12 mb-4 flex items-center gap-1">Learn more <ChevronRight className="size-4" /></a>
           </div>

           <div className="flex items-center gap-4 opacity-40 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="size-8 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="blue" stroke="white" strokeWidth="1"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg></div>
              <h3 className="text-[32px] md:text-[48px] font-serif text-transparent" style={{WebkitTextStroke: '1px white'}}>Architects</h3>
            </div>
            
            <div className="flex items-center gap-4 cursor-pointer">
              <div className="size-8 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6798ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></div>
              <h3 className="text-[32px] md:text-[48px] font-serif text-snow font-bold">Junior Engineers</h3>
            </div>

            <div className="flex items-center gap-4 opacity-40 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="size-8 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/></svg></div>
              <h3 className="text-[32px] md:text-[48px] font-serif text-transparent" style={{WebkitTextStroke: '1px white'}}>Site Supervisors</h3>
            </div>

            <div className="flex items-center gap-4 opacity-40 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="size-8 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="blue" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
              <h3 className="text-[32px] md:text-[48px] font-serif text-transparent" style={{WebkitTextStroke: '1px white'}}>Contractors</h3>
            </div>

            <div className="flex items-center gap-4 opacity-40 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="size-8 flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 19 2 12 11 5 11 19"/><path d="M22 12h-4"/></svg></div>
              <h3 className="text-[32px] md:text-[48px] font-serif text-transparent" style={{WebkitTextStroke: '1px white'}}>Safety Officers</h3>
            </div>
        </div>
      </section>


      {/* ── AI NATIVE PLATFORM / SECURITY ── */}
      <section className="py-24 px-6 border-t border-steel-border relative z-10 bg-page-ink">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="text-[40px] md:text-[72px] font-semibold leading-[1.05] tracking-[-3px] text-snow max-w-[900px] mb-8">
            Your <span className="inline-block text-[40px] md:text-[64px] align-middle transform -translate-y-1">🧠</span> AI native construction intelligence platform—secure, grounded, and ready to scale <span className="inline-block text-[#3b82f6] text-[40px] md:text-[64px] align-middle transform -translate-y-1"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> org-wide
          </h2>
          <p className="text-[18px] text-ash max-w-[600px] mb-20 leading-relaxed">
            Sanrachna is built for construction firms where budget control and timeline accuracy aren't optional. Precise CPWD DSR benchmarking, RERA compliance, and offline-first reliability are table stakes—but what sets Sanrachna apart is how it gives your junior engineers the estimation intelligence of a 20-year veteran.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Built for trust at scale */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center">
                 <div className="w-full bg-card-carbon border border-steel-border rounded-[8px] p-4 flex justify-between items-center mb-4">
                   <div>
                     <div className="text-[12px] text-snow font-medium">Data retention period</div>
                     <div className="text-[10px] text-ash">Automatically delete files</div>
                   </div>
                   <div className="bg-page-ink border border-steel-border px-3 py-1.5 rounded-[6px] text-[12px] text-snow flex items-center gap-2">2 years <ChevronRight className="size-3 rotate-90" /></div>
                 </div>
                 <div className="w-full bg-[#151515] border border-steel-border rounded-[6px] py-2 px-4 flex items-center justify-center gap-2 opacity-50 mb-2">
                   <div className="size-4 bg-blue-500 rounded-sm"></div> <span className="text-[12px] text-snow">Continue with Microsoft</span>
                 </div>
                 <div className="w-full bg-[#151515] border border-steel-border rounded-[6px] py-2 px-4 flex items-center justify-center gap-2 opacity-30">
                   <div className="size-4 bg-red-500 rounded-full"></div> <span className="text-[12px] text-snow">Continue with Google</span>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-[#111] to-transparent"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Offline Fallback System
              </h5>
              <p className="text-[14px] text-ash">Construction sites lose internet. Sanrachna stores CPWD DSR benchmarks locally and queues daily logs for sync.</p>
            </div>

            {/* Drive consistency */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex gap-4">
                 <div className="flex-1 border border-steel-border rounded-[8px] p-4 bg-page-ink">
                    <div className="text-[12px] text-snow font-medium mb-4 flex justify-between">Direct competitors <span>2</span></div>
                    <div className="bg-card-carbon border border-steel-border rounded-[4px] p-2 mb-2 text-[10px]"><span className="bg-purple-600/30 text-purple-400 px-2 rounded">Violet 28</span></div>
                    <div className="bg-card-carbon border border-steel-border rounded-[4px] p-2 mb-2 text-[10px]"><span className="bg-green-600/30 text-green-400 px-2 rounded">Beta 28</span></div>
                 </div>
                 <div className="flex-1 border border-steel-border rounded-[8px] p-4 bg-page-ink opacity-40 transform translate-x-4">
                    <div className="text-[12px] text-snow font-medium mb-4">Direct com...</div>
                    <div className="bg-card-carbon border border-steel-border rounded-[4px] p-2 mb-2 text-[10px]"><span className="bg-green-600/30 text-green-400 px-2 rounded">Green 28</span></div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#111] to-transparent"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 22 22 22"></polygon></svg>
                Emergency Alert Button
              </h5>
              <p className="text-[14px] text-ash">One-tap SOS triggers for safety hazards. Instantly notifies the Site Engineer and Safety Officer with geolocation.</p>
            </div>

            {/* Privacy without friction */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="w-full max-w-[240px] bg-card-carbon border border-steel-border rounded-[8px] p-4">
                   <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-2"><div className="size-8 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white">Canva</div> <div><div className="text-[12px] text-snow">Canva</div><div className="text-[10px] text-ash">131 workspace me...</div></div></div>
                     <div className="text-[12px] text-ash flex items-center gap-1">View only <ChevronRight className="size-3 rotate-90" /></div>
                   </div>
                   <div className="text-[10px] text-snow mb-3">More people with access</div>
                   <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2"><div className="size-6 bg-gray-600 rounded-full"></div> <span className="text-[12px] text-snow">Claire Fletcher</span></div>
                     <div className="text-[12px] text-snow flex items-center gap-1">Full access <ChevronRight className="size-3 rotate-90" /></div>
                   </div>
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2"><div className="size-6 bg-gray-600 rounded-full"></div> <span className="text-[12px] text-snow">Kevin Ellison</span></div>
                     <div className="text-[12px] text-snow flex items-center gap-1">View only <ChevronRight className="size-3 rotate-90" /></div>
                   </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-[#111] to-transparent"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                3-Layer Role System
              </h5>
              <p className="text-[14px] text-ash">Owners see the portfolio, Senior Engineers manage the timeline, and Junior Workers only see assigned tasks.</p>
            </div>

            {/* PII Redaction */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col justify-end">
                 <div className="absolute top-6 left-6 text-[14px] text-ash opacity-50 leading-relaxed">
                   Jane Smith, and I'm a big fan of your<br/>
                   My email is <span className="bg-card-carbon border border-steel-border px-1 rounded text-snow opacity-100 shadow-[0_0_10px_black]">[redacted]</span>
                 </div>
                 <div className="flex justify-end pr-4">
                   <div className="w-[180px] h-[100px] rounded-[8px] overflow-hidden relative mt-8 z-10 shadow-xl border border-steel-border/50">
                     <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=200&fit=crop" className="w-full h-full object-cover" />
                     {/* blur overlay */}
                     <div className="absolute inset-y-0 left-0 w-2/3 backdrop-blur-xl bg-page-ink/30 border-r border-steel-border/30"></div>
                   </div>
                 </div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Automatic PII redaction
              </h5>
              <p className="text-[14px] text-ash">Names, faces, and voices are automatically redacted across text, audio, and video—compliance built in, not bolted on.</p>
            </div>

            {/* AI you can trust */}
            <div>
              <div className="bg-[#111] rounded-[8px] border border-steel-border h-[220px] p-6 mb-6 overflow-hidden relative flex flex-col items-center justify-center">
                 <div className="bg-card-carbon border border-steel-border rounded-full px-4 py-2 text-[12px] text-snow mb-4 inline-block z-10">Summarize this project for me</div>
                 <div className="w-full max-w-[200px] space-y-3 relative z-10 mt-6">
                   <div className="h-4 bg-steel-border/50 rounded-full w-full relative">
                      <div className="absolute -right-2 -top-2 size-4 bg-page-ink border border-steel-border rounded-full flex items-center justify-center text-[8px] text-snow cursor-pointer group">
                        1
                        {/* Tooltip */}
                        <div className="absolute top-6 right-0 w-[160px] bg-card-carbon border border-steel-border rounded-[6px] p-2 text-left z-20 shadow-2xl opacity-100">
                          <div className="text-[10px] text-snow font-medium mb-1">Interview with John, Acme Inc.</div>
                          <div className="text-[8px] text-ash">The app crashes frequently, making it unusable at times.</div>
                        </div>
                      </div>
                   </div>
                   <div className="h-4 bg-steel-border/50 rounded-full w-5/6"></div>
                   <div className="h-4 bg-steel-border/50 rounded-full w-4/6"></div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[80px] bg-gradient-to-t from-[#111] to-transparent"></div>
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
                 <div className="absolute inset-0 blueprint-grid opacity-30"></div>
                 <div className="relative z-10 flex items-center gap-4">
                   <div className="size-16 bg-card-carbon border border-steel-border rounded-[12px] flex items-center justify-center shadow-2xl">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                   </div>
                   <div className="h-[2px] w-8 bg-steel-border relative">
                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 bg-blue-600 shadow-[0_0_10px_blue] rounded-[2px]"></div>
                   </div>
                   <div className="size-16 bg-card-carbon border border-steel-border rounded-[12px] flex items-center justify-center font-bold text-snow text-xl shadow-2xl">
                     aws
                   </div>
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-[#111] to-transparent"></div>
              </div>
              <h5 className="text-[16px] font-semibold text-snow flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Private AI
              </h5>
              <p className="text-[14px] text-ash">Sanrachna runs Gen AI on AWS Bedrock in a secure, private environment. Your data never trains models and never leaves your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL 3D CTA ── */}
      <section className="py-32 px-6 relative z-10 border-t border-steel-border overflow-hidden h-[600px] flex flex-col items-center justify-center">
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
             <div className="flex items-center gap-4">
               <span className="font-serif italic font-bold">Build</span>
               {/* 8-bit smiley */}
               <div className="size-16 md:size-24 bg-blue-600 rounded-[4px] relative" style={{
                  clipPath: 'polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)'
               }}>
                 <svg viewBox="0 0 24 24" fill="none" className="w-full h-full p-2">
                   <rect x="7" y="8" width="2" height="2" fill="white"/>
                   <rect x="15" y="8" width="2" height="2" fill="white"/>
                   <rect x="6" y="14" width="2" height="2" fill="white"/>
                   <rect x="16" y="14" width="2" height="2" fill="white"/>
                   <rect x="8" y="16" width="8" height="2" fill="white"/>
                 </svg>
               </div>
               <span>with better</span>
             </div>
             <span><span className="font-retro italic text-[#6798ff]">margins</span> and visibility</span>
           </h2>
           
           <div className="flex gap-4 justify-center">
             <Link to="/signup" className="bg-snow text-page-ink px-6 py-3 rounded-[8px] text-[14px] font-medium hover:opacity-90 transition-opacity">Contact sales</Link>
             <Link to="/signup" className="bg-transparent border border-graphite text-snow px-6 py-3 rounded-[8px] text-[14px] font-medium hover:bg-card-carbon transition-colors">Try Sanrachna free</Link>
           </div>
         </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-24 px-6 max-w-[1440px] mx-auto border-t border-steel-border relative z-10 text-[13px]">
        <div className="flex flex-col md:flex-row gap-16 md:gap-8 justify-between">
          <div className="w-[100px]">
             {/* Logo */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-snow">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
          </div>
          
          <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-8 text-ash">
             {/* PLATFORM */}
             <div className="flex flex-col gap-3">
               <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Platform</div>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">AI Estimator</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium flex items-center gap-2 text-snow">Gantt Planning 2.0 <span className="bg-card-carbon border border-steel-border px-1.5 py-0.5 rounded text-[8px] text-ash tracking-widest">BETA</span></Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium flex items-center gap-2 text-snow">Site Dashboards <span className="bg-card-carbon border border-steel-border px-1.5 py-0.5 rounded text-[8px] text-ash tracking-widest">BETA</span></Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium flex items-center gap-2 text-snow">Digital Twins <span className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded text-[8px] tracking-widest">NEW</span></Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Daily Logs</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Safety Reports</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Document Control</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Equipment Tracking</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Bidding & Tenders</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Customers</Link>
               <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Pricing</Link>
             </div>
             
             {/* ROLES & USE CASES */}
             <div className="flex flex-col gap-8">
               <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Roles</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Project Manager</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Architect</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Site Engineer</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">General Contractor</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Safety Officer</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Subcontractor</Link>
               </div>
               
               <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Use Cases</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Progress Tracking</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Quality Control</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Resource Allocation</Link>
               </div>
             </div>

             {/* COMPARISONS */}
             <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Comparisons</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Procore</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Autodesk Build</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Fieldwire</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Buildertrend</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">CoConstruct</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">PlanGrid</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Touchplan</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">CMiC</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">RedTeam</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">ProTenders</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">e-Builder</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Bentley SYNCHRO</Link>
             </div>

             {/* RESOURCES */}
             <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Resources</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Blog</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Case Studies</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Changelog</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Community</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Events</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Help centre</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Academy</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Live Demos</Link>
             </div>

             {/* CUSTOMERS */}
             <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Customers</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">L&T Construction</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">DLF</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Tata Projects</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Shapoorji Pallonji</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Afcons</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">NCC Limited</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">JMC Projects</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">HCC</Link>
             </div>

             {/* CONTACT & COMPANY */}
             <div className="flex flex-col gap-8">
               <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Contact</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Request a demo</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Contact sales</Link>
               </div>
               
               <div className="flex flex-col gap-3">
                 <div className="text-[10px] font-mono tracking-widest text-ash/50 mb-2 uppercase">Company</div>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Careers</Link>
                 <Link to="#" className="hover:text-snow transition-colors font-medium text-snow">Trust center</Link>
               </div>
             </div>
          </div>
        </div>

        <div className="mt-32 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono tracking-widest text-ash/60 uppercase">
          <div>© 2026 SANRACHNA INC.</div>
          
          <div className="flex gap-8">
            <Link to="#" className="hover:text-snow transition-colors">Cookie preferences</Link>
            <Link to="#" className="hover:text-snow transition-colors">Legal & privacy</Link>
          </div>

          <div className="flex items-center gap-4">
            <span>Follow Us</span>
            <div className="flex gap-2">
              <a href="#" className="border border-steel-border/50 rounded flex items-center justify-center p-1.5 hover:bg-card-carbon transition-colors text-snow"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
              <a href="#" className="border border-steel-border/50 rounded flex items-center justify-center p-1.5 hover:bg-card-carbon transition-colors text-snow"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></a>
              <a href="#" className="border border-steel-border/50 rounded flex items-center justify-center p-1.5 hover:bg-card-carbon transition-colors text-snow"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
              <a href="#" className="border border-steel-border/50 rounded flex items-center justify-center p-1.5 hover:bg-card-carbon transition-colors text-snow"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
