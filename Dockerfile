FROM node:20-slim

# Set working directory
WORKDIR /app

# Install necessary packages (including fonts and build dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  libpng-dev \
  fontconfig \
  fonts-dejavu \
  fonts-freefont-ttf \
  fonts-liberation \
  fonts-droid-fallback \
  fonts-noto-emoji \
  && rm -rf /var/lib/apt/lists/*

# Ensure python3 is set as the default Python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Copy Vazirmatn font into the system fonts directory
COPY assets/fonts/* /usr/share/fonts/

# Update font cache to detect new fonts
RUN fc-cache -fv

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies - force canvas to build from source for Alpine
RUN npm i && npm cache clean --force;

# Copy Prisma schema and config first (needed for generating client)
# Prisma 7 requires the config file, but we can use a dummy DATABASE_URL for generation
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client (must be done before TypeScript build)
# Use a dummy DATABASE_URL since we only need to generate types, not connect to DB
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run generate

# Copy the rest of the app
COPY . .

# Build TypeScript files
RUN npm run build

# Set environment variables (if needed)
ENV NODE_ENV=production

# Expose port if necessary
# EXPOSE 3000

# Command to apply migrations (or sync schema if no migrations exist) and start the bot
CMD ["sh", "-c", "(npx prisma migrate deploy || npx prisma db push) && npm start"]
