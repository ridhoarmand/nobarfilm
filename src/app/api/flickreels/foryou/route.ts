import { encryptedResponse, safeJson } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    
    // Pass page param to upstream
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api"}/flickreels/foryou?page=${page}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: 'no-store'
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const data = await safeJson(res);
    return encryptedResponse(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
