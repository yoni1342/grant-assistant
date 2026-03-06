import Link from "next/link";

/* ═══════════════════════════════════════════
   HERO — Editorial Brutalism / No Graphism
   ═══════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative bg-white min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-16 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono tracking-widest uppercase text-black">
          Fundory.ai<sup className="text-[8px] ml-0.5">®</sup>
        </span>
        <span className="text-[10px] font-mono text-zinc-400 hidden md:block tracking-[0.3em]">
          EST. 2026
        </span>
      </div>

      {/* Massive headline — left-aligned, stacked */}
      <div className="flex-1 flex flex-col justify-center mt-16 md:mt-0">
        <h1 className="text-6xl md:text-8xl lg:text-[10vw] font-bold tracking-tighter leading-[0.8] text-black uppercase">
          <span className="block">All sources.</span>
          <span className="block mt-2 md:mt-4">One search.</span>
        </h1>
      </div>

      {/* Bottom area: subheadline + CTA left, nav + lang right */}
      <div className="flex flex-col lg:flex-row items-end justify-between gap-12 pb-4">
        {/* Left: subheadline + CTA */}
        <div className="max-w-[500px]">
          <p className="text-lg md:text-2xl text-black leading-relaxed text-left">
            A centralized intelligence layer for the grant lifecycle. Aggregate
            data, validate eligibility, and generate technical drafts.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-black text-white font-medium rounded-full px-8 py-4 text-sm tracking-wide uppercase border border-black hover:bg-white hover:text-black transition-all duration-300 ease-in-out"
            >
              Get Access
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* Right: nav + language */}
        <div className="flex flex-col items-end gap-6">
          <nav className="flex items-center gap-8">
            {["System", "Features", "Architecture", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-mono text-black hover:text-zinc-500 transition-colors tracking-wide uppercase"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-black tracking-wide">EN</span>
            <span className="text-xs font-mono text-zinc-300 tracking-wide">FR</span>
            <span className="text-xs font-mono text-zinc-300 tracking-wide">DE</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block">
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-400 uppercase">
          Scroll for impact
        </span>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-black" />
    </section>
  );
}

