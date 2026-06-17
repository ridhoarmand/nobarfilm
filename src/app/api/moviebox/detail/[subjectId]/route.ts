import { encryptedResponse, getClientToken } from "@/lib/api-utils";
import { movieBoxService } from "@/lib/moviebox";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;

  try {
    const clientToken = getClientToken(request);
    const data = await movieBoxService.getDetail(subjectId, clientToken);
    return encryptedResponse(data);
  } catch (error: any) {
    console.error("[detail] API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.message?.includes('Akses Terbatas') ? 403 : 500 }
    );
  }
}
