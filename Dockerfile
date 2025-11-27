FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install glibc compatibility for canvas
RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub \
  && wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r1/glibc-2.35-r1.apk \
  && apk add --no-cache --force-overwrite glibc-2.35-r1.apk \
  && rm glibc-2.35-r1.apk

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

# Install dependencies
RUN npm install && npm cache clean --force;

# Copy the rest of the app
COPY . .

# Build TypeScript files
RUN npm run build

# Set environment variables (if needed)
ENV NODE_ENV=production

# Expose port if necessary
# EXPOSE 3000

# Command to run the bot
CMD ["npm", "start"]
