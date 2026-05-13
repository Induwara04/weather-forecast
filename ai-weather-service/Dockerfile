FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S -u 10014 -G appgroup appuser

WORKDIR /app

COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup server.mjs ./
COPY --chown=appuser:appgroup config.js ./

EXPOSE 8080

USER 10014

CMD ["node", "server.mjs"]
