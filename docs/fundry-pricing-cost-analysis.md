# Fundry Pricing & Cost Analysis

**Prepared for:** Mike (Review)
**Date:** March 20, 2026
**Status:** Draft v1

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AWS Infrastructure Cost Breakdown](#aws-infrastructure-cost-breakdown)
3. [Proposed Pricing Model: Usage-Based / Credit System](#proposed-pricing-model)
4. [Packages & Tiers](#packages--tiers)
5. [Competitive Analysis](#competitive-analysis)
6. [Margin Analysis & Recommendations](#margin-analysis--recommendations)

---

## 1. Executive Summary

Fundry (fundory.ai) is a grant discovery and recommendation platform. This document outlines:
- What it costs us to run the platform on AWS (~**$250-450/month** at current baseline)
- A proposed **credit-based pricing model** that aligns cost with usage
- How we compare to competitors and where we can win on pricing
- A path to healthy margins as we scale

**Key takeaway:** Our infrastructure is lean. With a credit-based model starting at ~$29/month, we can achieve **70-80% gross margins** at modest scale (500+ users).

---

## 2. AWS Infrastructure Cost Breakdown

*Derived from Terraform configuration in `/terraform/`*

### 2.1 Monthly Cost Estimates (Baseline — Low Traffic)

| AWS Service | Configuration | Est. Monthly Cost | Notes |
|---|---|---|---|
| **ECS Fargate** | 2 tasks min (1 vCPU, 2GB each) | **$71 - $178** | $35.55/task/mo. Scales to 5 tasks at peak |
| **Application Load Balancer** | Internet-facing, HTTPS | **$25 - $40** | $16.20 fixed + ~$5.84/LCU |
| **NAT Gateway** | 1 gateway, private subnets | **$32 - $45** | $32.40 fixed + $0.045/GB processed |
| **CloudFront CDN** | PriceClass_100 (NA/EU/Asia) | **$10 - $50** | Cost-optimized price class |
| **Route53 DNS** | 1 hosted zone + queries | **$1 - $2** | $0.50/zone + $0.40/M queries |
| **SES Email** | Transactional email | **$1 - $5** | $0.10 per 1,000 emails |
| **ECR (Container Registry)** | Image storage, lifecycle policy | **$1 - $2** | Auto-expires old images after 7 days |
| **CloudWatch Logs** | 30-day retention + Container Insights | **$5 - $15** | Retention limited to control costs |
| **ACM Certificates** | SSL/TLS for CloudFront + ALB | **$0** | Free with AWS services |
| **Secrets Manager** | Application secrets | **$1 - $2** | $0.40/secret/month |
| **S3 (Terraform state)** | State file storage | **< $1** | Negligible |
| | | | |
| **AWS Subtotal** | | **$147 - $340** | |

### 2.2 External Service Costs

| Service | Purpose | Est. Monthly Cost | Notes |
|---|---|---|---|
| **Supabase** | PostgreSQL database (hosted) | **$25 - $79** | Pro plan likely; scales with usage |
| **n8n** | Workflow automation (webhooks) | **$0 - $20** | Self-hosted or cloud |
| **GitHub Actions** | CI/CD pipelines | **$0 - $10** | Free tier covers most usage |
| **Domain (fundory.ai)** | Domain registration | **~$1** | Amortized monthly |
| | | | |
| **External Subtotal** | | **$26 - $110** | |

### 2.3 Total Monthly Infrastructure Cost

| Scenario | Monthly Cost | Annual Cost |
|---|---|---|
| **Low traffic** (2 tasks, minimal usage) | **~$175 - $250** | **~$2,100 - $3,000** |
| **Medium traffic** (3 tasks avg) | **~$300 - $400** | **~$3,600 - $4,800** |
| **High traffic** (5 tasks, peak) | **~$400 - $550** | **~$4,800 - $6,600** |

### 2.4 Cost Per User Estimate

| Users | Monthly Infra Cost | Cost Per User |
|---|---|---|
| 50 | ~$250 | **$5.00** |
| 200 | ~$300 | **$1.50** |
| 500 | ~$350 | **$0.70** |
| 1,000 | ~$400 | **$0.40** |
| 5,000 | ~$500 | **$0.10** |

Infrastructure costs scale **sublinearly** — the majority of costs are fixed (ALB, NAT, base Fargate tasks). This is ideal for a usage-based model.

### 2.5 Cost Optimization Opportunities

Already in place:
- CloudFront PriceClass_100 (avoids expensive edge locations)
- ECR lifecycle policy (auto-cleanup)
- 30-day log retention
- Fargate auto-scaling (pay only when needed)

Potential savings:
- **NAT Gateway** ($32/mo fixed): Consider NAT instances for lower traffic (~$5/mo) or VPC endpoints
- **Fargate Spot**: Could save ~70% on non-critical tasks
- **Reserved capacity**: Fargate Savings Plans (up to 50% for committed usage)
- **Right-sizing**: Monitor if 1 vCPU / 2GB per task is needed or can be reduced

---

## 3. Proposed Pricing Model: Usage-Based / Credit System

### 3.1 Why Credits?

A credit-based system works well for Fundry because:

1. **Fair pricing** — Organizations that use Fundry more, pay more. Small nonprofits aren't overcharged.
2. **Low barrier to entry** — Users can start small and scale up.
3. **Predictable revenue** — Credits are purchased upfront.
4. **Simple to understand** — "1 credit = 1 action" is intuitive for non-technical users.

### 3.2 How Credits Work

Users purchase credits. Each action on Fundry costs a certain number of credits:

| Action | Credit Cost | Rationale |
|---|---|---|
| Grant search / discovery query | 1 credit | Low compute cost |
| AI grant recommendation (per batch) | 2 credits | AI processing involved |
| Grant detail view (full profile) | 1 credit | Database lookup |
| Grant match report (per org) | 5 credits | AI analysis + report generation |
| Export grant list (CSV/PDF) | 2 credits | Processing + formatting |
| Email alert (per alert set up) | Free | Encourages engagement |
| Dashboard access | Free | Core feature |
| Organization management | Free | Core feature |

### 3.3 Credit Packages

| Package | Credits | Price | Per Credit | Savings |
|---|---|---|---|---|
| **Starter** | 50 credits | **$9** | $0.18 | — |
| **Growth** | 200 credits | **$29** | $0.145 | 19% off |
| **Professional** | 500 credits | **$59** | $0.118 | 34% off |
| **Enterprise** | 2,000 credits | **$179** | $0.09 | 50% off |

### 3.4 Monthly Subscription Alternative (Hybrid)

For users who prefer predictability, offer monthly plans that include a credit allotment:

| Plan | Monthly Price | Credits Included | Overage Rate | Best For |
|---|---|---|---|---|
| **Free** | $0 | 10 credits/mo | N/A (hard cap) | Trying Fundry out |
| **Starter** | $19/mo | 100 credits/mo | $0.15/credit | Small nonprofits |
| **Pro** | $49/mo | 350 credits/mo | $0.12/credit | Active grant seekers |
| **Team** | $99/mo | 1,000 credits/mo | $0.09/credit | Organizations with multiple users |
| **Enterprise** | Custom | Custom | Custom | Large institutions |

---

## 4. Packages & Tiers — Feature Comparison

| Feature | Free | Starter | Pro | Team | Enterprise |
|---|---|---|---|---|---|
| Grant search | Basic | Full | Full | Full | Full |
| AI recommendations | - | 10/mo | Unlimited | Unlimited | Unlimited |
| Organizations | 1 | 1 | 3 | 10 | Unlimited |
| Team members | 1 | 1 | 3 | 10 | Unlimited |
| Grant match reports | - | 2/mo | 10/mo | 50/mo | Unlimited |
| Export (CSV/PDF) | - | Yes | Yes | Yes | Yes |
| Email alerts | 1 alert | 5 alerts | 20 alerts | Unlimited | Unlimited |
| API access | - | - | - | Yes | Yes |
| Priority support | - | - | Email | Email + Chat | Dedicated |
| Custom integrations | - | - | - | - | Yes |

---

## 5. Competitive Analysis

### 5.1 Grant Discovery Platforms (Direct Competitors)

| Platform | Pricing Model | Starting Price | Key Differentiator |
|---|---|---|---|
| **Instrumentl** | Subscription | $179/mo | Smart matching + funder research |
| **GrantWatch** | Subscription | $199/yr | Broad curated listings |
| **OpenGrants** | Freemium | Free (basic) | Marketplace for grant writers |
| **Grants.gov** | Free | $0 | Official federal portal (limited to federal) |
| **Candid (FDO)** | Subscription | $40/mo | Foundation/990 data research |
| **GrantStation** | Subscription | $699/yr | Comprehensive funder database |
| **GrantForward** | Institutional | $3K+/yr | Academic/research focus |

### 5.2 Grant Management Platforms (Adjacent Market)

| Platform | Pricing Model | Starting Price | Focus |
|---|---|---|---|
| **Submittable** | SaaS | ~$500/mo | Grantmaker application intake |
| **Fluxx** | Enterprise SaaS | ~$20K/yr | Full lifecycle management |
| **Foundant** | SaaS | ~$5K/yr | Community foundations |
| **SmartSimple** | Enterprise | ~$20K/yr | Large orgs & government |

### 5.3 AI-Powered Newcomers

| Platform | Pricing Model | Starting Price | Notes |
|---|---|---|---|
| Various AI grant tools | Subscription | $29 - $99/mo | AI matching + writing assistance |
| Torchlight / Granted AI | Freemium | Free - $49/mo | Emerging market |

### 5.4 Fundry's Competitive Position

**Where Fundry wins:**
- **Price**: At $19/mo (Starter), Fundry is significantly cheaper than Instrumentl ($179/mo) and GrantStation ($699/yr)
- **AI-first approach**: Unlike GrantWatch or Grants.gov, Fundry uses AI for intelligent matching
- **Usage-based flexibility**: Most competitors charge flat subscriptions regardless of usage
- **Credit model**: Non-technical users understand "pay for what you use"

**Where Fundry needs to differentiate:**
- Instrumentl has deep funder research (990 data) — Fundry should focus on AI-powered matching quality
- Grants.gov is free — Fundry must clearly add value beyond federal grants
- OpenGrants offers free search — Fundry's free tier must be competitive

**Recommended positioning:** "AI-powered grant discovery at a fraction of the cost"

---

## 6. Margin Analysis & Recommendations

### 6.1 Margin by Tier (at 500 total users)

Assumptions: 500 users, infra cost ~$350/month

| Tier | Users (est.) | Revenue/mo | Infra Cost Share | Gross Margin |
|---|---|---|---|---|
| Free | 250 (50%) | $0 | $35 | -100% |
| Starter ($19) | 150 (30%) | $2,850 | $105 | **96%** |
| Pro ($49) | 75 (15%) | $3,675 | $140 | **96%** |
| Team ($99) | 25 (5%) | $2,475 | $70 | **97%** |
| **Total** | **500** | **$9,000** | **$350** | **96%** |

### 6.2 Break-Even Analysis

| Scenario | Monthly Cost | Break-Even Users (at $19 avg) |
|---|---|---|
| AWS only | $250 | **14 paid users** |
| AWS + external | $350 | **19 paid users** |
| AWS + external + team (2 people) | $10,350 | **545 paid users** |

### 6.3 Recommendations

1. **Launch with the hybrid model** — monthly subscriptions with credit allotments. It provides predictable revenue while the credit system gives pricing flexibility.

2. **Keep the free tier generous enough** to drive adoption (10 credits/month lets users run ~10 grant searches). Free users become paid users.

3. **Price at $19/mo entry** — this significantly undercuts Instrumentl ($179/mo) and positions Fundry as the affordable AI-powered option.

4. **Monitor cost per credit** — as usage grows, track actual compute cost per credit to ensure margins stay healthy. Key metric: cost-per-AI-recommendation.

5. **Consider Fargate Savings Plans** once user base stabilizes — commit to 1-year compute for up to 50% savings.

6. **Replace NAT Gateway** with NAT instances or VPC endpoints to save ~$30/month (meaningful at early stage).

7. **Annual billing discount** — offer 20% off for annual plans to improve cash flow and reduce churn.

---

## Appendix: AWS Architecture Summary

```
User -> CloudFront (CDN) -> ALB -> ECS Fargate (2-5 tasks)
                                      |
                                      +-> Supabase (PostgreSQL)
                                      +-> SES (Email)
                                      +-> n8n (Workflows)

DNS: Route53 (fundory.ai)
SSL: ACM (free)
CI/CD: GitHub Actions -> ECR -> ECS
```

**Region:** us-east-1
**Auto-scaling:** 2-5 tasks based on CPU (target: 70%)
**CDN:** CloudFront PriceClass_100 (NA/EU/Asia)

---

*This document is a draft for Mike's review. Pricing numbers are preliminary and should be validated against actual usage data once available.*
