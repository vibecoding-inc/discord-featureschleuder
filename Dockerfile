FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies required for Puppeteer/Chromium AND dumb-init
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    dumb-init \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Remove dev dependencies and source files to reduce image size
RUN npm prune --production
RUN rm -rf src tsconfig.json

# Create data directory
RUN mkdir -p /app/data

# --- SECURITY & USER SETUP ---

# Create group and user WITH a home directory
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs -m -d /home/nodejs nodejs

# Set HOME environment variable (Crucial for Chromium Crashpad)
ENV HOME=/home/nodejs

# Ensure permissions are correct
RUN chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /home/nodejs

# Switch to non-root user
USER nodejs

# Use dumb-init as the entrypoint handler
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the bot
CMD ["./entrypoint.sh"]
