# Build stage
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN pnpm build

# Production stage
FROM node:20 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output (includes server.js and all necessary files)
COPY --from=builder /app/.next/standalone ./

# Copy static files
COPY --from=builder /app/.next/static ./.next/static

# Copy public files
COPY --from=builder /app/public ./public

# Copy prisma files for migrations
COPY --from=builder /app/prisma ./prisma

# Copy the generated Prisma client from builder  
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000

CMD ["node", "server.js"]
