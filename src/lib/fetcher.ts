import { decryptData } from '@/lib/crypto';
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Throw error with status to be caught by React Query
    throw new ApiError(errorData?.error || errorData?.message || 'An error occurred', response.status, errorData);
  }

  const json = await response.json();
  if (json.data && typeof json.data === 'string') {
    return decryptData(json.data);
  }
  return json;
}
