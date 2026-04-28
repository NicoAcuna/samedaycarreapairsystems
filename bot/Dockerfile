FROM node:22-alpine
RUN apk add --no-cache git python3 make g++
WORKDIR /app
COPY bot/package.json .
RUN npm install --production
COPY bot/index.js .
COPY bot/claude.js .
CMD ["node", "index.js"]
