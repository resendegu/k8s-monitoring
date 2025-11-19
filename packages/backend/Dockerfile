# Backend Dockerfile - Monorepo aware build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (workspaces configuration)
COPY package.json package-lock.json* ./

# Copy backend package.json
COPY packages/backend/package.json ./packages/backend/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source
COPY packages/backend ./packages/backend

# Build TypeScript
RUN npm run build --workspace=packages/backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy backend package.json
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only for the workspace
RUN npm ci --omit=dev --workspace=packages/backend

# Copy built files from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/check-status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "packages/backend/dist/index.js"]

