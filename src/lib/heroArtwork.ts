export function selectHeroArtwork(backdropUrl: string, posterUrl: string, failedUrls: readonly string[]): string {
  return [backdropUrl, posterUrl].find((url) => url && !failedUrls.includes(url) && !url.startsWith('https://h5.aoneroom.com/favicon.ico')) || '';
}

export function isLandscapeArtwork(width: number, height: number): boolean {
  return height > 0 && width / height >= 1.3;
}
