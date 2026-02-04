import { encryptedResponse, safeJson } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

// Force dynamic to prevent static generation caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id";
const API_URL = BASE_URL.endsWith("/api") ? BASE_URL : `${BASE_URL}/api`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return encryptedResponse({ status_code: 0, msg: "ID param required" }, 400);
  }

  try {
    const res = await fetch(`${API_URL}/flickreels/detailAndAllEpisode?id=${id}`, {
      cache: 'no-store', // CRITICAL: Video URLs expire, never cache this response
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.flickreels.com/",
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return encryptedResponse({ status_code: 404, msg: "Drama not found" }, 404);
      }
      throw new Error(`Upstream API failed with status: ${res.status}`);
    }

    const data = await safeJson(res);
    return encryptedResponse(data);
  } catch (error) {
    console.error("Error fetching FlickReels detail:", error);
    return encryptedResponse(
      { status_code: 0, msg: "Internal Server Error" },
      500
    );
  }
}
