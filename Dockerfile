FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S -u 10014 -G appgroup appuser

WORKDIR /app

COPY --chown=appuser:appgroup --from=build /app/dist ./dist
COPY --chown=appuser:appgroup --from=build /app/server ./server
COPY --chown=appuser:appgroup --from=build /app/server.mjs ./server.mjs
# Mount runtime config at /app/config.js when deploying.

EXPOSE 8080

USER 10014

CMD ["node", "server.mjs", "--port", "8080"]
