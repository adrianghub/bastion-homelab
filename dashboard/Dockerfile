# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /build
COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci -w client
COPY client/ ./client/
RUN npm run build -w client

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /build
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci -w server
COPY server/ ./server/
RUN npm run build -w server

# Stage 3: Runtime — production deps only
FROM node:22-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci -w server --omit=dev
COPY --from=server-build /build/server/dist ./dist
COPY --from=client-build /build/client/dist ./public
EXPOSE 3000
CMD ["node", "dist/index.js"]
