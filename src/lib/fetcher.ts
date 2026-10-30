export class ApiError extends Error {  status: number;
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
    const message = errorData?.error || errorData?.message || `HTTP Error ${response.status}`;
    throw new ApiError(message, response.status, errorData);
  }

  const json = await response.json();

  // Return the unwrapped data if it's our API format, otherwise return the raw JSON
  if (json.success !== undefined && json.data !== undefined) {
    return json.data;
  }

  return json;
}
