"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Mail,
  Info,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/*  Static directory data — sourced from the April 2026 audit         */
/* ------------------------------------------------------------------ */

interface DirectorySource {
  name: string;
  url: string;
  description: string;
}

interface IntegratedSource extends DirectorySource {
  whoItsFor: string;
  whatItFunds: string;
}

interface ExcludedSource extends DirectorySource {
  reason: string;
}

const integratedSources: IntegratedSource[] = [
  {
    name: "Grants.gov",
    url: "https://www.grants.gov",
    whoItsFor: "U.S. nonprofits, state/local governments, educational institutions",
    whatItFunds: "All federal grant programs across 26 agencies",
    description: "The central federal grants clearinghouse — every discretionary grant the U.S. government publishes.",
  },
  {
    name: "Grantivia",
    url: "https://www.grantivia.com",
    whoItsFor: "U.S. nonprofits across all sectors",
    whatItFunds: "Foundation and corporate grants aggregated from multiple sources",
    description: "Curated grant listings from private foundations and corporate funders.",
  },
  {
    name: "California Grants Portal",
    url: "https://www.grants.ca.gov",
    whoItsFor: "California-based nonprofits and public agencies",
    whatItFunds: "State-funded grant programs across all California agencies",
    description: "California's official state grant portal with competitive and formula-based funding.",
  },
  {
    name: "PA DCED",
    url: "https://dced.pa.gov/programs-funding/",
    whoItsFor: "Pennsylvania nonprofits, businesses, and municipalities",
    whatItFunds: "Community development, economic development, housing, infrastructure",
    description: "Pennsylvania Department of Community & Economic Development funding programs.",
  },
  {
    name: "Gates Grand Challenges",
    url: "https://gcgh.grandchallenges.org",
    whoItsFor: "Global health and development organizations, researchers",
    whatItFunds: "Innovation grants for global health, education, and development challenges",
    description: "Open innovation challenges from the Bill & Melinda Gates Foundation.",
  },
  {
    name: "Amazon Community Impact",
    url: "https://www.aboutamazon.com/impact/community",
    whoItsFor: "Nonprofits in Amazon HQ and operations communities",
    whatItFunds: "Housing, education, food security, disaster relief",
    description: "Amazon's community-facing grant programs with open application windows.",
  },
  {
    name: "NJ State Council on the Arts (NJSCA)",
    url: "https://www.nj.gov/state/njsca/index.html",
    whoItsFor: "Arts & cultural organizations in New Jersey",
    whatItFunds: "Annual state arts grants across multiple programs",
    description: "New Jersey's official state arts council funding programs.",
  },
  {
    name: "NJ Small Cities CDBG",
    url: "https://www.nj.gov/dca/divisions/dhcr/offices/cdbg.html",
    whoItsFor: "Local governments (non-entitlement counties & municipalities under 50k pop.)",
    whatItFunds: "Housing rehab, public facilities, community revitalization, economic development",
    description: "Community Development Block Grant program for smaller NJ municipalities. Nonprofits can partner with eligible municipalities.",
  },
  {
    name: "Community Foundation of NJ (CFNJ)",
    url: "https://cfnj.org",
    whoItsFor: "NJ-based nonprofits, especially in Morris/Essex/Sussex counties",
    whatItFunds: "Education, social services, human rights, environment, health, arts",
    description: "Regional community foundation serving Northern New Jersey nonprofits.",
  },
  {
    name: "Heinz Endowments",
    url: "https://www.heinz.org",
    whoItsFor: "Nonprofits serving the Pittsburgh region",
    whatItFunds: "Arts & culture, education, environment, community wellbeing",
    description: "Major regional funder focused on Southwestern Pennsylvania communities.",
  },
  {
    name: "United Way of Northern NJ",
    url: "https://unitedwaynnj.org",
    whoItsFor: "Nonprofits serving ALICE households in Northern NJ",
    whatItFunds: "ALICE Recovery Fund — essential services, financial stability, crisis assistance",
    description: "Focused on households that are Asset Limited, Income Constrained, Employed (ALICE).",
  },
  {
    name: "Rare Impact Fund",
    url: "https://rfrsh.typeform.com/rareimpactfund",
    whoItsFor: "Youth mental health nonprofits, community-based programs",
    whatItFunds: "Nonclinical youth mental-health workforce and community solutions",
    description: "Current LOI cycle for youth mental health initiatives.",
  },
];

