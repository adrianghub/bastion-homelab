# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime — production deps only
FROM node:22-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /build/server/dist ./dist
COPY --from=client-build /build/client/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
