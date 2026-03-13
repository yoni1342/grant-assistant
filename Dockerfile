FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG N8N_WEBHOOK_URL
ARG N8N_WEBHOOK_SECRET

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
ENV N8N_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET

RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime secrets (passed from build args)
ARG SUPABASE_SERVICE_ROLE_KEY
ARG N8N_WEBHOOK_URL
ARG N8N_WEBHOOK_SECRET
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV N8N_WEBHOOK_URL=$N8N_WEBHOOK_URL
ENV N8N_WEBHOOK_SECRET=$N8N_WEBHOOK_SECRET

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
