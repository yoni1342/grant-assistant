"use client";

import { useState } from "react";
import {
  BILLING_CYCLES,
  getCyclePrice,
  type BillingCycleId,
  type PlanId,
} from "@/lib/stripe/config";

type LandingPlan = {
  planId: PlanId;
  name: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

const LANDING_PLANS: LandingPlan[] = [
  {
    planId: "free",
    name: "Starter",
    features: [
      "1 grant/day",
      "AI writing & drafts",
      "Core discovery",
      "Pipeline tracking",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    planId: "professional",
    name: "Professional",
    features: [
      "Unlimited grants",
      "AI writing & drafts",
      "RFP parsing",
      "Content library",
      "Pipeline tracking",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    planId: "agency",
    name: "Agency",
    features: [
      "Unlimited grants per org",
      "Multi-org management",
      "Org switching",
      "Cross-org analytics",
      "Single billing for all orgs",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const CYCLE_ORDER: BillingCycleId[] = ["monthly", "quarterly", "annual"];

const CYCLE_LABELS: Record<BillingCycleId, string> = {
  monthly: "Monthly",
  quarterly: "3 months",
  annual: "Annual",
};

export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycleId>("monthly");

  return (
    <section id="pricing" className="bg-white border-b-2 border-[#0A0A0A]">
      <div className="px-6 md:px-12 lg:px-16 py-24 md:py-40">
        <div className="mb-12">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase block mb-4">
            Business Model
          </span>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#0A0A0A] leading-[0.85] uppercase">
            Built to penetrate.<br />Designed to scale.
          </h2>
        </div>

        {/* Billing cycle toggle */}
        <div className="mb-14 flex flex-col items-start gap-3">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#888] uppercase">
            Billing cycle
          </span>
          <div className="inline-flex border-2 border-[#0A0A0A]">
            {CYCLE_ORDER.map((id) => {
              const c = BILLING_CYCLES[id];
              const active = cycle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCycle(id)}
                  className={`relative inline-flex items-center gap-2 px-5 py-3 font-mono text-xs tracking-[0.12em] uppercase transition-colors ${
                    active
                      ? "bg-[#0A0A0A] text-[#F5F5F0]"
                      : "bg-[#F5F5F0] text-[#0A0A0A] hover:bg-[#0A0A0A]/5"
                  }`}
                >
                  {CYCLE_LABELS[id]}
                  {c.discountPct > 0 && (
                    <span
                      className={`text-[10px] font-mono tracking-[0.08em] px-1.5 py-0.5 ${
                        active
                          ? "bg-[#F5F5F0] text-[#0A0A0A]"
                          : "bg-[#0A0A0A] text-[#F5F5F0]"
                      }`}
                    >
                      −{c.discountPct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[10px] tracking-[0.18em] text-[#888] uppercase">
            7-day free trial on every paid plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {LANDING_PLANS.map((plan, i) => {
            const isFree = plan.planId === "free";
            const cyclePrice = isFree ? null : getCyclePrice(plan.planId, cycle);
            return (
              <div
                key={plan.name}
                className={`flex flex-col ${
                  plan.highlighted
                    ? "bg-[#0A0A0A] text-[#F5F5F0] border-2 border-[#0A0A0A] relative z-10 md:-my-4 md:py-4"
                    : "border-2 border-[#0A0A0A]"
                } ${i > 0 && !plan.highlighted ? "md:border-l-0" : ""}`}
              >
                {/* Plan header */}
                <div className="px-8 pt-10 pb-6">
                  <span
                    className={`font-mono text-[10px] tracking-[0.3em] uppercase block mb-6 ${
                      plan.highlighted ? "text-[#888]" : "text-[#888]"
                    }`}
                  >
                    {plan.name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-display text-5xl md:text-6xl font-black tracking-tight ${
                        plan.highlighted ? "text-[#F5F5F0]" : "text-[#0A0A0A]"
                      }`}
                    >
                      {isFree ? "Free" : `$${cyclePrice!.perMonth}`}
                    </span>
                    {!isFree && (
                      <span
                        className={`text-lg ${
                          plan.highlighted ? "text-[#888]" : "text-[#888]"
                        }`}
                      >
                        /mo
                      </span>
                    )}
                  </div>
                  {!isFree && cyclePrice && (
                    <div className="mt-3 min-h-[34px]">
                      {cyclePrice.months === 1 ? (
                        <p
                          className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                            plan.highlighted ? "text-[#888]" : "text-[#888]"
                          }`}
                        >
                          Billed monthly
                        </p>
                      ) : (
                        <>
                          <p
                            className={`font-mono text-[10px] tracking-[0.18em] uppercase ${
                              plan.highlighted ? "text-[#888]" : "text-[#888]"
                            }`}
                          >
                            ${cyclePrice.total.toFixed(0)} billed every{" "}
                            {cyclePrice.months} months
                          </p>
                          {cyclePrice.discountPct > 0 && (
                            <p
                              className={`font-mono text-[10px] tracking-[0.18em] uppercase mt-1 ${
                                plan.highlighted
                                  ? "text-emerald-400"
                                  : "text-emerald-700"
                              }`}
                            >
                              Save {cyclePrice.discountPct}%
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {isFree && (
                    <div className="mt-3 min-h-[34px]">
                      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#888]">
                        Forever free
                      </p>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div
                  className={`flex-1 px-8 py-6 border-t ${
                    plan.highlighted
                      ? "border-[#888]/20"
                      : "border-[#0A0A0A]"
                  }`}
                >
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={`shrink-0 mt-0.5 ${
                            plan.highlighted
                              ? "stroke-[#F5F5F0]"
                              : "stroke-[#0A0A0A]"
                          }`}
                          strokeWidth="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span
                          className={`text-sm ${
                            plan.highlighted
                              ? "text-[#F5F5F0]/80"
                              : "text-[#888]"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-8 pb-10 pt-4">
                  <a
                    href="/register"
                    className={`block text-center font-mono text-sm tracking-[0.12em] uppercase px-6 py-4 border-2 transition-all duration-300 ease-in-out ${
                      plan.highlighted
                        ? "bg-[#F5F5F0] text-[#0A0A0A] border-[#F5F5F0] hover:bg-transparent hover:text-[#F5F5F0]"
                        : "bg-[#0A0A0A] text-[#F5F5F0] border-[#0A0A0A] hover:bg-[#F5F5F0] hover:text-[#0A0A0A]"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
