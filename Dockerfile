# Dockerfile
FROM node:18-alpine As development

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat

# Créer le répertoire de l'app
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY yarn.lock ./
COPY prisma ./prisma/

# Installer les dépendances
RUN yarn install

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN yarn prisma generate

# Stage de production
FROM node:18-alpine As production

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --production

COPY . .

RUN yarn build

FROM node:18-alpine As final

WORKDIR /usr/src/app

COPY --from=production /usr/src/app/dist ./dist
COPY --from=production /usr/src/app/node_modules ./node_modules
COPY --from=production /usr/src/app/package.json ./

CMD ["node", "dist/main"]