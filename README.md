
# NestJS Template API

Un template NestJS préconfiguré avec :
- PostgreSQL avec Prisma comme ORM
- Redis pour le cache et les sessions
- Authentication JWT complète
- Tests unitaires et e2e préconfigurés
- Docker et Docker Compose (dev & prod)
- CI/CD avec GitHub Actions
- Documentation API avec Swagger
- Logging avancé avec Winston
- Sécurité renforcée (Helmet, Rate Limiting, CORS, etc.)

## 🚀 Démarrage Rapide

### 1. Utilisez ce template

Cliquez sur "Use this template" sur GitHub ou clonez le manuellement :
git clone [URL_DU_REPO] mon-projet
cd mon-projet
2. Installation
bash

Copy
# Installation des dépendances
yarn install

# Génération du client Prisma
yarn prisma generate
3. Configuration
bash

# Copier le fichier d'environnement
cp .env.example .env
⚙️ Configuration
Variables d'Environnement
Modifiez le fichier .env avec vos valeurs :

env

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db_name"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=db_name

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET=votre_secret_tres_long_et_complexe
JWT_EXPIRATION=1d

# API
PORT=3000
NODE_ENV=development

# Throttling
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# CORS
CORS_ORIGIN=http://localhost:3000
GitHub Actions
Pour la CI/CD, configurez ces secrets dans les paramètres de votre dépôt GitHub :

DEPLOY_HOST : Hostname du serveur de production
DEPLOY_USER : Utilisateur SSH pour le déploiement
DEPLOY_KEY : Clé SSH privée pour l'authentification
🐳 Docker
Développement

# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
Production


# Démarrer en production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Mettre à jour l'application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
📝 Scripts Disponibles


# Développement
yarn start:dev        # Démarrage en mode watch
yarn start:debug     # Démarrage avec debugger
yarn prisma:studio   # Interface Prisma Studio

# Base de données
yarn prisma:generate # Génère le client Prisma
yarn prisma:migrate  # Lance les migrations

# Production
yarn build           # Build l'application
yarn start:prod      # Démarrage en production

# Tests
yarn test           # Tests unitaires
yarn test:e2e       # Tests end-to-end
yarn test:cov       # Couverture des tests

# Lint et Format
yarn lint           # Vérifie le style du code
yarn format         # Formate le code
📚 Endpoints et Documentation
Une fois l'application lancée, vous pouvez accéder à :

API : http://localhost:3000/api
Documentation Swagger : http://localhost:3000/docs
Interface Adminer : http://localhost:8080
Interface MailHog : http://localhost:8025
Logs : ./logs/
📁 Structure du Projet

.
├── src/
│   ├── common/         # Décorateurs, filtres, guards, etc.
│   ├── config/         # Configuration de l'application
│   ├── modules/        # Modules de l'application
│   │   ├── auth/       # Authentication
│   │   └── users/      # Gestion des utilisateurs
│   └── utils/          # Utilitaires
├── prisma/            # Schéma et migrations Prisma
├── test/             # Tests e2e
└── logs/             # Logs de l'application
⚡ Points à Modifier Lors de l'Utilisation du Template
1. Configuration
 Modifier les variables dans .env
 Mettre à jour les informations dans package.json
 Configurer les secrets GitHub pour la CI/CD
 Adapter les limites de rate limiting dans throttler.module.ts
2. Documentation
 Mettre à jour ce README.md
 Modifier la configuration Swagger dans main.ts
 Adapter les descriptions d'API dans les contrôleurs
3. Base de Données
 Modifier le schéma Prisma selon vos besoins
 Créer les migrations initiales
 Adapter les variables PostgreSQL dans docker-compose
4. Sécurité
 Changer le secret JWT
 Configurer CORS selon vos besoins
 Adapter les règles de validation
 Modifier les stratégies d'authentification si nécessaire
5. CI/CD
 Adapter les workflows GitHub Actions selon votre infrastructure
 Configurer les secrets de déploiement
 Modifier les étapes de build si nécessaire
🔒 Sécurité
Ce template inclut :

Protection CORS
Rate Limiting
Helmet pour les en-têtes HTTP
Validation des données (class-validator)
JWT pour l'authentification
Hachage des mots de passe (bcrypt)
Logs sécurisés
Protection contre les injections SQL (via Prisma)
🐛 Debugging
Logs disponibles dans le dossier logs/ :

application-%DATE%.log - Tous les logs
error-%DATE%.log - Erreurs uniquement
🤝 Contribution
Fork le projet
Créez votre branche (git checkout -b feature/AmazingFeature)
Commit vos changements (git commit -m 'Add some AmazingFeature')
Push sur la branche (git push origin feature/AmazingFeature)
Ouvrez une Pull Request
📄 License
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

✨ Remerciements
NestJS - Le framework utilisé
Prisma - ORM
Docker - Conteneurisation
GitHub Actions - CI/CD
