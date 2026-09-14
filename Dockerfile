# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-bookworm-slim
ARG PNPM_VERSION=10.15.1

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm build

FROM deps AS migrator
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/local.db
COPY . .
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data \
  && chown nextjs:nodejs /app/data
USER nextjs
VOLUME ["/app/data"]
CMD ["./node_modules/.bin/drizzle-kit", "migrate"]

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/local.db
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data \
  && chown nextjs:nodejs /app/data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "server.js"]
