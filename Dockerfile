FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Garante permissão de execução para o binário tsc
RUN chmod +x ./node_modules/.bin/tsc

RUN npx tsc

CMD ["node", "dist/server.js"] 