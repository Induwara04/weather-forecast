FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/server.mjs ./server.mjs
# Mount runtime config at /app/config.js when deploying.

EXPOSE 8080

CMD ["node", "server.mjs", "--port", "8080"]
