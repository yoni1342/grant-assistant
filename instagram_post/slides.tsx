"use client";

import {
  Search,
  Zap,
  ArrowUpRight,
  Building2,
  AlertTriangle,
  Plus,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════
   Fundory Instagram Carousel — 7 slides @ 1080×1080
   Editorial / blueprint aesthetic, brand-coherent with app.
   Palette:
     ink     #0A0A0A   cream  #F5F5F0   white  #FFFFFF
     muted   #888      hair   #D8D8D4
     accent  #FF5A1F   (tactical, sparing)
     navy    #1E3A5F   (existing brand secondary)
   Type:
     font-display = Barlow Condensed   font-mono = Space Mono
   Motifs:
     • crop-mark plus signs at corners
     • giant ghost-outlined display numbers
     • dimension lines / scale indicators
     • marquee ticker bars
     • UI mocks framed with offset shadow + reg marks
   ════════════════════════════════════════════════════════════ */

const W = 1080;
const SLIDE: React.CSSProperties = {
  width: W,
  height: W,
  position: "relative",
  overflow: "hidden",
};
const ACCENT = "#FF5A1F";

// Daily-generated copy. Slide 1 (cover) + Slide 7 (CTA) read from here when
// present; otherwise they fall back to the launch-day defaults. Brand pillars
// (Reality / Stats / Aggregate / Validate / Compose) intentionally stay
// constant — they're the unchanging product story.
export type DailyContent = {
  slide1: {
    eyebrow: string;
    headlineTop: string;
    headlineMid: string;
    headlineBot: string;
    subheadline: string;
    briefing: string;
  };
  slide7: {
    eyebrow: string;
    headlineTop: string;
    headlineMid: string;
    headlineAccent: string;
    headlineBot: string;
  };
};

const DEFAULT_DAILY: DailyContent = {
  slide1: {
    eyebrow: "▌ Launching · Q2 2026",
    headlineTop: "Stop",
    headlineMid: "chasing",
    headlineBot: "grants.",
    subheadline: "Start winning them.",
    briefing:
      "The grant intelligence platform built for organizations that can’t afford to leave funding on the table.",
  },
  slide7: {
    eyebrow: "▌ Now in early access",
    headlineTop: "Win the",
    headlineMid: "grants you",
    headlineAccent: "already",
    headlineBot: "deserve.",
  },
};

/* ────────── shared decorative atoms ────────── */

function CropMark({
  x,
  y,
  color = "#0A0A0A",
}: {
  x: "left" | "right";
  y: "top" | "bottom";
  color?: string;
}) {
  return (
    <Plus
      size={14}
      strokeWidth={1}
      style={{
        position: "absolute",
        [x]: 22,
        [y]: 22,
        color,
      }}
    />
  );
}

function CropMarks({ color = "#0A0A0A" }: { color?: string }) {
  return (
    <>
      <CropMark x="left" y="top" color={color} />
      <CropMark x="right" y="top" color={color} />
      <CropMark x="left" y="bottom" color={color} />
      <CropMark x="right" y="bottom" color={color} />
    </>
  );
}

function Ticker({
  text,
  color = "#0A0A0A",
  bg,
  position = "top",
  thick = false,
}: {
  text: string;
  color?: string;
  bg?: string;
  position?: "top" | "bottom";
  thick?: boolean;
}) {
  const items = Array.from({ length: 14 }, (_, i) => (
    <span key={i} className="flex items-center gap-3 shrink-0">
      <span
        className="font-mono uppercase whitespace-nowrap"
        style={{
          fontSize: thick ? 14 : 11,
          letterSpacing: "0.28em",
          color,
        }}
      >
        {text}
      </span>
      <span style={{ color, opacity: 0.5 }}>✦</span>
    </span>
  ));
  return (
    <div
      className="absolute left-0 right-0 flex items-center overflow-hidden"
      style={{
        [position]: 0,
        height: thick ? 38 : 28,
        background: bg ?? "transparent",
        borderTop: position === "bottom" ? `1px solid ${color}30` : undefined,
        borderBottom: position === "top" ? `1px solid ${color}30` : undefined,
        gap: 24,
        padding: "0 24px",
      }}
    >
      {items}
    </div>
  );
}

function GhostNumber({
  n,
  size = 720,
  top,
  left,
  right,
  bottom,
  color = "#0A0A0A",
  opacity = 0.06,
}: {
  n: string;
  size?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <span
      className="font-display font-black uppercase select-none pointer-events-none"
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        fontSize: size,
        lineHeight: 0.78,
        letterSpacing: "-0.04em",
        color: "transparent",
        WebkitTextStroke: `1.5px ${color}`,
        opacity,
      }}
    >
      {n}
    </span>
  );
}

function Grain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none mix-blend-multiply"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
      }}
    />
  );
}

