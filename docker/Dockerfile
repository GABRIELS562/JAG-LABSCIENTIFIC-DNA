FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy application
COPY server.js ./

# Expose port
EXPOSE 3001

# Run application
CMD ["node", "server.js"]