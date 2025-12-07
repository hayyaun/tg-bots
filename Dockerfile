FROM node:22.12-alpine

# Set working directory
WORKDIR /app

# Install necessary packages (including fonts and postgresql client)
RUN apk add --no-cache \
  python3 \
  py3-pip \
  make \
  g++ \
  cairo \
  cairo-dev \
  pango \
  pango-dev \
  musl-dev \
  jpeg-dev \
  giflib-dev \
  libpng-dev \
  fontconfig \
  freetype \
  ttf-dejavu \
  ttf-freefont \
  ttf-liberation \
  ttf-droid \
  ttf-opensans \
  font-noto-emoji \
  postgresql-client

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

# Copy migration script
COPY scripts/apply-migration.js ./scripts/apply-migration.js

# Command to apply migrations (preserving data) and start the bot
CMD ["sh", "-c", "node scripts/apply-migration.js && npm start"]
