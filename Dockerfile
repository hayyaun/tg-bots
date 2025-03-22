FROM node:20-alpine

# Set working directory
WORKDIR /app

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

# Expose port if necessary (optional, adjust accordingly)
# EXPOSE 3000

# Command to run the bot
CMD ["npm", "start"]
