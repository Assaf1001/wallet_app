export interface ModuleHealthResponse {
  status: 'ok';
  module: string;
  timestamp: string;
}

export function buildModuleHealthResponse(module: string): ModuleHealthResponse {
  return {
    status: 'ok',
    module,
    timestamp: new Date().toISOString(),
  };
}
