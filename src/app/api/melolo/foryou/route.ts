import { safeJson, encryptedResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/melolo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const offset = searchParams.get('offset') || '0';

    // Melolo uses offset-based pagination
    const response = await fetch(`${UPSTREAM_API}/foryou?offset=${offset}`, {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return encryptedResponse({
        books: [],
        has_more: false,
        next_offset: 0,
      });
    }

    const json = await safeJson<Record<string, unknown>>(response);
    const data = json.data as Record<string, unknown>;

    let books: unknown[] = [];

    // The structure is deeply nested: data.cell.cell_data[].books[]
    if (data?.cell && typeof data.cell === 'object' && 'cell_data' in data.cell && Array.isArray(data.cell.cell_data)) {
      (data.cell.cell_data as Record<string, unknown>[]).forEach((section) => {
        if (section.books && Array.isArray(section.books)) {
          books = [...books, ...section.books];
        }
      });
    }

    // Also check for direct 'books' array in data just in case structure varies
    if (data?.books && Array.isArray(data.books)) {
      books = [...books, ...data.books];
    }

    // Extract pagination info
    // Prefer the top-level has_more/next_offset if available, otherwise check cell
    const hasMore = (data.has_more as boolean | undefined) ?? ((data.cell as Record<string, unknown>)?.has_more as boolean) ?? false;
    const nextOffset = (data.next_offset as number | undefined) ?? ((data.cell as Record<string, unknown>)?.next_offset as number) ?? 0;

    return encryptedResponse({
      books: books,
      has_more: hasMore,
      next_offset: nextOffset,
    });
  } catch (error) {
    console.error('Melolo ForYou Error:', error);
    return encryptedResponse({
      books: [],
      has_more: false,
      next_offset: 0,
    });
  }
}