function Slug({
  k,
  v,
  color = "#0A0A0A",
}: {
  k: string;
  v: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "0.3em", color: color === "#0A0A0A" ? "#888" : "#9a9a90" }}
      >
        {k}
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "0.18em", color }}
      >
        {v}
      </span>
    </div>
  );
}

/* Brand: convergence mark + name + subtitle */
function ConvergenceMark({
  color = "#0A0A0A",
  scale = 1,
}: {
  color?: string;
  scale?: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 5 * scale }}>
      <div style={{ height: 4 * scale, width: 28 * scale, background: color }} />
      <div style={{ height: 4 * scale, width: 20 * scale, background: color }} />
      <div style={{ height: 4 * scale, width: 12 * scale, background: color }} />
    </div>
  );
}

function BrandLockup({
  inverse = false,
  scale = 1,
}: {
  inverse?: boolean;
  scale?: number;
}) {
  const ink = inverse ? "#F5F5F0" : "#0A0A0A";
  const hair = inverse ? "#3a3a36" : "#D8D8D4";
  const muted = inverse ? "#9a9a90" : "#888";
  return (
    <div className="flex items-center" style={{ gap: 16 * scale }}>
      <ConvergenceMark color={ink} scale={scale} />
      <div style={{ height: 24 * scale, width: 1, background: hair }} />
      <div className="flex flex-col">
        <span
          className="font-display font-black uppercase leading-none"
          style={{ color: ink, fontSize: 16 * scale, letterSpacing: "0.04em" }}
        >
          Fundory
        </span>
        <span
          className="font-mono uppercase"
          style={{
            color: muted,
            fontSize: 9 * scale,
            letterSpacing: "0.18em",
            marginTop: 2 * scale,
          }}
        >
          Grant Intelligence Platform
        </span>
      </div>
    </div>
  );
}

/* Powered by brownmine.ai — small attribution lockup */
function PoweredBy({
  inverse = false,
  scale = 1,
}: {
  inverse?: boolean;
  scale?: number;
}) {
  const muted = inverse ? "#9a9a90" : "#888";
  return (
    <div className="flex items-center" style={{ gap: 8 * scale }}>
      <span
        className="font-mono uppercase"
        style={{
          color: muted,
          fontSize: 9 * scale,
          letterSpacing: "0.28em",
        }}
      >
        Powered by
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brownmine-logo.svg"
        alt="brownmine.ai"
        style={{
          height: 18 * scale,
          width: "auto",
          display: "block",
          filter: inverse ? "none" : "invert(1)",
        }}
      />
    </div>
  );
}

function SlideFrame({
  children,
  bg = "#F5F5F0",
  borderColor = "#0A0A0A",
  hasBottomTicker = false,
  suppressPoweredBy = false,
}: {
  children: React.ReactNode;
  bg?: string;
  borderColor?: string;
  hasBottomTicker?: boolean;
  suppressPoweredBy?: boolean;
}) {
  const isDarkBg = bg === "#0A0A0A" || bg === "#000000" || bg === "#1a1a18";
  return (
    <div style={{ ...SLIDE, background: bg }}>
      {children}
      <Grain />
      {!suppressPoweredBy && (
        <div
          className="absolute"
          style={{ bottom: hasBottomTicker ? 50 : 18, right: 28 }}
        >
          <PoweredBy inverse={isDarkBg} />
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: 2, background: borderColor }}
      />
    </div>
  );
}

