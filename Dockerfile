# syntax=docker/dockerfile:1
FROM node:24.14.0-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm build

FROM node:24.14.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 STUDIO_DB_PATH=/data/studio601.sqlite
RUN mkdir -p /data/uploads /app/.next/cache && chown -R node:node /data /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/db/migrations ./db/migrations
COPY --from=builder --chown=node:node /app/lib/local-db.mjs /app/lib/local-auth.mjs ./lib/
COPY --from=builder --chown=node:node /app/scripts/admin-account.mjs /app/scripts/start-production.mjs /app/scripts/transfer-content.mjs ./scripts/
USER node
EXPOSE 3000
CMD ["node", "scripts/start-production.mjs"]
