# 1. Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
RUN npm ci --legacy-peer-deps

# Create a dedicated production dependencies stage
# This ensures modules like socket.io (used in our custom server) are included
# even if Next.js standalone tracing doesn't "see" them.
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
RUN npm ci --omit=dev --legacy-peer-deps


# 2. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build environment variables (Placeholders for build process)
ARG NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="placeholder-key"

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

# Build the application
RUN npm run build

# Build the custom socket server
RUN npx tsc --project tsconfig.server.json


# 3. Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 1. Copy standalone output (The optimized Next.js server and traced deps)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 2. Add complete production dependencies for the custom server
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
# 3. Add the compiled custom server
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

USER nextjs

EXPOSE 3000

ENV PORT=3000

# We run our custom unified server (Next.js + Socket.io)
CMD ["node", "dist/server/index.js"]
