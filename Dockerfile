### Build stage: compile the Vite app
FROM node:20-alpine AS build
WORKDIR /app

# Install production and dev dependencies exactly as locked
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the static bundle
COPY . .
RUN npm run build

### Runtime stage: serve the static dist directory
FROM node:20-alpine AS runtime
WORKDIR /app

# Use the lightweight "serve" HTTP server for SPA hosting with history fallback
RUN npm install -g serve

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
