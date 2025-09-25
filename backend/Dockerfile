FROM node:18-alpine

WORKDIR /app

# Copiar solo los archivos de dependencias primero (para mejor cache)
COPY package*.json ./
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
# o el nombre de tu archivo principal
CMD ["node", "server.js"]  