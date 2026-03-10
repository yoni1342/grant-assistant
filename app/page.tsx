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
              Grant Intelligence
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
          <span className="block">All sources.</span>
          <span className="block mt-2 md:mt-4">One search.</span>
        </h1>
      </div>

      {/* Bottom: subheadline + CTA left, nav right */}
      <div className="flex flex-col lg:flex-row items-end justify-between gap-12 pb-4">
        <div className="max-w-[500px]">
          <p className="text-lg md:text-2xl text-[#0A0A0A] leading-relaxed text-left">
            A centralized intelligence layer for the grant lifecycle. Aggregate
            data, validate eligibility, and generate technical drafts.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-[#F5F5F0] font-medium px-8 py-4 text-sm font-mono tracking-[0.12em] uppercase border-2 border-[#0A0A0A] hover:bg-[#F5F5F0] hover:text-[#0A0A0A] transition-all duration-300 ease-in-out"
            >
              Get Access
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-end gap-6">
          <nav className="flex items-center gap-8">
            {["System", "Features", "Architecture", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="font-mono text-[10px] text-[#0A0A0A] hover:text-[#888] transition-colors tracking-[0.2em] uppercase"
              >
                {item}
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
   FEATURE ROWS
   ═══════════════════════════════════════════ */
const features = [
  {
    number: "01",
    label: "AGGREGATE",
    title: "All databases.\nOne query.",
    description:
      "Cross-reference Grants.gov, ProPublica, USAspending, CFDA, and PND in a single search. Structured results. No manual reconciliation.",
    databases: ["Grants.gov", "ProPublica", "USAspending", "CFDA", "PND"],
  },
  {
    number: "02",
    label: "VALIDATE",
    title: "Technical fit.\nScored.",
    description:
      "AI-driven eligibility scoring based on your specific organizational data. Match grant requirements against your profile, capacity, and track record.",
    databases: null,
  },
  {
    number: "03",
    label: "COMPOSE",
    title: "Funder-specific\ntechnical drafts.",
    description:
      "Generate Executive Summaries, Program Narratives, and Evaluation Plans tailored to each funder's technical requirements and scoring rubric.",
    databases: null,
  },
  {
    number: "04",
    label: "MANAGE",
    title: "Pipeline\noversight.",
    description:
      "Full lifecycle visibility from discovery to post-award. Deadline management, compliance tracking, and reporting milestones in one view.",
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
        <span className="font-mono text-[9px] text-[#888]">Tailored to NSF rubric</span>
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
    <section id="features" className="bg-white">
      {features.map((feature) => (
        <FeatureRow key={feature.number} feature={feature} />
      ))}
    </section>
  );
}

/* ═══════════════════════════════════════════
   SYSTEM ARCHITECTURE
   ═══════════════════════════════════════════ */
const architecture = [
  {
    number: "01",
    label: "INGEST",
    title: "Data Aggregation",
    description:
      "Multi-source API layer. Normalizes grant data from federal, state, and private databases into a unified schema.",
  },
  {
    number: "02",
    label: "ANALYZE",
    title: "Eligibility Engine",
    description:
      "Scores organizational fit against grant requirements. Surfaces tactical advantages and disqualifying criteria.",
  },
  {
    number: "03",
    label: "GENERATE",
    title: "Draft Composition",
    description:
      "Produces funder-specific technical documents. Executive summaries, narratives, budgets, and evaluation frameworks.",
  },
  {
    number: "04",
    label: "TRACK",
    title: "Pipeline Control",
    description:
      "Deadline management, milestone tracking, and compliance monitoring across the full grant lifecycle.",
  },
];

function ArchitectureSection() {
  return (
    <section id="architecture" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <div className="mb-24">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            System
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-[10vw] font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            Architecture.
          </h2>
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
   SECTORS
   ═══════════════════════════════════════════ */
const sectors = [
  "Education & Research",
  "Healthcare & Science",
  "Economic Development",
  "Environmental Policy",
  "Arts & Culture",
  "International NGOs",
];

function SectorsSection() {
  return (
    <section id="system" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-32">
        <div className="mb-16">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            Coverage
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            Sectors.
          </h2>
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
    <section id="contact" className="bg-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <span className="font-mono text-[10px] tracking-[0.3em] text-[#888]/60 uppercase block mb-8">
          Access
        </span>
        <h2 className="font-display text-5xl md:text-7xl lg:text-[10vw] font-black tracking-tight text-[#F5F5F0] leading-[0.85] uppercase">
          Start<br />searching.
        </h2>
        <p className="mt-8 text-lg md:text-2xl text-[#888] max-w-[500px] leading-relaxed">
          Replace manual grant workflows with a centralized intelligence system.
        </p>
        <div className="mt-12">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 bg-[#F5F5F0] text-[#0A0A0A] font-medium px-8 py-4 font-mono text-sm tracking-[0.12em] uppercase border-2 border-[#F5F5F0] hover:bg-[#0A0A0A] hover:text-[#F5F5F0] hover:border-[#888]/30 transition-all duration-300 ease-in-out"
          >
            Get Access
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
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
            &copy; 2026 All rights reserved.
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
      <FeaturesSection />
      <ArchitectureSection />
      <SectorsSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
