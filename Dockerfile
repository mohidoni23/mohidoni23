# Use Node LTS
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Ensure runtime dirs exist
RUN mkdir -p /app/uploads /app/data /app/public

# Expose default port
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
