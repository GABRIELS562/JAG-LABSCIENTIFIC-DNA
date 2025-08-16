# Multi-stage build for production
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite3

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy application files
COPY . .

# Build frontend
RUN npm run build:prod

# Remove source files and dev dependencies
RUN rm -rf src/ public/electron.js public/preload.js
RUN rm -rf scripts/ docs/ tests/ *.md

# Production stage
FROM node:18-alpine

# Install runtime dependencies only
RUN apk add --no-cache sqlite3 curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/ecosystem.config.js ./

# Create necessary directories
RUN mkdir -p backend/logs backend/uploads backend/reports backend/database && \
    chown -R nodejs:nodejs backend/

# Security: Don't run as root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Expose port (not publicly accessible, only to Docker network)
EXPOSE 3001

# Start application
CMD ["node", "backend/server.js"]