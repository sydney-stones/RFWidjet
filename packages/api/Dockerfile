# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/

# Install dependencies
RUN npm ci --workspace=packages/api

# Copy source files
COPY packages/api ./packages/api
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build TypeScript
WORKDIR /app/packages/api
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
RUN npm ci --workspace=packages/api --omit=dev

# Copy Prisma schema and generated client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy built application
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "packages/api/dist/server.js"]
