FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY src ./src

RUN npm run build && npm prune --omit=dev

EXPOSE 4000
CMD ["npm", "start"]
