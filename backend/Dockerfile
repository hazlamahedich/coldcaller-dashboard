# Backend Dockerfile with multi-stage build
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    dumb-init \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create app directory with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coldcaller -u 1001 -G nodejs

WORKDIR /app
RUN chown nodejs:nodejs /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
USER nodejs
RUN npm ci --include=dev
COPY --chown=nodejs:nodejs . .
EXPOSE 3001
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
USER nodejs
RUN npm ci --only=production --no-audit --no-fund
COPY --chown=nodejs:nodejs . .

# Production stage
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3001

USER nodejs

# Copy production dependencies and application
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/src ./src
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Create required directories
RUN mkdir -p uploads logs data/backups .swarm

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Run database migrations and start server
CMD ["dumb-init", "sh", "-c", "npm run db:migrate && node src/server.js"]

# Security labels
LABEL security.non-root=true
LABEL security.no-new-privileges=true