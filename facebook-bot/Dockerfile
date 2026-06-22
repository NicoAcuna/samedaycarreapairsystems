FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
COPY facebook-bot/package.json .
RUN npm install --production
COPY facebook-bot/index.js .
CMD ["node", "index.js"]
