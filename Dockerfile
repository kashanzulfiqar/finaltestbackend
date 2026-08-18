FROM node:20-slim

WORKDIR /usr/src/app

# Copy package manifests first to utilize Docker layer caching
COPY package*.json ./

# Disable audit and update notifications to speed up installation
RUN npm config set registry https://registry.npmjs.org/ && \
    npm ci --omit=dev --no-audit --no-fund

# Copy the rest of your application code
COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
