export type HealthStatus = 'ok' | 'error';
export type DatabaseStatus = 'checking' | 'connected' | 'disconnected';

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  env: string;
  uptime: string;
  database: DatabaseStatus;
} 