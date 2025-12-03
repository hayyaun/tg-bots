FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install necessary packages (including fonts)
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
  font-noto-emoji

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

# Copy Prisma schema first (needed for generating client)
# Note: We don't copy prisma.config.ts here because it requires DATABASE_URL
# which isn't available at build time. Prisma Client generation only needs the schema.
COPY prisma ./prisma

# Generate Prisma Client (must be done before TypeScript build)
# Use --schema flag to explicitly specify the schema file
RUN npx prisma generate --schema=prisma/schema.prisma

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
