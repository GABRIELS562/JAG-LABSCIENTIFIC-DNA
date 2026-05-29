FROM node:18-alpine

# Update Alpine packages to patch security vulnerabilities
RUN apk upgrade --no-cache

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with force to handle any peer dep issues
RUN npm install --production --force

# Copy application files
COPY . .

# Expose the backend port
EXPOSE 3001

# Set environment to production by default
ENV NODE_ENV=production

# Run the server
CMD ["node", "server.js"]