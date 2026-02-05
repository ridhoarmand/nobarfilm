
import { type NextRequest } from "next/server";
import { encryptedResponse, safeJson } from "@/lib/api-utils";

function extractBooks(payload: any) {
  const books: any[] = [];
  const data = payload?.data ?? payload;

  if (data?.cell?.cell_data && Array.isArray(data.cell.cell_data)) {
    data.cell.cell_data.forEach((section: any) => {
      if (Array.isArray(section?.books)) {
        books.push(...section.books);
      }
    });
  }

  if (Array.isArray(data?.books)) {
    books.push(...data.books);
  }

  if (Array.isArray(payload?.books)) {
    books.push(...payload.books);
  }

  return books;
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
    const response = await fetch(`${baseUrl}/melolo/latest`, {
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return encryptedResponse({ books: [], algo: 0 }, response.status);
    }
    const json = await safeJson<any>(response);
    const books = extractBooks(json);
    return encryptedResponse({ books, algo: json?.algo ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return encryptedResponse({ error: message }, 500);
  }
}
