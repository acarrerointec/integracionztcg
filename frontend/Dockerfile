FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Construir la aplicación
RUN npm run build  
# Asegúrate de que el puerto coincide con el que usa tu aplicación
EXPOSE 8080  

CMD ["npm", "start"]