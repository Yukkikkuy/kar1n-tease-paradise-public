# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate does not need a live DB; placeholder URL is enough
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/text_adventure"
ENV SITE_ROLE=all
ENV NEXT_PUBLIC_SITE_ROLE=all
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN node scripts/build-prod.mjs

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SITE_ROLE=all
ENV NEXT_PUBLIC_SITE_ROLE=all
ENV UPLOAD_DIR=/data/uploads
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/uploads

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/tsconfig.json ./

# Railway Volume should mount at /data (UPLOAD_DIR=/data/uploads)
VOLUME ["/data"]

EXPOSE 3000
# Run as root so Railway Volume mounts remain writable for uploads
CMD ["node", "scripts/start-prod.mjs"]
