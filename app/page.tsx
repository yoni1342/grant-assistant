import Link from "next/link";
import { PricingSection } from "@/components/landing/pricing-section";

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
        <div className="flex items-center gap-6">
          <span className="font-mono text-[10px] text-[#888] hidden md:block tracking-[0.3em] uppercase">
            EST. 2026
          </span>
          <Link
            href="/login"
            className="font-mono text-xs tracking-[0.12em] uppercase text-[#0A0A0A] hover:text-[#888] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Massive headline */}
      <div className="flex-1 flex flex-col justify-center mt-16 md:mt-0">
        <h1 className="font-display text-5xl md:text-7xl lg:text-[8vw] font-black tracking-tight leading-[0.88] text-[#0A0A0A] uppercase">
          <span className="block">Stop Chasing Grants.</span>
          <span className="block mt-2 md:mt-4">Start Winning Them.</span>
        </h1>
      </div>

      {/* Bottom: subheadline + CTA left, nav right */}
      <div className="flex flex-col lg:flex-row items-end justify-between gap-12 pb-4">
        <div className="max-w-[680px]">
          <p className="text-lg md:text-2xl text-[#888] leading-relaxed text-left">
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
              { label: "Pricing", href: "#pricing" },
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
    { value: "15+", label: "Data Sources Unified" },
    { value: "85%", label: "Avg. Eligibility Score" },
    { value: "Millions", label: "Pipeline Managed" },
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
  const results = [
    { title: "Community Health Worker Initiative", funder: "CDC NCIPC", amount: "$450,000", deadline: "Jun 15, 2026", source: "Grants.gov", score: "92%" },
    { title: "Rural Youth Substance Prevention", funder: "SAMHSA", amount: "$250,000", deadline: "Jul 01, 2026", source: "Grants.gov", score: "87%" },
    { title: "Family Resilience & Peer Support", funder: "Gates Foundation", amount: "$180,000", deadline: "Aug 20, 2026", source: "ProPublica", score: "84%" },
  ];
  return (
    <div className="rounded-lg border border-[#e2e2e2] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e2e2e2]">
        <span className="text-sm font-semibold text-[#0A0A0A]">Grant Discovery</span>
        <span className="text-[10px] text-[#888] ml-2">3 results</span>
      </div>
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-[#e2e2e2] flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-[#f8f8f6] border border-[#e2e2e2] rounded-md px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#888] shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span className="text-xs text-[#888]">community health + youth prevention</span>
        </div>
        <div className="shrink-0 bg-[#0A0A0A] text-white rounded-md px-3 py-2 text-xs font-medium flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Discover
        </div>
      </div>
      {/* Results */}
      <div className="divide-y divide-[#e2e2e2]">
        {results.map((r) => (
          <div key={r.title} className="px-4 py-3 hover:bg-[#fafaf8] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0A0A0A] leading-tight">{r.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#888]">
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    {r.funder}
                  </span>
                  <span>{r.amount}</span>
                  <span>{r.deadline}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] border border-[#e2e2e2] rounded px-1.5 py-0.5 text-[#888]">{r.source}</span>
                  <span className="text-[10px] bg-green-50 text-green-700 rounded px-1.5 py-0.5 font-medium">{r.score} match</span>
                </div>
              </div>
              <div className="shrink-0 text-[11px] bg-[#0A0A0A] text-white rounded-md px-2.5 py-1.5 font-medium">
                Add to Pipeline
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidateVisual() {
  const dimensions = [
    { label: "Mission Alignment", value: 18, color: "bg-green-500" },
    { label: "Target Population", value: 16, color: "bg-green-500" },
    { label: "Service/Program Fit", value: 17, color: "bg-green-500" },
    { label: "Geographic Alignment", value: 14, color: "bg-yellow-500" },
    { label: "Org Capacity", value: 12, color: "bg-yellow-500" },
  ];
  return (
    <div className="rounded-lg border border-[#e2e2e2] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e2e2e2]">
        <span className="text-sm font-semibold text-[#0A0A0A]">Screening Report</span>
      </div>
      {/* Score */}
      <div className="px-4 py-4 border-b border-[#e2e2e2] flex items-center gap-3">
        <span className="text-sm font-medium text-[#888]">Score:</span>
        <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-sm font-medium">85%</span>
        <span className="text-sm text-[#888]">(Strong Fit)</span>
      </div>
      {/* Dimension Scores */}
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm font-medium text-[#0A0A0A]">Scoring Breakdown</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {dimensions.map((d) => (
            <div key={d.label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#888]">{d.label}</span>
                <span className="font-medium text-[#0A0A0A]">{d.value}/20</span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f0ee] overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.color} transition-all`}
                  style={{ width: `${(d.value / 20) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Concerns */}
      <div className="px-4 py-3 border-t border-[#e2e2e2]">
        <p className="text-sm font-medium text-[#0A0A0A] flex items-center gap-1.5 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Concerns
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-[#888] flex items-start gap-2"><span className="text-yellow-500 mt-0.5">-</span>Geographic coverage may be limited to single state</p>
          <p className="text-[11px] text-[#888] flex items-start gap-2"><span className="text-yellow-500 mt-0.5">-</span>Organizational capacity for federal reporting requirements</p>
        </div>
      </div>
      {/* Recommendations */}
      <div className="px-4 py-3 border-t border-[#e2e2e2]">
        <p className="text-sm font-medium text-[#0A0A0A] flex items-center gap-1.5 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Recommendations
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-[#888] flex items-start gap-2"><span className="text-blue-500 mt-0.5">-</span>Strong alignment with funder&apos;s family empowerment priorities</p>
          <p className="text-[11px] text-[#888] flex items-start gap-2"><span className="text-blue-500 mt-0.5">-</span>Highlight peer support model as competitive differentiator</p>
        </div>
      </div>
    </div>
  );
}

function ComposeVisual() {
  return (
    <div className="rounded-lg border border-[#e2e2e2] bg-[#bfbfbf] shadow-sm overflow-hidden flex" style={{ height: 380 }}>
      {/* Sidebar thumbnails */}
      <div className="w-[72px] shrink-0 bg-[#f0f0ee] border-r border-[#e2e2e2] py-3 px-2 flex flex-col items-center gap-2.5 overflow-hidden">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`flex flex-col items-center gap-1`}>
            <div className={`w-[52px] h-[72px] bg-white border-2 rounded-[2px] overflow-hidden ${n === 1 ? "border-red-500 shadow-[0_0_0_1px_#ef4444]" : "border-[#e2e2e2]"}`}>
              {n === 1 && <div className="h-[3px] bg-gradient-to-r from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f]" />}
              <div className="p-1.5 space-y-1">
                {n === 1 ? (
                  <>
                    <div className="h-[3px] w-6 bg-[#888] mx-auto rounded-full" />
                    <div className="h-[2px] w-10 bg-[#ccc] mx-auto rounded-full mt-2" />
                    <div className="h-[2px] w-8 bg-[#ccc] mx-auto rounded-full" />
                  </>
                ) : (
                  <>
                    <div className="h-[2px] w-full bg-[#0A0A0A] rounded-full" />
                    <div className="h-[1.5px] w-full bg-[#ddd] rounded-full" />
                    <div className="h-[1.5px] w-full bg-[#ddd] rounded-full" />
                    <div className="h-[1.5px] w-[80%] bg-[#ddd] rounded-full" />
                    <div className="h-[2px] w-full bg-[#0A0A0A] rounded-full mt-1" />
                    <div className="h-[1.5px] w-full bg-[#ddd] rounded-full" />
                    <div className="h-[1.5px] w-[60%] bg-[#ddd] rounded-full" />
                  </>
                )}
              </div>
            </div>
            <span className={`text-[8px] ${n === 1 ? "text-red-500 font-semibold" : "text-[#888]"}`}>{n}</span>
          </div>
        ))}
      </div>
      {/* Main document area */}
      <div className="flex-1 flex items-start justify-center py-4 px-3 overflow-hidden">
        <div className="w-full max-w-[420px] bg-white shadow-md border border-[#e2e2e2]/50 relative" style={{ minHeight: 340 }}>
          {/* Cover page accent bar */}
          <div className="h-[6px] bg-gradient-to-r from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f]" />
          {/* Cover page content */}
          <div className="flex flex-col items-center justify-center text-center px-8 py-10">
            <span className="text-[9px] font-semibold text-[#5a6a7a] uppercase tracking-[0.03em]">Proposal for Grant</span>
            <h4 className="text-base font-extrabold text-[#1a2b42] mt-2 leading-tight">Building Resilient, Drug-Free Communities through Family Empowerment</h4>
            <div className="w-12 h-[2px] bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] rounded mt-3 mb-4" />
            <p className="text-[10px] text-[#5a6a7a] leading-relaxed">Submitted to: CDC NCIPC</p>
            <p className="text-[10px] text-[#5a6a7a]">Prepared by: Texas Parent to Parent</p>
            <p className="text-[10px] text-[#5a6a7a]">Date: March 24, 2026</p>
          </div>
          {/* Header bar for second section preview */}
          <div className="mx-6 border-t border-[#e0e4e8] pt-3 mt-2">
            <span className="text-[8px] font-semibold text-[#8a95a5] uppercase tracking-[0.06em]">Building Resilient, Drug-Free Communities</span>
          </div>
          <div className="px-6 pt-3 pb-6">
            <h5 className="text-[11px] font-bold text-[#1a2b42] border-b border-[#e0e4e8] pb-1.5 mb-2">1. Executive Summary</h5>
            <div className="space-y-1.5">
              <div className="h-[5px] bg-[#1a1a1a] w-full rounded-sm" />
              <div className="h-[5px] bg-[#1a1a1a] w-[96%] rounded-sm" />
              <div className="h-[5px] bg-[#1a1a1a] w-[90%] rounded-sm" />
              <div className="h-[5px] bg-[#d8d8d4] w-[75%] rounded-sm animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageVisual() {
  const columns = [
    {
      label: "Discovery", color: "bg-blue-500", count: 4,
      cards: [
        { title: "EPA Water Quality", funder: "EPA", amount: "$320K", score: null, scoreColor: "" },
        { title: "HUD Housing Stability", funder: "HUD", amount: "$185K", score: null, scoreColor: "" },
      ],
    },
    {
      label: "Screening", color: "bg-yellow-500", count: 3,
      cards: [
        { title: "DOE Clean Energy", funder: "DOE", amount: "$500K", score: "78%", scoreColor: "bg-yellow-100 text-yellow-800" },
        { title: "USAID Global Health", funder: "USAID", amount: "$750K", score: "82%", scoreColor: "bg-green-100 text-green-800" },
      ],
    },
    {
      label: "Drafting", color: "bg-purple-500", count: 2,
      cards: [
        { title: "CDC Youth Prevention", funder: "CDC NCIPC", amount: "$450K", score: "92%", scoreColor: "bg-purple-100 text-purple-800" },
      ],
    },
    {
      label: "Closed", color: "bg-gray-400", count: 1,
      cards: [
        { title: "NSF STEM Education", funder: "NSF", amount: "$200K", score: "95%", scoreColor: "bg-green-100 text-green-800" },
      ],
    },
  ];
  return (
    <div className="rounded-lg border border-[#e2e2e2] bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e2e2e2] flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-[#0A0A0A]">Pipeline</span>
          <span className="text-[10px] text-[#888] ml-2">10 grants in pipeline</span>
        </div>
      </div>
      {/* Kanban columns */}
      <div className="flex gap-2.5 p-3 overflow-x-auto bg-[#fafaf8]">
        {columns.map((col) => (
          <div key={col.label} className="w-[140px] shrink-0 bg-[#f0f0ee]/80 rounded-lg">
            {/* Column header */}
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <div className={`h-2 w-2 rounded-full ${col.color}`} />
              <span className="text-[11px] font-medium text-[#0A0A0A]">{col.label}</span>
              <span className="ml-auto text-[10px] text-[#888]">{col.count}</span>
            </div>
            {/* Cards */}
            <div className="px-1.5 pb-2 space-y-1.5">
              {col.cards.map((card) => (
                <div key={card.title} className="bg-white rounded-md border border-[#e2e2e2] p-2 shadow-sm hover:shadow transition-shadow">
                  <p className="text-[10px] font-medium text-[#0A0A0A] leading-tight">{card.title}</p>
                  <p className="text-[9px] text-[#888] mt-0.5">{card.funder}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] bg-[#f0f0ee] text-[#0A0A0A] rounded px-1.5 py-0.5 font-medium">{card.amount}</span>
                    {card.score && (
                      <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-medium ${card.scoreColor}`}>{card.score}</span>
                    )}
                  </div>
                </div>
              ))}
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
const databases = ["Grants.gov", "ProPublica", "USAspending", "CFDA", "PND", "Candid", "NIH Reporter", "Grantivia"];

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
        <div className="flex flex-wrap gap-4 items-center mb-16">
          {databases.map((db) => (
            <span
              key={db}
              className="border-2 border-[#0A0A0A] px-6 py-3 font-mono text-xs text-[#0A0A0A] tracking-wide uppercase hover:bg-[#0A0A0A] hover:text-[#F5F5F0] transition-colors cursor-default"
            >
              {db}
            </span>
          ))}
          <span className="border-2 border-dashed border-[#888] px-6 py-3 font-mono text-xs text-[#888] tracking-wide uppercase">
            + more
          </span>
        </div>

        {/* Sectors */}
        <div className="mb-8">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-6">
            Serving organizations across all major grant sectors
          </span>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {sectors.map((sector) => (
            <span
              key={sector}
              className="border-2 border-[#0A0A0A] px-6 py-3 font-mono text-xs text-[#0A0A0A] tracking-wide uppercase hover:bg-[#0A0A0A] hover:text-[#F5F5F0] transition-colors cursor-default"
            >
              {sector}
            </span>
          ))}
          <span className="border-2 border-dashed border-[#888] px-6 py-3 font-mono text-xs text-[#888] tracking-wide uppercase">
            + many more
          </span>
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
      <PricingSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
