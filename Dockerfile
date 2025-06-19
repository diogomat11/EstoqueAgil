FROM node:18

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npx tsc -p backend/tsconfig.json

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001

# Expor porta da aplicação
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["node", "dist/server.js"] 