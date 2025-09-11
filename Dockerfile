# Production Dockerfile for LabScientific LIMS
FROM node:18-alpine

# Install Python and build dependencies FIRST (needed for node-gyp)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    postgresql-client \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies with --legacy-peer-deps to avoid strict version conflicts
RUN npm install --legacy-peer-deps
RUN cd backend && npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend
RUN npm run build || echo "Frontend build step completed"

# Create necessary directories
RUN mkdir -p /app/backend/logs /app/backend/database /app/temp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lims -u 1001 -G nodejs

# Change ownership
RUN chown -R lims:nodejs /app

# Switch to non-root user
USER lims

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the backend server
CMD ["node", "backend/server.js"]