/* ═══════════════════════════════════════════
   FEATURE ROWS — Product-Led / Functional
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
    <div className="border border-zinc-200 bg-white">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 tracking-widest">QUERY ENGINE</span>
      </div>
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span className="text-xs font-mono text-zinc-500">&quot;climate resilience + rural communities&quot;</span>
        </div>
      </div>
      {/* Results */}
      <div className="divide-y divide-zinc-100">
        {sources.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-black" />
              <span className="text-xs font-mono text-black tracking-wide">{s.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-zinc-400">{s.results} results</span>
              <span className="text-[9px] font-mono text-black bg-zinc-100 px-2 py-0.5 tracking-wider">{s.status}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
        <span className="text-[9px] font-mono text-zinc-400">5 sources queried</span>
        <span className="text-[9px] font-mono text-black tracking-wider">10,087 TOTAL</span>
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
    <div className="border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 tracking-widest">ELIGIBILITY ENGINE</span>
      </div>
      {/* Overall score */}
      <div className="px-4 py-5 border-b border-zinc-100 flex items-end justify-between">
        <div>
          <span className="text-[9px] font-mono text-zinc-400 tracking-widest block mb-1">COMPOSITE SCORE</span>
          <span className="text-4xl md:text-5xl font-bold tracking-tighter text-black">79.3</span>
          <span className="text-sm text-zinc-400 ml-1">/100</span>
        </div>
        <span className="text-[9px] font-mono text-black bg-zinc-100 px-2.5 py-1 tracking-wider mb-1">STRONG FIT</span>
      </div>
      {/* Criteria bars */}
      <div className="px-4 py-4 space-y-3">
        {criteria.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-zinc-500 tracking-wide">{c.label}</span>
              <span className={`text-[10px] font-mono tracking-wide ${c.score >= 70 ? "text-black" : "text-zinc-400"}`}>{c.score}%</span>
            </div>
            <div className="h-1.5 bg-zinc-100 w-full">
              <div
                className={`h-full ${c.score >= 70 ? "bg-black" : "bg-zinc-300"}`}
                style={{ width: `${c.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
        <span className="text-[9px] font-mono text-zinc-400">6 criteria evaluated</span>
        <span className="text-[9px] font-mono text-zinc-400">1 FLAG</span>
      </div>
    </div>
  );
}

function ComposeVisual() {
  return (
    <div className="border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 tracking-widest">DRAFT COMPOSER</span>
      </div>
      {/* Document tabs */}
      <div className="flex border-b border-zinc-200">
        <div className="px-4 py-2 border-b-2 border-black">
          <span className="text-[10px] font-mono text-black tracking-wide">Executive Summary</span>
        </div>
        <div className="px-4 py-2">
          <span className="text-[10px] font-mono text-zinc-400 tracking-wide">Program Narrative</span>
        </div>
        <div className="px-4 py-2">
          <span className="text-[10px] font-mono text-zinc-400 tracking-wide">Eval. Plan</span>
        </div>
      </div>
      {/* Document content */}
      <div className="px-5 py-5 space-y-4">
        <div>
          <span className="text-[9px] font-mono text-zinc-400 tracking-widest block mb-2">SECTION 1.0 — OVERVIEW</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-zinc-800 rounded-sm w-full" />
            <div className="h-2.5 bg-zinc-800 rounded-sm w-[95%]" />
            <div className="h-2.5 bg-zinc-800 rounded-sm w-[88%]" />
            <div className="h-2.5 bg-zinc-200 rounded-sm w-[70%]" />
          </div>
        </div>
        <div>
          <span className="text-[9px] font-mono text-zinc-400 tracking-widest block mb-2">SECTION 1.1 — OBJECTIVES</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-zinc-800 rounded-sm w-full" />
            <div className="h-2.5 bg-zinc-800 rounded-sm w-[92%]" />
            <div className="h-2.5 bg-zinc-300 rounded-sm w-[60%] animate-pulse" />
          </div>
        </div>
        <div>
          <span className="text-[9px] font-mono text-zinc-400 tracking-widest block mb-2">SECTION 1.2 — METHODOLOGY</span>
          <div className="space-y-2">
            <div className="h-2.5 bg-zinc-200 rounded-sm w-[40%] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
        <span className="text-[9px] font-mono text-zinc-400">Tailored to NSF rubric</span>
        <span className="text-[9px] font-mono text-black tracking-wider">GENERATING...</span>
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
    <div className="border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 tracking-widest">PIPELINE CONTROL</span>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 border-b border-zinc-200">
        <div className="px-4 py-3 border-r border-zinc-200 text-center">
          <span className="text-xl md:text-2xl font-bold text-black block">12</span>
          <span className="text-[9px] font-mono text-zinc-400 tracking-wider">ACTIVE</span>
        </div>
        <div className="px-4 py-3 border-r border-zinc-200 text-center">
          <span className="text-xl md:text-2xl font-bold text-black block">3</span>
          <span className="text-[9px] font-mono text-zinc-400 tracking-wider">DUE SOON</span>
        </div>
        <div className="px-4 py-3 text-center">
          <span className="text-xl md:text-2xl font-bold text-black block">$2.4M</span>
          <span className="text-[9px] font-mono text-zinc-400 tracking-wider">PIPELINE</span>
        </div>
      </div>
      {/* Pipeline items */}
      <div className="divide-y divide-zinc-100">
        {items.map((item) => (
          <div key={item.name} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-black tracking-wide">{item.name}</span>
              <span className="text-[9px] font-mono text-zinc-400">{item.deadline}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-zinc-100">
                <div className="h-full bg-black" style={{ width: `${item.progress}%` }} />
              </div>
              <span className="text-[9px] font-mono text-black bg-zinc-100 px-2 py-0.5 tracking-wider whitespace-nowrap">{item.stage}</span>
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
    <div className="border-b border-black">
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left: label + copy */}
        <div className="lg:w-2/5 px-6 md:px-12 lg:px-16 py-12 lg:py-20 flex flex-col justify-center lg:border-r lg:border-black">
          <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-400 mb-6 block">
            {feature.number} / {feature.label}
          </span>
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-black leading-[0.9] whitespace-pre-line">
            {feature.title}
          </h3>
          <p className="mt-8 text-lg md:text-xl text-zinc-500 max-w-[460px] leading-relaxed">
            {feature.description}
          </p>

          {/* Database list for AGGREGATE */}
          {feature.databases && (
            <div className="mt-8 flex flex-wrap gap-2">
              {feature.databases.map((db) => (
                <span
                  key={db}
                  className="text-[10px] font-mono tracking-[0.2em] text-black border border-black px-3 py-1.5 uppercase"
                >
                  {db}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: visual area */}
        <div className="lg:w-3/5 px-6 md:px-12 lg:px-16 py-12 lg:py-20 bg-zinc-50 flex items-center justify-center min-h-[320px] lg:min-h-[480px]">
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
   SYSTEM ARCHITECTURE — Replaces "Process"
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
    <section id="architecture" className="bg-white border-b border-black">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <div className="mb-24">
          <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-400 uppercase block mb-4">
            System
          </span>
          <h2 className="text-5xl md:text-7xl lg:text-[10vw] font-bold tracking-tighter text-black leading-[0.85] uppercase">
            Architecture.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {architecture.map((step, i) => (
            <div
              key={step.number}
              className={`py-10 lg:py-0 ${
                i > 0
                  ? "border-t border-black lg:border-t-0 lg:border-l lg:border-black"
                  : ""
              } lg:px-10 first:lg:pl-0 last:lg:pr-0`}
            >
              <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-400 block mb-8">
                {step.number} / {step.label}
              </span>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black mb-4">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
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
    <section id="system" className="bg-white border-b border-black">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-32">
        <div className="mb-16">
          <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-400 uppercase block mb-4">
            Coverage
          </span>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-black leading-[0.85] uppercase">
            Sectors.
          </h2>
        </div>

        <div className="flex flex-wrap gap-4">
          {sectors.map((sector) => (
            <span
              key={sector}
              className="border border-black px-6 py-3 text-xs font-mono text-black tracking-wide uppercase hover:bg-black hover:text-white transition-colors cursor-default"
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
    <section id="contact" className="bg-black">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-600 uppercase block mb-8">
          Access
        </span>
        <h2 className="text-5xl md:text-7xl lg:text-[10vw] font-bold tracking-tighter text-white leading-[0.85] uppercase">
          Start<br />searching.
        </h2>
        <p className="mt-8 text-lg md:text-2xl text-zinc-500 max-w-[500px] leading-relaxed">
          Replace manual grant workflows with a centralized intelligence system.
        </p>
        <div className="mt-12">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 bg-white text-black font-medium rounded-full px-8 py-4 text-sm tracking-wide uppercase border border-white hover:bg-black hover:text-white hover:border-zinc-700 transition-all duration-300 ease-in-out"
          >
            Get Access
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom border */}
      <div className="h-px bg-zinc-800" />
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="bg-black py-10">
      <div className="px-6 md:px-12 lg:px-16 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <span className="text-sm font-mono text-zinc-500 tracking-widest">
            Fundory.ai<sup className="text-[8px] ml-0.5">®</sup>
          </span>
          <span className="text-[10px] font-mono text-zinc-700 block mt-1 tracking-[0.2em]">
            &copy; 2026 All rights reserved.
          </span>
        </div>
        <div className="flex gap-8">
          <Link
            href="#"
            className="text-[10px] font-mono text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-[10px] font-mono text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-[10px] font-mono text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
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
    <main className="min-h-screen font-sans bg-white text-black">
      <HeroSection />
      <FeaturesSection />
      <ArchitectureSection />
      <SectorsSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
