FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Runs on every container start (not at build time, since the db isn't
# reachable yet then): applies pending migrations, then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
