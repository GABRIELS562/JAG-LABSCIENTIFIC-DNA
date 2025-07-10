# Multi-stage build for LabScientific LIMS
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    python3 \
    make \
    g++

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lims -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=lims:nodejs /app/build ./build
COPY --from=builder --chown=lims:nodejs /app/backend ./backend
COPY --from=builder --chown=lims:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=lims:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/backend/database /app/backend/logs /app/temp
RUN chown -R lims:nodejs /app

# Switch to app user
USER lims

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/scripts/health-check.js || exit 1

# Start application
CMD ["npm", "start"]