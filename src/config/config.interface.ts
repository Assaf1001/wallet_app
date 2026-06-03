export interface Config {
  nodeEnv: string;
  nest: NestConfig;
  database: DatabaseConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
}

export interface NestConfig {
  port: number;
}

export interface DatabaseConfig {
  url: string;
}

export interface CorsConfig {
  enabled: boolean;
}

export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
}
