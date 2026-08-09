export interface ApiError {
  status: number;
  message: string;
  body?: unknown;
}
