FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN pnpm prisma generate

FROM base AS final

EXPOSE 3333

# Run migrations and start the server
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm tsx src/index.ts"]
