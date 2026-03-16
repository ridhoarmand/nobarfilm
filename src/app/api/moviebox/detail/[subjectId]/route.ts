import { encryptedResponse } from "@/lib/api-utils";
import { movieBoxService } from "@/lib/moviebox";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;

  try {
    const data = await movieBoxService.getDetail(subjectId);
    return encryptedResponse(data);
  } catch (error) {
    console.error("[detail] API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
