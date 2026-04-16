FROM node:22-alpine
WORKDIR /app
COPY bot/package.json .
RUN npm install --production
COPY bot/index.js .
CMD ["node", "index.js"]
