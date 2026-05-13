FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY config.js ./

EXPOSE 8080

CMD ["node", "server.mjs"]
