import { safeJson, encryptedResponse } from '@/lib/api-utils';
const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.sansekai.my.id/api') + '/netshort';

export async function GET() {
  try {
    const response = await fetch(`${UPSTREAM_API}/theaters`, {
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return encryptedResponse({ success: false, data: [] });
    }

    const json = await safeJson<Record<string, unknown>[]>(response);
    const data = json;

    // Normalize the response to match our format
    // Each group has contentName (section title) and contentInfos (dramas)
    const normalizedGroups = data.map((group) => ({
      groupId: group.groupId,
      groupName: group.contentName,
      contentRemark: group.contentRemark,
      dramas: ((group.contentInfos as Record<string, unknown>[]) || []).map((item) => ({
        shortPlayId: item.shortPlayId as string,
        shortPlayLibraryId: item.shortPlayLibraryId as string,
        title: item.shortPlayName as string,
        cover: (item.shortPlayCover || item.groupShortPlayCover) as string,
        labels: (item.labelArray as string[]) || [],
        heatScore: (item.heatScoreShow as string) || '',
        scriptName: item.scriptName as string,
        totalEpisodes: (item.totalEpisode as number) || 0,
      })),
    }));

    return encryptedResponse({
      success: true,
      data: normalizedGroups,
    });
  } catch (error) {
    console.error('NetShort Theaters Error:', error);
    return encryptedResponse({ success: false, data: [] });
  }
}
