# 1. Base image with shared dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 2. Install dependencies only when needed
FROM base AS deps
# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

# 3. Install production dependencies only (for smaller image)
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# 4. Rebuild the source code only when needed
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Skip env validation for static build
ENV SKIP_ENV_VALIDATION=1

# Declare build arguments
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG NEXT_PUBLIC_SOCKET_URL

# Set as environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN npm run build
RUN npm run build:socket

# Remove node_modules from standalone to avoid layer duplication with prod-deps
RUN rm -rf .next/standalone/node_modules

# 5. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy standalone build from builder (WITHOUT node_modules)
# This copies package.json, server.js, and the .next folder structure
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy socket server build artifacts
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy production dependencies (Primary source of truth for deps)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules



# Copy package.json (already in standalone, but ensuring correctness)
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
EXPOSE 4000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Default command for Next.js app
CMD ["node", "server.js"]
