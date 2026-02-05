import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { NextResponse } from "next/server";

const ALLOWED_SUBJECT_TYPES = new Set([1, 2]);

function isAllowedSubjectType(subjectType?: number) {
  return typeof subjectType === "number" && ALLOWED_SUBJECT_TYPES.has(subjectType);
}

function filterSubjects<T extends { subjectType?: number }>(subjects: T[] | undefined) {
  if (!Array.isArray(subjects)) return subjects;
  return subjects.filter((item) => isAllowedSubjectType(item.subjectType));
}

function filterBannerItems(items: any[] | undefined) {
  if (!Array.isArray(items)) return items;
  return items.filter((item) => isAllowedSubjectType(item.subjectType || item.subject?.subjectType));
}

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/moviebox";

export async function GET() {
  try {
    const response = await fetch(`${UPSTREAM_API}/homepage`, {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: response.status }
      );
    }

    const data = await safeJson<any>(response);

    if (Array.isArray(data?.operatingList)) {
      data.operatingList = data.operatingList.map((section: any) => {
        if (Array.isArray(section?.subjects)) {
          return { ...section, subjects: filterSubjects(section.subjects) };
        }
        if (section?.banner?.items) {
          return { ...section, banner: { ...section.banner, items: filterBannerItems(section.banner.items) } };
        }
        return section;
      });
    }

    if (data?.banner?.items) {
      data.banner.items = filterBannerItems(data.banner.items);
    }

    if (Array.isArray(data?.topPickList)) {
      data.topPickList = filterSubjects(data.topPickList);
    }

    if (Array.isArray(data?.homeList)) {
      data.homeList = data.homeList.map((section: any) => {
        if (Array.isArray(section?.subjects)) {
          return { ...section, subjects: filterSubjects(section.subjects) };
        }
        return section;
      });
    }

    return encryptedResponse(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