const rollingLOISources: DirectorySource[] = [
  {
    name: "Ford Foundation",
    url: "https://www.fordfoundation.org/work/our-grants/",
    description: "One of the largest private foundations. Focuses on inequality in all its forms — economic, political, and social.",
  },
  {
    name: "W.K. Kellogg Foundation",
    url: "https://www.wkkf.org/grantseekers/",
    description: "Focused on children, families, and communities. Strong emphasis on racial equity and community engagement.",
  },
  {
    name: "Robert Wood Johnson Foundation",
    url: "https://www.rwjf.org/en/grants/funding-opportunities.html",
    description: "The nation's largest philanthropy dedicated to health. Funds health equity, healthy communities, and transformative research.",
  },
  {
    name: "Annie E. Casey Foundation",
    url: "https://www.aecf.org/work",
    description: "Focused on child welfare and juvenile justice. Works to build better futures for disadvantaged children and families.",
  },
  {
    name: "David & Lucile Packard Foundation",
    url: "https://www.packard.org/grants-and-investments/for-grantseekers/",
    description: "Supports conservation, science, reproductive health, and children's programs globally.",
  },
  {
    name: "Conrad N. Hilton Foundation",
    url: "https://www.hiltonfoundation.org/grants",
    description: "Focuses on homelessness, foster youth, substance use prevention, and global water access.",
  },
  {
    name: "Oak Foundation",
    url: "https://oakfnd.org/grants/",
    description: "International funder addressing social and environmental issues including housing, child abuse prevention, and human rights.",
  },
  {
    name: "Harry & Jeanette Weinberg Foundation",
    url: "https://hjweinbergfoundation.org/grants/",
    description: "Focused on older adults, workforce development, disabilities, and basic human needs in the U.S. and Israel.",
  },
  {
    name: "Jim Casey Youth Opportunities Initiative",
    url: "https://www.aecf.org/work/jim-casey-youth-opportunities-initiative",
    description: "An initiative of the Annie E. Casey Foundation focused on youth transitioning out of foster care.",
  },
  {
    name: "Prudential Foundation",
    url: "https://www.prudential.com/links/about/corporate-social-responsibility",
    description: "Corporate foundation focused on economic mobility and financial empowerment in Newark, NJ and beyond.",
  },
  {
    name: "Rockefeller Foundation",
    url: "https://www.rockefellerfoundation.org/grants/",
    description: "Global foundation working on food, health, energy, and economic mobility with a focus on equity.",
  },
  {
    name: "Bloomberg Philanthropies",
    url: "https://www.bloomberg.org/",
    description: "Focuses on arts, education, environment, government innovation, and public health at city and global scale.",
  },
];

