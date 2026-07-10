import axios, { AxiosError } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string; details?: unknown } }>) => {
    const message = error.response?.data?.error?.message ?? error.message ?? "Something went wrong";
    const status = error.response?.status ?? 0;
    const details = error.response?.data?.error?.details;
    return Promise.reject(new ApiError(message, status, details));
  },
);