/* Dimension scale on the right edge: vertical line w/ tick marks + label */
function DimensionScale({
  height = 600,
  top = 200,
  right = 28,
  label = "1080",
  color = "#0A0A0A",
}: {
  height?: number;
  top?: number;
  right?: number;
  label?: string;
  color?: string;
}) {
  const ticks = 6;
  return (
    <div className="absolute" style={{ top, right, height, width: 24 }}>
      <div
        className="absolute"
        style={{ top: 0, bottom: 0, right: 11, width: 1, background: color, opacity: 0.4 }}
      />
      {Array.from({ length: ticks }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: (i / (ticks - 1)) * 100 + "%",
            right: 7,
            width: 9,
            height: 1,
            background: color,
            opacity: 0.4,
          }}
        />
      ))}
      <span
        className="font-mono uppercase absolute"
        style={{
          right: 16,
          top: "50%",
          transform: "rotate(-90deg) translateY(-50%)",
          transformOrigin: "right center",
          fontSize: 9,
          letterSpacing: "0.3em",
          color,
          opacity: 0.55,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 1 — COVER
   ════════════════════════════════════════════════════════════ */
export function Slide1({
  daily = DEFAULT_DAILY,
  solo = false,
  totalSlides = 7,
}: {
  daily?: DailyContent;
  solo?: boolean; // single-page post — no swipe indicator, inline handle
  totalSlides?: number;
} = {}) {
  const s = daily.slide1;
  // Render the subheadline so any word can be the accent (orange). The first
  // word becomes the accent unless the string is wrapped in {{ }} markers like
  // "Start {{winning}} them."
  const parsedSub = (() => {
    const m = s.subheadline.match(/^(.*?)\{\{(.+?)\}\}(.*)$/);
    if (m) return { before: m[1], accent: m[2], after: m[3] };
    const words = s.subheadline.split(" ");
    if (words.length >= 3)
      return {
        before: words[0] + " ",
        accent: words[1],
        after: " " + words.slice(2).join(" "),
      };
    return { before: "", accent: s.subheadline, after: "" };
  })();
  return (
    <SlideFrame suppressPoweredBy>
      <CropMarks />
      <Ticker text="Fundory · Grant Intelligence · Now in early access · Issue 001" position="top" />

      {/* Left edge accent slab */}
      <div
        className="absolute"
        style={{ left: 0, top: 200, bottom: 200, width: 8, background: ACCENT }}
      />

      {/* Top header */}
      <div className="absolute flex items-center justify-between" style={{ top: 60, left: 56, right: 56 }}>
        <BrandLockup />
        <div className="flex items-center gap-4">
          <Slug k="Issue" v="001 · 2026" />
        </div>
      </div>

      {/* Ghost mega-text behind */}
      <GhostNumber n="01" top={140} left={-40} size={720} />

      {/* Headline block, asymmetric */}
      <div className="absolute" style={{ top: 240, left: 70, right: 70 }}>
        <span
          className="font-mono uppercase block"
          style={{ fontSize: 12, letterSpacing: "0.32em", color: ACCENT, marginBottom: 18 }}
        >
          {s.eyebrow}
        </span>

        <h1
          className="font-display font-black uppercase text-[#0A0A0A]"
          style={{ fontSize: 158, lineHeight: 0.84, letterSpacing: "-0.03em" }}
        >
          {s.headlineTop}
          <br />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 28 }}>
            {s.headlineMid}
            <span
              style={{
                display: "inline-block",
                width: 96,
                height: 6,
                background: ACCENT,
                marginBottom: 14,
              }}
            />
          </span>
          <br />
          <span style={{ color: "transparent", WebkitTextStroke: "2px #0A0A0A" }}>
            {s.headlineBot}
          </span>
        </h1>

        <h2
          className="font-display font-black uppercase"
          style={{
            fontSize: 96,
            lineHeight: 0.86,
            letterSpacing: "-0.025em",
            marginTop: 16,
            color: "#0A0A0A",
          }}
        >
          {parsedSub.before}
          <span style={{ color: ACCENT }}>{parsedSub.accent}</span>
          {parsedSub.after}
        </h2>
      </div>

      {/* Bottom row */}
      <div
        className="absolute flex items-end justify-between"
        style={{ left: 70, right: 70, bottom: 140 }}
      >
        <div className="max-w-[480px]">
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <div style={{ width: 36, height: 1, background: "#0A0A0A" }} />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 11, letterSpacing: "0.3em", color: "#0A0A0A" }}
            >
              The Briefing
            </span>
          </div>
          <p className="text-[#0A0A0A]" style={{ fontSize: 19, lineHeight: 1.45 }}>
            {s.briefing}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {!solo && (
            <span
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "0.3em", color: "#888" }}
            >
              01 / {String(totalSlides).padStart(2, "0")}
            </span>
          )}
          {solo ? (
            <div className="flex flex-col items-end" style={{ gap: 6 }}>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.3em", color: "#888" }}
              >
                fundory.ai
              </span>
              <span
                className="font-display font-black uppercase text-[#0A0A0A]"
                style={{ fontSize: 28, letterSpacing: "0.02em", lineHeight: 1 }}
              >
                @fundoryai
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 font-mono uppercase"
              style={{
                fontSize: 12,
                letterSpacing: "0.24em",
                color: "#0A0A0A",
                border: "1.5px solid #0A0A0A",
                padding: "10px 16px",
                borderRadius: 999,
              }}
            >
              Swipe
              <ArrowUpRight size={14} strokeWidth={1.6} className="rotate-45" />
            </div>
          )}
        </div>
      </div>

      {/* Prominent Powered-by attribution band (cover only) */}
      <div
        className="absolute flex items-center justify-between"
        style={{ left: 70, right: 70, bottom: 44 }}
      >
        <div style={{ flex: 1, height: 1, background: "#0A0A0A", opacity: 0.25, marginRight: 24 }} />
        <div className="flex items-center" style={{ gap: 16 }}>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 13, letterSpacing: "0.34em", color: "#0A0A0A" }}
          >
            Powered by
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brownmine-logo.svg"
            alt="brownmine.ai"
            style={{ height: 36, width: "auto", display: "block", filter: "invert(1)" }}
          />
        </div>
      </div>
    </SlideFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 2 — THE REALITY
   ════════════════════════════════════════════════════════════ */
