# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/dashboard/package*.json ./packages/dashboard/

# Install dependencies
RUN npm ci --workspace=packages/dashboard

# Copy source files
COPY packages/dashboard ./packages/dashboard

# Build React app
WORKDIR /app/packages/dashboard
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/packages/dashboard/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
