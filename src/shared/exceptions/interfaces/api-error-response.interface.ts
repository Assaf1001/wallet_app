export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
