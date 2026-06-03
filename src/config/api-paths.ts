export const API_GLOBAL_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'docs';

export function swaggerUiUrl(): string {
  return `/${API_GLOBAL_PREFIX}/${SWAGGER_PATH}`;
}
