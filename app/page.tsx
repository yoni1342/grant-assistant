import Link from "next/link";

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative bg-[#F5F5F0] min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-16 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Convergence mark */}
          <div className="flex flex-col gap-[5px]">
            <div className="h-[4px] w-[28px] bg-[#0A0A0A]" />
            <div className="h-[4px] w-[20px] bg-[#0A0A0A]" />
            <div className="h-[4px] w-[12px] bg-[#0A0A0A]" />
          </div>
          <div className="h-[24px] w-px bg-[#D8D8D4]" />
          <div className="flex flex-col">
            <span className="font-display text-sm font-black uppercase tracking-[0.04em] leading-none text-[#0A0A0A]">
              Fundory
            </span>
            <span className="font-mono text-[8px] tracking-[0.18em] text-[#888] uppercase">
              Grant Intelligence Platform
            </span>
          </div>
        </div>
        <span className="font-mono text-[10px] text-[#888] hidden md:block tracking-[0.3em] uppercase">
          EST. 2026
        </span>
      </div>

      {/* Massive headline */}
      <div className="flex-1 flex flex-col justify-center mt-16 md:mt-0">
        <h1 className="font-display text-6xl md:text-8xl lg:text-[10vw] font-black tracking-tight leading-[0.88] text-[#0A0A0A] uppercase">
          <span className="block">Stop Chasing</span>
          <span className="block mt-2 md:mt-4">Grants.</span>
          <span className="block mt-2 md:mt-4">Start Winning</span>
          <span className="block mt-2 md:mt-4">Them.</span>
        </h1>
      </div>

      {/* Bottom: subheadline + CTA left, nav right */}
      <div className="flex flex-col lg:flex-row items-end justify-between gap-12 pb-4">
        <div className="max-w-[500px]">
          <p className="text-lg md:text-2xl text-[#0A0A0A] leading-relaxed text-left">
            Fundory replaces fragmented grant research, manual eligibility checks, and blank-page proposal dread with a single intelligent system built for organizations that can&apos;t afford to leave funding on the table.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-[#F5F5F0] font-medium px-8 py-4 text-sm font-mono tracking-[0.12em] uppercase border-2 border-[#0A0A0A] hover:bg-[#F5F5F0] hover:text-[#0A0A0A] transition-all duration-300 ease-in-out"
            >
              Request Access
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="font-mono text-sm tracking-[0.12em] uppercase text-[#0A0A0A] hover:text-[#888] transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="flex flex-col items-end gap-6">
          <nav className="flex items-center gap-8">
            {[
              { label: "The Problem", href: "#the-problem" },
              { label: "Platform", href: "#platform" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Sectors", href: "#sectors" },
              { label: "Get Access", href: "#get-access" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-mono text-[10px] text-[#0A0A0A] hover:text-[#888] transition-colors tracking-[0.2em] uppercase"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block">
        <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase">
          Scroll for impact
        </span>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A]" />
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════ */
function StatsBar() {
  const stats = [
    { value: "10K+", label: "Grants Indexed" },
    { value: "5", label: "Data Sources Unified" },
    { value: "79%", label: "Avg. Eligibility Score" },
    { value: "$2.4M+", label: "Pipeline Managed" },
  ];
  return (
    <section className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`px-6 md:px-12 lg:px-16 py-10 text-center ${
              i > 0 ? "border-l-2 border-[#0A0A0A]" : ""
            }`}
          >
            <span className="font-display text-3xl md:text-4xl font-black tracking-tight text-[#0A0A0A] block">
              {stat.value}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888] uppercase mt-2 block">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   THE REALITY (PROBLEM SECTION)
   ═══════════════════════════════════════════ */
const problems = [
  {
    title: "Fragmented Search",
    description:
      "Grants.gov, ProPublica, CFDA: each with its own interface, its own data model, its own dead ends. Hours spent searching. Minutes left to apply.",
  },
  {
    title: "Eligibility Guesswork",
    description:
      "You read the RFP. You assume you qualify. You spend three weeks writing, then discover you were never a fit. That\u2019s not a process. That\u2019s a gamble.",
  },
  {
    title: "Generic Proposals",
    description:
      "Templates built for anyone win for no one. Funders read hundreds of proposals. The ones that win speak their language, address their rubric, and reflect their priorities.",
  },
  {
    title: "No Pipeline Visibility",
    description:
      "Deadlines managed in spreadsheets. Status tracked in emails. Compliance requirements missed. A $500K grant doesn\u2019t fail at the writing stage. It fails at the management stage.",
  },
];

function ProblemSection() {
  return (
    <section id="the-problem" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <div className="mb-16">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            The Reality
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            Your mission is fundable.<br />Your process is the problem.
          </h2>
          <p className="mt-8 text-lg md:text-2xl text-[#888] max-w-[700px] leading-relaxed">
            Every year, billions in grant funding go unclaimed. Not because organizations don&apos;t qualify, but because they can&apos;t navigate the noise fast enough. That ends now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {problems.map((problem, i) => (
            <div
              key={problem.title}
              className={`py-10 px-8 ${
                i % 2 !== 0 ? "md:border-l-2 md:border-[#0A0A0A]" : ""
              } ${i >= 2 ? "border-t-2 border-[#0A0A0A]" : ""}`}
            >
              <h3 className="font-display text-xl md:text-2xl font-black tracking-tight text-[#0A0A0A] mb-4 uppercase">
                {problem.title}
              </h3>
              <p className="text-sm text-[#888] leading-relaxed max-w-sm">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FEATURE ROWS
   ═══════════════════════════════════════════ */
const features = [
  {
    number: "01",
    label: "AGGREGATE",
    title: "Every Source.\nOne Search.",
    description:
      "Cross-reference Grants.gov, ProPublica, USAspending, CFDA, and PND simultaneously. Structured, deduplicated, ranked results with no manual reconciliation required. Search in natural language. Get intelligence back.",
    databases: ["Grants.gov", "ProPublica", "USAspending", "CFDA", "PND"],
  },
  {
    number: "02",
    label: "VALIDATE",
    title: "Know Before\nYou Apply.",
    description:
      "AI-powered eligibility scoring calibrated to your organization\u2019s specific profile: geography, capacity, track record, and alignment. An 80% composite score means you\u2019re ready to compete. A red flag means you move on. No more wasted proposals.",
    databases: null,
  },
  {
    number: "03",
    label: "COMPOSE",
    title: "Proposals That\nSpeak Funder.",
    description:
      "Executive summaries, program narratives, evaluation plans: each generated to the specific rubric and language priorities of the target funder. Not boilerplate. Not generic. Funder-specific technical drafts built to score.",
    databases: null,
  },
  {
    number: "04",
    label: "MANAGE",
    title: "Full Lifecycle.\nFull Control.",
    description:
      "Track every grant from discovery through post-award in a single pipeline view. Deadline alerts, compliance milestones, status tracking so your team is executing, not scrambling. Your $2M pipeline deserves better than a spreadsheet.",
    databases: null,
  },
];

/* ── Feature visuals ── */

function AggregateVisual() {
  const sources = [
    { name: "Grants.gov", results: "2,847", status: "SYNCED" },
    { name: "ProPublica", results: "1,203", status: "SYNCED" },
    { name: "USAspending", results: "4,512", status: "SYNCED" },
    { name: "CFDA", results: "891", status: "SYNCED" },
    { name: "PND", results: "634", status: "SYNCED" },
  ];
  return (
    <div className="border border-[#D8D8D4] bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D8D8D4] bg-[#F5F5F0]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
        </div>
        <span className="font-mono text-[9px] text-[#888] tracking-widest">QUERY ENGINE</span>
      </div>
      <div className="px-4 py-3 border-b border-[#D8D8D4]/50">
        <div className="flex items-center gap-2 bg-[#F5F5F0] border border-[#D8D8D4] px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#888]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span className="font-mono text-xs text-[#888]">&quot;climate resilience + rural communities&quot;</span>
        </div>
      </div>
      <div className="divide-y divide-[#D8D8D4]/50">
        {sources.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
              <span className="font-mono text-xs text-[#0A0A0A] tracking-wide">{s.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-[#888]">{s.results} results</span>
              <span className="font-mono text-[9px] text-[#0A0A0A] bg-[#F5F5F0] px-2 py-0.5 tracking-wider">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[#D8D8D4] bg-[#F5F5F0] flex justify-between items-center">
        <span className="font-mono text-[9px] text-[#888]">5 sources queried</span>
        <span className="font-mono text-[9px] text-[#0A0A0A] tracking-wider">10,087 TOTAL</span>
      </div>
    </div>
  );
}

function ValidateVisual() {
  const criteria = [
    { label: "Org. Eligibility", score: 96, met: true },
    { label: "Geographic Match", score: 88, met: true },
    { label: "Program Alignment", score: 92, met: true },
    { label: "Budget Capacity", score: 74, met: true },
    { label: "Track Record", score: 81, met: true },
    { label: "Timeline Fit", score: 45, met: false },
  ];
  return (
    <div className="border border-[#D8D8D4] bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D8D8D4] bg-[#F5F5F0]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
        </div>
        <span className="font-mono text-[9px] text-[#888] tracking-widest">ELIGIBILITY ENGINE</span>
      </div>
      <div className="px-4 py-5 border-b border-[#D8D8D4]/50 flex items-end justify-between">
        <div>
          <span className="font-mono text-[9px] text-[#888] tracking-widest block mb-1">COMPOSITE SCORE</span>
          <span className="font-display text-4xl md:text-5xl font-black tracking-tight text-[#0A0A0A]">79.3</span>
          <span className="text-sm text-[#888] ml-1">/100</span>
        </div>
        <span className="font-mono text-[9px] text-[#0A0A0A] bg-[#F5F5F0] px-2.5 py-1 tracking-wider mb-1">STRONG FIT</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {criteria.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-[#888] tracking-wide">{c.label}</span>
              <span className={`font-mono text-[10px] tracking-wide ${c.score >= 70 ? "text-[#0A0A0A]" : "text-[#888]"}`}>{c.score}%</span>
            </div>
            <div className="h-1.5 bg-[#F5F5F0] w-full">
              <div
                className={`h-full ${c.score >= 70 ? "bg-[#0A0A0A]" : "bg-[#D8D8D4]"}`}
                style={{ width: `${c.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[#D8D8D4] bg-[#F5F5F0] flex justify-between items-center">
        <span className="font-mono text-[9px] text-[#888]">6 criteria evaluated</span>
        <span className="font-mono text-[9px] text-[#888]">1 FLAG</span>
      </div>
    </div>
  );
}

function ComposeVisual() {
  return (
    <div className="border border-[#D8D8D4] bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D8D8D4] bg-[#F5F5F0]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
        </div>
        <span className="font-mono text-[9px] text-[#888] tracking-widest">DRAFT COMPOSER</span>
      </div>
      <div className="flex border-b border-[#D8D8D4]">
        <div className="px-4 py-2 border-b-2 border-[#0A0A0A]">
          <span className="font-mono text-[10px] text-[#0A0A0A] tracking-wide">Executive Summary</span>
        </div>
        <div className="px-4 py-2">
          <span className="font-mono text-[10px] text-[#888] tracking-wide">Program Narrative</span>
        </div>
        <div className="px-4 py-2">
          <span className="font-mono text-[10px] text-[#888] tracking-wide">Eval. Plan</span>
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div>
          <span className="font-mono text-[9px] text-[#888] tracking-widest block mb-2">SECTION 1.0 — OVERVIEW</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-[#0A0A0A] w-full" />
            <div className="h-2.5 bg-[#0A0A0A] w-[95%]" />
            <div className="h-2.5 bg-[#0A0A0A] w-[88%]" />
            <div className="h-2.5 bg-[#D8D8D4] w-[70%]" />
          </div>
        </div>
        <div>
          <span className="font-mono text-[9px] text-[#888] tracking-widest block mb-2">SECTION 1.1 — OBJECTIVES</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-[#0A0A0A] w-full" />
            <div className="h-2.5 bg-[#0A0A0A] w-[92%]" />
            <div className="h-2.5 bg-[#D8D8D4] w-[60%] animate-pulse" />
          </div>
        </div>
        <div>
          <span className="font-mono text-[9px] text-[#888] tracking-widest block mb-2">SECTION 1.2 — METHODOLOGY</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-[#D8D8D4] w-[40%] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#D8D8D4] bg-[#F5F5F0] flex justify-between items-center">
        <span className="font-mono text-[9px] text-[#888]">Tailored to funder rubric</span>
        <span className="font-mono text-[9px] text-[#0A0A0A] tracking-wider">GENERATING...</span>
      </div>
    </div>
  );
}

function ManageVisual() {
  const items = [
    { name: "NSF Climate Grant", stage: "SUBMITTED", deadline: "Mar 15", progress: 100 },
    { name: "NIH Health Equity", stage: "IN REVIEW", deadline: "Apr 02", progress: 75 },
    { name: "USDA Rural Dev.", stage: "DRAFTING", deadline: "May 20", progress: 45 },
    { name: "DOE Clean Energy", stage: "SCREENING", deadline: "Jun 01", progress: 20 },
    { name: "EPA Water Quality", stage: "DISCOVERED", deadline: "Jul 15", progress: 5 },
  ];
  return (
    <div className="border border-[#D8D8D4] bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D8D8D4] bg-[#F5F5F0]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#D8D8D4]" />
        </div>
        <span className="font-mono text-[9px] text-[#888] tracking-widest">PIPELINE CONTROL</span>
      </div>
      <div className="grid grid-cols-3 border-b border-[#D8D8D4]">
        <div className="px-4 py-3 border-r border-[#D8D8D4] text-center">
          <span className="font-display text-xl md:text-2xl font-black text-[#0A0A0A] block">12</span>
          <span className="font-mono text-[9px] text-[#888] tracking-wider">ACTIVE</span>
        </div>
        <div className="px-4 py-3 border-r border-[#D8D8D4] text-center">
          <span className="font-display text-xl md:text-2xl font-black text-[#0A0A0A] block">3</span>
          <span className="font-mono text-[9px] text-[#888] tracking-wider">DUE SOON</span>
        </div>
        <div className="px-4 py-3 text-center">
          <span className="font-display text-xl md:text-2xl font-black text-[#0A0A0A] block">$2.4M</span>
          <span className="font-mono text-[9px] text-[#888] tracking-wider">PIPELINE</span>
        </div>
      </div>
      <div className="divide-y divide-[#D8D8D4]/50">
        {items.map((item) => (
          <div key={item.name} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-[#0A0A0A] tracking-wide">{item.name}</span>
              <span className="font-mono text-[9px] text-[#888]">{item.deadline}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-[#F5F5F0]">
                <div className="h-full bg-[#0A0A0A]" style={{ width: `${item.progress}%` }} />
              </div>
              <span className="font-mono text-[9px] text-[#0A0A0A] bg-[#F5F5F0] px-2 py-0.5 tracking-wider whitespace-nowrap">{item.stage}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
}: {
  feature: (typeof features)[number];
}) {
  return (
    <div className="border-b-2 border-[#0A0A0A]">
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left: label + copy */}
        <div className="lg:w-2/5 px-6 md:px-12 lg:px-16 py-12 lg:py-20 flex flex-col justify-center lg:border-r-2 lg:border-[#0A0A0A]">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] mb-6 block">
            {feature.number} / {feature.label}
          </span>
          <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[#0A0A0A] leading-[0.9] whitespace-pre-line uppercase">
            {feature.title}
          </h3>
          <p className="mt-8 text-lg md:text-xl text-[#888] max-w-[460px] leading-relaxed">
            {feature.description}
          </p>

          {feature.databases && (
            <div className="mt-8 flex flex-wrap gap-2">
              {feature.databases.map((db) => (
                <span
                  key={db}
                  className="font-mono text-[10px] tracking-[0.2em] text-[#0A0A0A] border-2 border-[#0A0A0A] px-3 py-1.5 uppercase"
                >
                  {db}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: visual area */}
        <div className="lg:w-3/5 px-6 md:px-12 lg:px-16 py-12 lg:py-20 bg-[#F5F5F0] flex items-center justify-center min-h-[320px] lg:min-h-[480px]">
          <div className="w-full max-w-2xl">
            {feature.number === "01" && <AggregateVisual />}
            {feature.number === "02" && <ValidateVisual />}
            {feature.number === "03" && <ComposeVisual />}
            {feature.number === "04" && <ManageVisual />}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="platform" className="bg-white">
      {/* Section header */}
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-32 border-b-2 border-[#0A0A0A]">
        <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
          The Platform
        </span>
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
          Four capabilities.<br />One system.<br />Zero excuses.
        </h2>
      </div>
      {features.map((feature) => (
        <FeatureRow key={feature.number} feature={feature} />
      ))}
    </section>
  );
}

/* ═══════════════════════════════════════════
   THE PROCESS (ARCHITECTURE)
   ═══════════════════════════════════════════ */
const architecture = [
  {
    number: "01",
    label: "INGEST",
    title: "Data Aggregation",
    description:
      "A unified API layer normalizes grant data across federal, state, and private databases into one searchable schema. Real-time. Always current.",
  },
  {
    number: "02",
    label: "ANALYZE",
    title: "Eligibility Scoring",
    description:
      "Your organization profile is scored against each grant across six criteria. Tactical advantages surface. Disqualifying factors flag. You only pursue winnable opportunities.",
  },
  {
    number: "03",
    label: "GENERATE",
    title: "Draft Composition",
    description:
      "Funder-specific documents including narratives, budgets, and evaluation frameworks produced in the language and format each funder rewards. Ready to refine, not start from scratch.",
  },
  {
    number: "04",
    label: "TRACK",
    title: "Pipeline Oversight",
    description:
      "Every active grant. Every deadline. Every milestone. Compliance and post-award reporting tracked in one view so nothing falls through the cracks.",
  },
];

function ArchitectureSection() {
  return (
    <section id="how-it-works" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <div className="mb-24">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            The Process
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-[10vw] font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            From search to<br />submission.
          </h2>
          <p className="mt-8 text-lg md:text-2xl text-[#888] max-w-[500px] leading-relaxed">
            Systematized.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {architecture.map((step, i) => (
            <div
              key={step.number}
              className={`py-10 lg:py-0 ${
                i > 0
                  ? "border-t-2 border-[#0A0A0A] lg:border-t-0 lg:border-l-2 lg:border-[#0A0A0A]"
                  : ""
              } lg:px-10 first:lg:pl-0 last:lg:pr-0`}
            >
              <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] block mb-8">
                {step.number} / {step.label}
              </span>
              <h3 className="font-display text-xl md:text-2xl font-black tracking-tight text-[#0A0A0A] mb-4 uppercase">
                {step.title}
              </h3>
              <p className="text-sm text-[#888] leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   SECTORS & COVERAGE
   ═══════════════════════════════════════════ */
const databases = ["Grants.gov", "ProPublica", "USAspending", "CFDA", "PND"];

const sectors = [
  "Education & Research",
  "Healthcare & Science",
  "Economic Development",
  "Environmental Policy",
  "Arts & Culture",
  "International NGOs",
  "Workforce Development",
  "Housing & Community",
];

function SectorsSection() {
  return (
    <section id="sectors" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-32">
        <div className="mb-16">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            Coverage
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            Built across every major<br />federal and private database.
          </h2>
        </div>

        {/* Databases */}
        <div className="flex flex-wrap gap-4 mb-16">
          {databases.map((db) => (
            <span
              key={db}
              className="border-2 border-[#0A0A0A] px-6 py-3 font-mono text-xs text-[#0A0A0A] tracking-wide uppercase hover:bg-[#0A0A0A] hover:text-[#F5F5F0] transition-colors cursor-default"
            >
              {db}
            </span>
          ))}
        </div>

        {/* Sectors */}
        <div className="mb-8">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-6">
            Serving organizations across all major grant sectors
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          {sectors.map((sector) => (
            <span
              key={sector}
              className="border-2 border-[#0A0A0A] px-6 py-3 font-mono text-xs text-[#0A0A0A] tracking-wide uppercase hover:bg-[#0A0A0A] hover:text-[#F5F5F0] transition-colors cursor-default"
            >
              {sector}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section id="get-access" className="bg-[#0A0A0A]">
      {/* Quote block */}
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-32 border-b border-[#888]/20">
        <span className="font-mono text-[10px] tracking-[0.3em] text-[#888]/60 uppercase block mb-8">
          Designed For Organizations That Can&apos;t Afford to Lose
        </span>
        <blockquote className="max-w-[700px]">
          <p className="text-lg md:text-2xl text-[#F5F5F0]/80 leading-relaxed italic">
            &ldquo;Nonprofits and community organizations do the hardest work and historically get the least support navigating the funding landscape. Fundory exists to close that gap permanently.&rdquo;
          </p>
          <footer className="mt-6">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#888]/60 uppercase">
              Fundory Design Principle &middot; 2026
            </span>
          </footer>
        </blockquote>
      </div>

      {/* CTA */}
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <h2 className="font-display text-5xl md:text-7xl lg:text-[10vw] font-black tracking-tight text-[#F5F5F0] leading-[0.85] uppercase">
          Your mission is<br />fundable.
        </h2>
        <p className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight text-[#888] leading-[0.85] uppercase">
          Let&apos;s prove it.
        </p>
        <p className="mt-8 text-lg md:text-2xl text-[#888] max-w-[500px] leading-relaxed">
          Replace fragmented grant workflows with a centralized intelligence system that works as hard as your team does.
        </p>
        <div className="mt-12 flex items-center gap-6">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 bg-[#F5F5F0] text-[#0A0A0A] font-medium px-8 py-4 font-mono text-sm tracking-[0.12em] uppercase border-2 border-[#F5F5F0] hover:bg-[#0A0A0A] hover:text-[#F5F5F0] hover:border-[#888]/30 transition-all duration-300 ease-in-out"
          >
            Get Access Now
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a
            href="#platform"
            className="font-mono text-sm tracking-[0.12em] uppercase text-[#888] hover:text-[#F5F5F0] transition-colors"
          >
            Explore the Platform
          </a>
        </div>
      </div>

      <div className="h-px bg-[#888]/20" />
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-[#0A0A0A] py-10">
      <div className="px-6 md:px-12 lg:px-16 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            {/* Small convergence mark */}
            <div className="flex flex-col gap-[3px]">
              <div className="h-[3px] w-[18px] bg-[#888]" />
              <div className="h-[3px] w-[13px] bg-[#888]" />
              <div className="h-[3px] w-[8px] bg-[#888]" />
            </div>
            <span className="font-display text-sm font-black text-[#888] tracking-[0.04em] uppercase">
              Fundory
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#888]/40 block mt-2 tracking-[0.2em]">
            &copy; 2026 Fundory.ai &middot; All rights reserved.
          </span>
        </div>
        <div className="flex gap-8">
          <Link
            href="#"
            className="font-mono text-[10px] text-[#888]/50 hover:text-[#F5F5F0] transition-colors uppercase tracking-[0.2em]"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="font-mono text-[10px] text-[#888]/50 hover:text-[#F5F5F0] transition-colors uppercase tracking-[0.2em]"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="font-mono text-[10px] text-[#888]/50 hover:text-[#F5F5F0] transition-colors uppercase tracking-[0.2em]"
          >
            Documentation
          </Link>
          <Link
            href="#"
            className="font-mono text-[10px] text-[#888]/50 hover:text-[#F5F5F0] transition-colors uppercase tracking-[0.2em]"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F0] text-[#0A0A0A]">
      <HeroSection />
      <StatsBar />
      <ProblemSection />
      <FeaturesSection />
      <ArchitectureSection />
      <SectorsSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
