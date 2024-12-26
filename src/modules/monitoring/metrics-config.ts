// src/modules/monitoring/metrics-config.ts
import { makeHistogramProvider, makeCounterProvider } from '@willsoto/nestjs-prometheus';

// Définition des métriques HTTP pour suivre la durée des requêtes
export const httpRequestDurationMetric = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['route', 'method', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 3, 5], // Les intervalles en secondes pour grouper les mesures
});

// Compteur pour le nombre total de requêtes
export const httpRequestsTotal = makeCounterProvider({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['route', 'method', 'status_code'],
});

// Métriques pour suivre les utilisateurs actifs
export const activeUsersGauge = makeCounterProvider({
  name: 'active_users_total',
  help: 'Number of active users',
  labelNames: ['type'], // 'oauth', 'email', etc.
});

// Métriques pour les erreurs
export const errorCounter = makeCounterProvider({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'code'], // Type d'erreur et code
});
