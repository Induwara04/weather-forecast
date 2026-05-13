FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
# COPY config.js ./config.js

EXPOSE 8080

CMD ["node", "server.mjs", "--port", "8080"]
