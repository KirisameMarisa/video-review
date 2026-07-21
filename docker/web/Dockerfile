FROM node:24-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y postgresql-client \
 && rm -rf /var/lib/apt/lists/*

COPY docker/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["sh", "/entrypoint.sh"]