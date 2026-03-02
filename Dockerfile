### Dependency stage: install locked production + dev deps once for caching
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

### Build stage: copy source and emit the static bundle
FROM node:20-alpine AS build
WORKDIR /app

COPY . .
# Re-use the Linux node_modules from the deps stage to avoid host artifacts
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

### Runtime stage: serve the static dist directory
FROM node:20-alpine AS runtime
WORKDIR /app

# Use the lightweight "serve" HTTP server for SPA hosting with history fallback
RUN npm install -g serve@14.2.0

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
