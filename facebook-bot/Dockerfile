FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .
CMD ["node", "index.js"]