const excludedSources: ExcludedSource[] = [
  {
    name: "Bill & Melinda Gates Foundation",
    url: "https://www.gatesfoundation.org",
    reason: "Staff-identified and invitation-driven",
    description: "Most grants are initiated internally by program officers, not through open applications.",
  },
  {
    name: "MacArthur Foundation",
    url: "https://www.macfound.org",
    reason: "Primarily staff-initiated",
    description: "Program teams identify and approach grantees directly rather than accepting open proposals.",
  },
  {
    name: "Open Society Foundations",
    url: "https://www.opensocietyfoundations.org",
    reason: "Invitation-only for most programs",
    description: "The majority of funding programs require a prior invitation to apply.",
  },
  {
    name: "Kresge Foundation",
    url: "https://kresge.org",
    reason: "Invite-only for most programs",
    description: "Most program areas use an invitation-based application process.",
  },
  {
    name: "MacKenzie Scott / Yield Giving",
    url: "https://yieldgiving.com",
    reason: "One-time open call events, not a recurring pipeline",
    description: "Conducts occasional open calls but does not maintain a standing application process.",
  },
  {
    name: "Casey Family Programs",
    url: "https://www.casey.org",
    reason: "Systems-change, staff-directed",
    description: "Operates as an operating foundation — works directly with systems rather than issuing grants.",
  },
  {
    name: "Draper Richards Kaplan (DRK)",
    url: "https://www.drkfoundation.org",
    reason: "Venture philanthropy, application waves",
    description: "Venture philanthropy model with selective cohort-based applications, not open RFPs.",
  },
  {
    name: "Apple Community Education Initiative",
    url: "https://www.apple.com/education/connectED/",
    reason: "Relationship-based, mostly in-kind",
    description: "Provides technology and training through direct partnerships, not grant funding.",
  },
  {
    name: "Ticket to Work / SSA",
    url: "https://choosework.ssa.gov",
    reason: "Contract model, not grants",
    description: "Uses a contract/voucher model through the Social Security Administration, not a grant mechanism.",
  },
  {
    name: "JPMorgan Chase Foundation",
    url: "https://www.jpmorganchase.com/impact",
    reason: "Corporate giving, initiative-gated",
    description: "Funding is structured around internal corporate initiatives, not open applications.",
  },
  {
    name: "Bank of America Charitable Foundation",
    url: "https://about.bankofamerica.com/en/making-an-impact/charitable-foundation-funding",
    reason: "Corporate giving, regional invitation",
    description: "Uses a regional invitation model through local market leaders.",
  },
  {
    name: "Wells Fargo Foundation",
    url: "https://www.wellsfargo.com/about/corporate-responsibility/community-giving/",
    reason: "Corporate giving, mostly closed",
    description: "Most programs are closed to unsolicited applications or operate through local branches.",
  },
  {
    name: "Walmart Foundation",
    url: "https://walmart.org",
    reason: "Corporate giving, initiative-specific",
    description: "Funds through specific initiatives (workforce, local community) rather than open RFPs.",
  },
  {
    name: "Amazon Community Giving",
    url: "https://www.aboutamazon.com/impact/community",
    reason: "Local/invitation-based",
    description: "Distinct from Amazon Community Impact — this program is locally driven and invitation-based.",
  },
  {
    name: "AARP Foundation",
    url: "https://www.aarp.org/aarp-foundation/",
    reason: "Narrative-only grants page, invitation-based",
    description: "Grants page contains only narrative content with no structured application opportunities.",
  },
  {
    name: "Google.org",
    url: "https://www.google.org",
    reason: "No server-rendered content available",
    description: "Website is a client-rendered JavaScript application with no accessible grant listing data.",
  },
  {
    name: "Dodge Foundation",
    url: "https://grantmaking.geraldine-r-dodge-foundation.org",
    reason: "Only lists past grantees, no open RFPs",
    description: "Website shows previously funded organizations, not current funding opportunities.",
  },
  {
    name: "Lumina Foundation",
    url: "https://www.luminafoundation.org",
    reason: "Only lists past grantees, no open RFPs",
    description: "Publishes a grantee database of past awards, not active funding opportunities.",
  },
  {
    name: "Walton Family Foundation",
    url: "https://www.waltonfamilyfoundation.org",
    reason: "Only lists past grantees, no open RFPs",
    description: "Shares awarded grants history but does not post open applications.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function SourceCard({
  name,
  url,
  description,
  badge,
  badgeVariant,
  extra,
}: {
  name: string;
  url: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  extra?: React.ReactNode;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-medium text-sm truncate">{name}</h3>
              {badge && (
                <Badge variant={badgeVariant || "secondary"} className="text-[10px] shrink-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              {description}
            </p>
            {extra}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={`Visit ${name}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectoryPage() {
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();

  const filteredIntegrated = integratedSources.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.whatItFunds.toLowerCase().includes(q) ||
      s.whoItsFor.toLowerCase().includes(q)
  );

  const filteredLOI = rollingLOISources.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
  );

  const filteredExcluded = excludedSources.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.reason.toLowerCase().includes(q)
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Grant Source Directory
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          We audit dozens of grant sources to determine which ones can be
          automatically monitored for new opportunities. Below is a complete
          list of every source we evaluated — including those we integrate,
          those better suited to direct outreach, and those we reviewed but
          excluded with an explanation why.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sources by name, focus area, or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="integrated">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="integrated" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Integrated
            <Badge variant="secondary" className="ml-1 font-mono text-[10px] px-1.5 py-0">
              {filteredIntegrated.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="loi" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            LOI Funders
            <Badge variant="secondary" className="ml-1 font-mono text-[10px] px-1.5 py-0">
              {filteredLOI.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="excluded" className="gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Not Included
            <Badge variant="secondary" className="ml-1 font-mono text-[10px] px-1.5 py-0">
              {filteredExcluded.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — Integrated */}
        <TabsContent value="integrated">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 mb-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                These sources are actively monitored. New grants are
                automatically pulled into your pipeline and screened for
                eligibility.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredIntegrated.map((s) => (
              <SourceCard
                key={s.name}
                name={s.name}
                url={s.url}
                description={s.description}
                badge="Auto-monitored"
                badgeVariant="default"
                extra={
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground/70">For:</strong>{" "}
                      {s.whoItsFor}
                    </span>
                    <span>
                      <strong className="text-foreground/70">Funds:</strong>{" "}
                      {s.whatItFunds}
                    </span>
                  </div>
                }
              />
            ))}
          </div>
          {filteredIntegrated.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No integrated sources match your search.
            </p>
          )}
        </TabsContent>

        {/* Tab 2 — Rolling LOI Funders */}
        <TabsContent value="loi">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-4">
            <div className="flex gap-2">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                These are well-funded foundations that accept unsolicited Letters
                of Inquiry, but they don&apos;t post specific grants with deadlines or
                dollar amounts. The best way to pursue them is to submit an LOI
                describing your work directly through their website.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredLOI.map((s) => (
              <SourceCard
                key={s.name}
                name={s.name}
                url={s.url}
                description={s.description}
                badge="Send LOI"
                badgeVariant="outline"
              />
            ))}
          </div>
          {filteredLOI.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No LOI funders match your search.
            </p>
          )}
        </TabsContent>

        {/* Tab 3 — Excluded */}
        <TabsContent value="excluded">
          <div className="rounded-lg border border-muted bg-muted/30 p-3 mb-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                These sources were thoroughly reviewed during our audit. They
                were excluded because they use invitation-only models,
                staff-directed grantmaking, contract mechanisms, or don&apos;t
                publish open applications. We include them here with direct
                links so you can explore them if relevant to your work.

              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredExcluded.map((s) => (
              <SourceCard
                key={s.name}
                name={s.name}
                url={s.url}
                description={s.description}
                badge={s.reason}
                badgeVariant="secondary"
              />
            ))}
          </div>
          {filteredExcluded.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No excluded sources match your search.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer note */}
      <div className="border-t mt-8 pt-6 pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          This directory is based on our{" "}
          <span className="font-medium text-foreground/70">
            April 2026 source audit
          </span>
          . We continuously evaluate new grant sources and update this list as
          funders change their giving models. If you know of a source we should
          review, reach out to our team.
        </p>
      </div>
    </div>
  );
}
