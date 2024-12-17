// src/modules/monitoring/monitoring.service.ts
import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram,
    @InjectMetric('http_requests_total')
    private readonly requestsTotal: Counter,
    @InjectMetric('active_users_total')
    private readonly activeUsers: Counter,
    @InjectMetric('application_errors_total')
    private readonly errors: Counter,
  ) {}

  // Méthode pour enregistrer la durée d'une requête HTTP
  recordRequestDuration(route: string, method: string, statusCode: number, duration: number): void {
    this.requestDuration.labels(route, method, statusCode.toString()).observe(duration);
  }

  // Méthode pour incrémenter le nombre de requêtes
  incrementRequestCount(route: string, method: string, statusCode: number): void {
    this.requestsTotal.labels(route, method, statusCode.toString()).inc();
  }

  // Méthode pour enregistrer une nouvelle connexion utilisateur
  recordUserLogin(type: 'oauth' | 'email'): void {
    this.activeUsers.labels(type).inc();
  }

  // Méthode pour enregistrer une erreur
  recordError(type: string, code: string): void {
    this.errors.labels(type, code).inc();
  }
}
