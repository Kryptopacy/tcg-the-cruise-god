FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "--experimental-strip-types", "src/index.ts"]
