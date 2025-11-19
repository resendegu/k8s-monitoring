# Frontend Dockerfile - Monorepo aware build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (workspaces configuration)
COPY package.json package-lock.json* ./

# Copy frontend package.json
COPY packages/frontend/package.json ./packages/frontend/

# Install ALL dependencies (for build)
RUN npm ci

# Copy frontend source
COPY packages/frontend ./packages/frontend

# Build arguments for runtime configuration
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build --workspace=packages/frontend

# Production stage - Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
