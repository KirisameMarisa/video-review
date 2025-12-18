FROM node:22-slim

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npx prisma generate

COPY docker/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]
