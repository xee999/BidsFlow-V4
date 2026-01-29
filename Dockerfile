# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built assets and server logic
COPY --from=build /app/dist ./dist
COPY server.js .
COPY models/*.js ./models/
COPY middleware/*.js ./middleware/

EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

CMD ["node", "server.js"]