export function Slide2() {
  const problems = [
    { n: "01", t: "Fragmented", body: "Five sources. Five interfaces. Hours lost to copy-paste reconciliation." },
    { n: "02", t: "Guesswork", body: "You read the RFP, assume you qualify. Three weeks later you find out you never were." },
    { n: "03", t: "Generic", body: "Templates built for anyone win for no one. Funders read hundreds." },
    { n: "04", t: "Invisible", body: "Pipeline in spreadsheets, deadlines in inboxes. A $500K grant fails at management." },
  ];
  return (
    <SlideFrame bg="#FFFFFF">
      <CropMarks />
      <Ticker text="The reality · The reality · The reality · 02 / 07" position="top" />

      <div className="absolute flex items-center justify-between" style={{ top: 64, left: 56, right: 56 }}>
        <BrandLockup />
        <Slug k="Section" v="The Reality" />
      </div>

      {/* Pull quote treatment */}
      <div className="absolute" style={{ top: 184, left: 70, right: 70 }}>
        <span
          className="font-mono uppercase block"
          style={{ fontSize: 11, letterSpacing: "0.3em", color: ACCENT, marginBottom: 14 }}
        >
          ▌ A diagnosis
        </span>
        <h2
          className="font-display font-black uppercase text-[#0A0A0A]"
          style={{ fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.025em" }}
        >
          Your mission
          <br />
          is{" "}
          <span style={{ color: "transparent", WebkitTextStroke: "1.5px #0A0A0A" }}>
            fundable.
          </span>
          <br />
          Your <span style={{ color: ACCENT }}>process</span> is
          <br />
          the{" "}
          <span
            style={{
              display: "inline-block",
              background: "#0A0A0A",
              color: "#F5F5F0",
              padding: "2px 16px 6px",
              lineHeight: 1,
              transform: "translateY(6px)",
            }}
          >
            problem.
          </span>
        </h2>
      </div>

      {/* Numbered problem ribbon */}
      <div
        className="absolute"
        style={{
          left: 56,
          right: 56,
          bottom: 72,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1.5px solid #0A0A0A",
        }}
      >
        {problems.map((p, i) => (
          <div
            key={p.n}
            className="flex flex-col"
            style={{
              padding: 22,
              borderRight: i < 3 ? "1.5px solid #0A0A0A" : undefined,
              minHeight: 200,
              background: i === 0 ? "#0A0A0A" : "#FFFFFF",
              color: i === 0 ? "#F5F5F0" : "#0A0A0A",
            }}
          >
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                color: i === 0 ? "#9a9a90" : "#888",
                marginBottom: 14,
              }}
            >
              {p.n} —
            </span>
            <h3
              className="font-display font-black uppercase"
              style={{
                fontSize: 38,
                lineHeight: 0.95,
                letterSpacing: "-0.015em",
                marginBottom: 10,
                color: i === 0 ? "#F5F5F0" : "#0A0A0A",
              }}
            >
              {p.t}.
            </h3>
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.45,
                color: i === 0 ? "#cfcfc8" : "#888",
              }}
            >
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 3 — STATS
   ════════════════════════════════════════════════════════════ */
export function Slide3() {
  return (
    <SlideFrame>
      <CropMarks />
      <Ticker text="By the numbers · 10K+ · 15+ sources · 85% · Millions managed · 03 / 07" position="top" />

      <div className="absolute flex items-center justify-between" style={{ top: 64, left: 56, right: 56 }}>
        <BrandLockup />
        <Slug k="Section" v="By the Numbers" />
      </div>

      <div className="absolute" style={{ top: 168, left: 70, right: 70 }}>
        <span
          className="font-mono uppercase block"
          style={{ fontSize: 11, letterSpacing: "0.3em", color: ACCENT, marginBottom: 12 }}
        >
          ▌ The math
        </span>
        <h2
          className="font-display font-black uppercase text-[#0A0A0A]"
          style={{ fontSize: 78, lineHeight: 0.86, letterSpacing: "-0.025em" }}
        >
          Built for the
          <br />
          math of modern
          <br />
          fundraising.
        </h2>
      </div>

      {/* Hero stat — full bleed orange */}
      <div
        className="absolute"
        style={{
          top: 540,
          left: 56,
          width: 480,
          height: 380,
          background: ACCENT,
          padding: 30,
          color: "#0A0A0A",
        }}
      >
        <div className="flex items-start justify-between">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.3em", color: "#0A0A0A" }}
          >
            01 — Indexed
          </span>
          <ArrowUpRight size={20} strokeWidth={1.6} />
        </div>
        <div
          className="font-display font-black"
          style={{
            fontSize: 280,
            lineHeight: 0.84,
            letterSpacing: "-0.04em",
            marginTop: 14,
          }}
        >
          10K+
        </div>
        <div
          className="font-display font-black uppercase"
          style={{ fontSize: 22, letterSpacing: "0.02em", marginTop: 6, lineHeight: 1 }}
        >
          Grants Indexed
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 12, maxWidth: 320 }}>
          Across federal, state, and philanthropic sources — deduplicated and structured.
        </p>
      </div>

      {/* Three small stats in a vertical stack on the right */}
      <div
        className="absolute flex flex-col"
        style={{
          top: 540,
          right: 56,
          width: 444,
          height: 380,
          border: "1.5px solid #0A0A0A",
        }}
      >
        {[
          { v: "15+", l: "Data Sources Unified", sub: "Federal, state, philanthropic — deduplicated" },
          { v: "85%", l: "Avg. Eligibility Score", sub: "AI screening on 6 dimensions" },
          { v: "Millions", l: "Pipeline Managed", sub: "End-to-end from discovery to award" },
        ].map((s, i) => (
          <div
            key={s.l}
            className="flex items-center justify-between"
            style={{
              flex: 1,
              padding: "0 24px",
              borderBottom: i < 2 ? "1px solid #0A0A0A" : undefined,
              gap: 16,
            }}
          >
            <span
              className="font-display font-black text-[#0A0A0A]"
              style={{ fontSize: 80, letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              {s.v}
            </span>
            <div className="flex flex-col items-end text-right">
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "0.22em", color: "#0A0A0A" }}
              >
                {s.l}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginTop: 6,
                  maxWidth: 200,
                  lineHeight: 1.35,
                }}
              >
                {s.sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

/* ────────────── Mini UI primitives (kept clean — they ARE the product) ────────────── */

function MiniDiscoveryCard() {
  const results = [
    { title: "Community Health Worker Initiative", funder: "CDC NCIPC", amount: "$450,000", source: "Grants.gov", score: "92%" },
    { title: "Rural Youth Substance Prevention", funder: "SAMHSA", amount: "$250,000", source: "Grants.gov", score: "87%" },
    { title: "Family Resilience & Peer Support", funder: "Gates Foundation", amount: "$180,000", source: "ProPublica", score: "84%" },
  ];
  return (
    <div className="rounded-[10px] bg-white overflow-hidden" style={{ border: "1px solid #e2e2e2", boxShadow: "0 24px 60px -28px rgba(10,10,10,0.35)" }}>
      <div className="flex items-center justify-between" style={{ padding: "14px 18px", borderBottom: "1px solid #e2e2e2" }}>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[#0A0A0A]" style={{ fontSize: 14 }}>Grant Discovery</span>
          <span className="text-[#888]" style={{ fontSize: 11 }}>3 results</span>
        </div>
        <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "#888" }}>Live</span>
      </div>
      <div className="flex gap-2" style={{ padding: "12px 14px", borderBottom: "1px solid #e2e2e2" }}>
        <div className="flex-1 flex items-center gap-2 rounded-md" style={{ background: "#f8f8f6", border: "1px solid #e2e2e2", padding: "8px 12px" }}>
          <Search size={13} className="text-[#888] shrink-0" strokeWidth={2} />
          <span style={{ fontSize: 12, color: "#888" }}>community health + youth prevention</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md text-white font-medium" style={{ background: "#0A0A0A", padding: "8px 12px", fontSize: 12 }}>
          <Zap size={11} strokeWidth={2.5} />
          Discover
        </div>
      </div>
      <div>
        {results.map((r, i) => (
          <div key={r.title} className="flex items-start justify-between gap-3" style={{ padding: "14px 18px", borderBottom: i < results.length - 1 ? "1px solid #e2e2e2" : undefined }}>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#0A0A0A]" style={{ fontSize: 13.5, lineHeight: 1.3 }}>{r.title}</p>
              <div className="flex items-center" style={{ gap: 12, marginTop: 6, fontSize: 11, color: "#888" }}>
                <span className="flex items-center gap-1"><Building2 size={10} strokeWidth={2} /> {r.funder}</span>
                <span>{r.amount}</span>
              </div>
              <div className="flex items-center" style={{ gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 10, border: "1px solid #e2e2e2", borderRadius: 4, padding: "2px 6px", color: "#888" }}>{r.source}</span>
                <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", borderRadius: 4, padding: "2px 6px", fontWeight: 500 }}>{r.score} match</span>
              </div>
            </div>
            <div className="shrink-0 text-white font-medium rounded-md" style={{ background: "#0A0A0A", padding: "6px 10px", fontSize: 11 }}>
              Add
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniScreeningCard() {
  const dims = [
    { label: "Mission", value: 18, color: "#22c55e" },
    { label: "Population", value: 16, color: "#22c55e" },
    { label: "Program", value: 17, color: "#22c55e" },
    { label: "Geography", value: 14, color: "#eab308" },
    { label: "Capacity", value: 12, color: "#eab308" },
    { label: "Track Record", value: 16, color: "#22c55e" },
  ];
  return (
    <div className="rounded-[10px] bg-white overflow-hidden" style={{ border: "1px solid #e2e2e2", boxShadow: "0 24px 60px -28px rgba(10,10,10,0.35)" }}>
      <div className="flex items-center justify-between" style={{ padding: "14px 18px", borderBottom: "1px solid #e2e2e2" }}>
        <span className="font-semibold text-[#0A0A0A]" style={{ fontSize: 14 }}>Screening Report</span>
        <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.18em", color: "#888" }}>AI Calibrated</span>
      </div>
      <div className="flex items-center gap-3" style={{ padding: "16px 18px", borderBottom: "1px solid #e2e2e2" }}>
        <span className="text-[#888]" style={{ fontSize: 13 }}>Composite</span>
        <span className="inline-flex items-center rounded-full font-medium" style={{ background: "#dcfce7", color: "#15803d", padding: "3px 12px", fontSize: 13 }}>85%</span>
        <span className="text-[#888]" style={{ fontSize: 13 }}>Strong Fit · Submit</span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <p className="font-medium text-[#0A0A0A]" style={{ fontSize: 12, marginBottom: 12 }}>Scoring Breakdown</p>
        <div className="grid grid-cols-2" style={{ rowGap: 10, columnGap: 22 }}>
          {dims.map((d) => (
            <div key={d.label}>
              <div className="flex justify-between" style={{ fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#888" }}>{d.label}</span>
                <span style={{ fontWeight: 500, color: "#0A0A0A" }}>{d.value}/20</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#f0f0ee" }}>
                <div style={{ height: "100%", borderRadius: 999, background: d.color, width: `${(d.value / 20) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e2e2" }}>
        <p className="font-medium text-[#0A0A0A] flex items-center gap-1.5" style={{ fontSize: 12, marginBottom: 6 }}>
          <AlertTriangle size={12} color="#eab308" strokeWidth={2} /> Concerns
        </p>
        <p style={{ fontSize: 10.5, color: "#888" }}>— Geographic coverage limited to single state</p>
      </div>
    </div>
  );
}

function MiniComposeCard() {
  return (
    <div className="rounded-[10px] overflow-hidden flex" style={{ height: 360, border: "1px solid #e2e2e2", boxShadow: "0 24px 60px -28px rgba(10,10,10,0.35)", background: "#bfbfbf" }}>
      <div className="shrink-0 flex flex-col items-center" style={{ width: 70, background: "#f0f0ee", borderRight: "1px solid #e2e2e2", padding: "12px 8px", gap: 10 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <div className="bg-white" style={{ width: 50, height: 68, border: n === 1 ? "2px solid #1e3a5f" : "1px solid #e2e2e2" }}>
              {n === 1 && <div style={{ height: 3, background: "linear-gradient(90deg,#1e3a5f,#2d5a8e,#1e3a5f)" }} />}
              <div style={{ padding: 6 }} className="space-y-1">
                {n === 1 ? (
                  <>
                    <div style={{ height: 3, width: 22, margin: "0 auto", borderRadius: 99, background: "#888" }} />
                    <div style={{ height: 2, width: 36, margin: "8px auto 0", borderRadius: 99, background: "#ccc" }} />
                  </>
                ) : (
                  <>
                    <div style={{ height: 2, width: "100%", borderRadius: 99, background: "#0A0A0A" }} />
                    <div style={{ height: 1.5, width: "100%", borderRadius: 99, background: "#ddd" }} />
                    <div style={{ height: 1.5, width: "82%", borderRadius: 99, background: "#ddd" }} />
                  </>
                )}
              </div>
            </div>
            <span style={{ fontSize: 8, color: n === 1 ? "#1e3a5f" : "#888", fontWeight: n === 1 ? 600 : 400 }}>{n}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex items-start justify-center" style={{ padding: "16px 12px" }}>
        <div className="bg-white relative" style={{ width: "100%", maxWidth: 380, minHeight: 320, boxShadow: "0 4px 14px -6px rgba(0,0,0,0.18)" }}>
          <div style={{ height: 5, background: "linear-gradient(90deg,#1e3a5f,#2d5a8e,#1e3a5f)" }} />
          <div className="flex flex-col items-center text-center" style={{ padding: "44px 26px 28px" }}>
            <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.3em", color: "#888", marginBottom: 16 }}>
              Submitted To
            </span>
            <p className="font-display font-black uppercase text-[#0A0A0A]" style={{ fontSize: 16, letterSpacing: "0.02em", lineHeight: 1.05, marginBottom: 4 }}>
              CDC NCIPC
            </p>
            <p style={{ fontSize: 10, color: "#888", marginBottom: 24 }}>Family Resilience &amp; Peer Support</p>
            <div style={{ height: 1, width: 64, background: "#0A0A0A", marginBottom: 24 }} />
            <p className="font-display font-black uppercase text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: 0.95, letterSpacing: "-0.01em" }}>
              Restoring the
              <br />
              connective
              <br />
              tissue of
              <br />
              communities.
            </p>
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.3em", color: "#888", marginTop: 24 }}>
              Submitted by Riverside Foundation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable: feature slide where the UI mock is the hero */
function FeatureSlide({
  num,
  label,
  hero,
  sub,
  pills,
  card,
  bg = "#F5F5F0",
  ghostNum,
}: {
  num: string;
  label: string;
  hero: React.ReactNode;
  sub: string;
  pills: string[];
  card: React.ReactNode;
  bg?: string;
  ghostNum: string;
}) {
  return (
    <SlideFrame bg={bg}>
      <CropMarks />
      <Ticker text={`Feature ${num} · ${label} · ${num === "01" ? "04" : num === "02" ? "05" : "06"} / 07`} position="top" />
      <DimensionScale label={label.toUpperCase()} />

      <GhostNumber n={ghostNum} top={120} right={-60} size={680} opacity={0.07} />

      <div className="absolute flex items-center justify-between" style={{ top: 64, left: 56, right: 56 }}>
        <BrandLockup />
        <Slug k="Section" v={label} />
      </div>

      {/* Left column: text */}
      <div className="absolute" style={{ top: 168, left: 70, width: 420 }}>
        <div className="flex items-baseline gap-3" style={{ marginBottom: 14 }}>
          <span
            className="font-display font-black"
            style={{ fontSize: 60, color: ACCENT, letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            ↳
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 12, letterSpacing: "0.3em", color: "#0A0A0A" }}
          >
            {num} — {label}
          </span>
        </div>

        <h2
          className="font-display font-black uppercase text-[#0A0A0A]"
          style={{ fontSize: 84, lineHeight: 0.86, letterSpacing: "-0.025em" }}
        >
          {hero}
        </h2>

        <p
          className="text-[#0A0A0A]"
          style={{ fontSize: 16, lineHeight: 1.5, marginTop: 22, opacity: 0.7 }}
        >
          {sub}
        </p>

        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 26 }}>
          {pills.map((p) => (
            <span
              key={p}
              className="font-mono uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.18em",
                color: "#0A0A0A",
                border: "1.5px solid #0A0A0A",
                padding: "5px 10px",
                borderRadius: 99,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Right column: framed UI mock */}
      <div className="absolute" style={{ right: 70, top: 230, width: 460 }}>
        {/* Frame label */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "0.3em", color: "#0A0A0A" }}
          >
            ▌ Live UI · {label}
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "0.3em", color: "#888" }}
          >
            REC.
          </span>
        </div>

        <div style={{ position: "relative" }}>
          {/* Offset accent shadow */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: -12,
              bottom: -12,
              background: ACCENT,
              opacity: 0.85,
              borderRadius: 10,
            }}
          />
          <div style={{ position: "relative" }}>{card}</div>
        </div>

        {/* Caption */}
        <p
          className="font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "#888",
            marginTop: 14,
            textAlign: "right",
          }}
        >
          Fig. {num} — {label} interface, actual product
        </p>
      </div>

      <div
        className="absolute flex items-center justify-between"
        style={{ left: 56, right: 56, bottom: 38 }}
      >
        <Slug k="Page" v={`${num === "01" ? "04" : num === "02" ? "05" : "06"} of 07`} />
        <Slug k="Spec" v="1080 × 1080" />
      </div>
    </SlideFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 4 — AGGREGATE
   ════════════════════════════════════════════════════════════ */
export function Slide4() {
  return (
    <FeatureSlide
      num="01"
      label="Aggregate"
      ghostNum="01"
      hero={
        <>
          Every
          <br />
          source.
          <br />
          <span style={{ color: ACCENT }}>One</span> search.
        </>
      }
      sub="Cross-reference Grants.gov, ProPublica, USAspending, CFDA and PND simultaneously. Structured, deduplicated, ranked — no manual reconciliation."
      pills={["Grants.gov", "ProPublica", "USAspending", "CFDA", "PND"]}
      card={<MiniDiscoveryCard />}
    />
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 5 — VALIDATE
   ════════════════════════════════════════════════════════════ */
export function Slide5() {
  return (
    <FeatureSlide
      num="02"
      label="Validate"
      ghostNum="02"
      bg="#FFFFFF"
      hero={
        <>
          Know
          <br />
          before
          <br />
          you <span style={{ color: ACCENT }}>apply.</span>
        </>
      }
      sub="AI-powered eligibility scoring calibrated to your organization's profile. An 80%+ composite means submit. Anything below means walk."
      pills={["6-dimension", "Org-calibrated", "Concerns flagged", "Strong fit"]}
      card={<MiniScreeningCard />}
    />
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 6 — COMPOSE
   ════════════════════════════════════════════════════════════ */
export function Slide6() {
  return (
    <FeatureSlide
      num="03"
      label="Compose"
      ghostNum="03"
      hero={
        <>
          Proposals
          <br />
          that{" "}
          <span style={{ color: ACCENT }}>speak</span>
          <br />
          funder.
        </>
      }
      sub="Executive summaries, program narratives and evaluation plans, generated to the specific rubric and language priorities of the target funder."
      pills={["Funder-specific", "Rubric-aligned", "Editable", "Cite-ready"]}
      card={<MiniComposeCard />}
    />
  );
}

/* ════════════════════════════════════════════════════════════
   SLIDE 7 — CTA / CLOSE
   ════════════════════════════════════════════════════════════ */
export function Slide7({ daily = DEFAULT_DAILY }: { daily?: DailyContent } = {}) {
  const s = daily.slide7;
  return (
    <SlideFrame bg="#0A0A0A" borderColor="#F5F5F0" hasBottomTicker>
      <CropMarks color="#F5F5F0" />
      <Ticker
        text="Now in early access · Founder priced · 50 spots · Apply now"
        position="top"
        color="#F5F5F0"
      />

      {/* Right edge accent slab */}
      <div
        className="absolute"
        style={{ right: 0, top: 200, bottom: 200, width: 8, background: ACCENT }}
      />

      <GhostNumber n="07" top={120} left={-40} size={720} color="#F5F5F0" opacity={0.08} />

      <div className="absolute flex items-center justify-between" style={{ top: 64, left: 56, right: 56 }}>
        <BrandLockup inverse />
        <Slug k="Section" v="Get Access" color="#F5F5F0" />
      </div>

      <div className="absolute" style={{ top: 220, left: 70, right: 70 }}>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 12, letterSpacing: "0.3em", color: ACCENT }}
        >
          {s.eyebrow}
        </span>

        <h2
          className="font-display font-black uppercase"
          style={{
            fontSize: 168,
            lineHeight: 0.84,
            letterSpacing: "-0.03em",
            color: "#F5F5F0",
            marginTop: 26,
          }}
        >
          {s.headlineTop}
          <br />
          {s.headlineMid}
          <br />
          <span style={{ color: ACCENT }}>{s.headlineAccent}</span>
          <br />
          <span
            style={{ color: "transparent", WebkitTextStroke: "2px #F5F5F0" }}
          >
            {s.headlineBot}
          </span>
        </h2>
      </div>

      {/* CTA + handle row */}
      <div
        className="absolute flex items-end justify-between"
        style={{ left: 70, right: 70, bottom: 110 }}
      >
        <div>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.3em", color: "#9a9a90" }}
          >
            50 spots · Founder priced
          </span>
          <div
            className="inline-flex items-center gap-3 font-mono uppercase"
            style={{
              background: ACCENT,
              color: "#0A0A0A",
              padding: "20px 30px",
              fontSize: 14,
              letterSpacing: "0.16em",
              fontWeight: 600,
              marginTop: 14,
            }}
          >
            Request Access
            <ArrowUpRight size={18} strokeWidth={1.8} />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#9a9a90",
              marginBottom: 6,
            }}
          >
            fundory.io
          </span>
          <span
            className="font-display font-black uppercase"
            style={{
              color: "#F5F5F0",
              fontSize: 38,
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            @fundory
          </span>
        </div>
      </div>

      <Ticker
        text="Save · Share · Apply · Save · Share · Apply · 07 / 07"
        position="bottom"
        color="#F5F5F0"
        bg="#1a1a18"
        thick
      />
    </SlideFrame>
  );
}

/* ════════════════════════════════════════════════════════════
   CAROUSEL — preview wrapper
   ════════════════════════════════════════════════════════════ */
export type SlideId =
  | "solo"
  | "cover"
  | "reality"
  | "stats"
  | "aggregate"
  | "validate"
  | "compose"
  | "cta";

const DEFAULT_PLAN: SlideId[] = [
  "cover",
  "reality",
  "stats",
  "aggregate",
  "validate",
  "compose",
  "cta",
];

export function FundoryCarousel({
  scale = 0.5,
  daily = DEFAULT_DAILY,
  slidePlan = DEFAULT_PLAN,
}: {
  scale?: number;
  daily?: DailyContent;
  slidePlan?: SlideId[];
}) {
  const total = slidePlan.length;
  // Only Slide1 + Slide7 read from daily; the rest are brand-pillar constants.
  const renderSlide = (id: SlideId): React.ReactNode => {
    switch (id) {
      case "solo":
        return <Slide1 daily={daily} solo />;
      case "cover":
        return <Slide1 daily={daily} totalSlides={total} />;
      case "reality":
        return <Slide2 />;
      case "stats":
        return <Slide3 />;
      case "aggregate":
        return <Slide4 />;
      case "validate":
        return <Slide5 />;
      case "compose":
        return <Slide6 />;
      case "cta":
        return <Slide7 daily={daily} />;
    }
  };
  return (
    <div className="flex flex-col items-center gap-10 bg-neutral-200 py-12">
      {slidePlan.map((id, i) => (
        <div key={`${id}-${i}`} className="flex flex-col items-center gap-3">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.3em", color: "#666" }}
          >
            Slide {String(i + 1).padStart(2, "0")} · {id} — 1080 × 1080
          </span>
          <div
            style={{
              width: W * scale,
              height: W * scale,
              boxShadow: "0 18px 48px -22px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {renderSlide(id)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
