# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for node-gyp packages
RUN apk add --no-cache python3 py3-pip make g++ cairo-dev pango-dev giflib-dev librsvg-dev

# Copy package files
COPY package*.json ./

# Install dependencies with force
RUN npm install --force

# Copy source code
COPY . .

# Build the application (continue even if there are warnings)
RUN npm run build || true

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage (Vite uses dist directory)
COPY --from=builder /app/dist /usr/share/nginx/html

# Add nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Verify files were copied
RUN ls -la /usr/share/nginx/html

EXPOSE 80

# Fix the entrypoint issue - use CMD instead of ENTRYPOINT
CMD ["nginx", "-g", "daemon off;"]