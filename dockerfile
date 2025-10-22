# Usar una imagen oficial de Node.js (elige la versión que uses, LTS es bueno)
FROM node:18-slim

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar archivos de dependencias e instalar (para aprovechar caché)
COPY package*.json ./
RUN npm install --only=production 

# Copiar el resto del código de tu app (incluyendo server.js y questions.json)
COPY . .

# Exponer el puerto en el que corre tu servidor Express
EXPOSE 3000

# Comando para iniciar tu servidor
CMD [ "node", "server.js" ]