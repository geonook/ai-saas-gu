# Dockerfile for Zeabur deployment with Tailwind CSS v4 support
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies required by lightningcss (Tailwind CSS v4)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package*.json ./

# Install dependencies with increased memory limit for lightningcss
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm install

# Copy all project files
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Expose port 8080 (Zeabur standard)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
