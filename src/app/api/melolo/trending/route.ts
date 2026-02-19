import { encryptedResponse, safeJson } from '@/lib/api-utils';function extractBooks(payload: unknown) {
  const books: unknown[] = [];
  const payloadObj = payload as Record<string, unknown>;
  const data = (payloadObj?.data as Record<string, unknown>) ?? payloadObj;

  if (data?.cell && typeof data.cell === 'object' && 'cell_data' in data.cell && Array.isArray(data.cell.cell_data)) {
    (data.cell.cell_data as Record<string, unknown>[]).forEach((section) => {
      if (Array.isArray(section?.books)) {
        books.push(...(section.books as unknown[]));
      }
    });
  }

  if (Array.isArray(data?.books)) {
    books.push(...(data.books as unknown[]));
  }

  if (Array.isArray(payloadObj?.books)) {
    books.push(...(payloadObj.books as unknown[]));
  }

  return books;
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api';
    const response = await fetch(`${baseUrl}/melolo/trending`, {
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return encryptedResponse({ books: [], algo: 0 }, response.status);
    }
    const json = await safeJson<Record<string, unknown>>(response);
    const books = extractBooks(json);
    return encryptedResponse({ books, algo: json?.algo ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return encryptedResponse({ error: message }, 500);
  }
}
