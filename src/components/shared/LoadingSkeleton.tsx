export function MovieCardSkeleton() {  return (
    <div className="aspect-[2/3] bg-zinc-900 rounded-md animate-pulse">
      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900"></div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="h-[80vh] bg-zinc-900 animate-pulse">
      <div className="h-full bg-gradient-to-r from-zinc-800 to-zinc-900"></div>
    </div>
  );
}

export function ContentRowSkeleton() {
  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8">
      {/* Title Skeleton */}
      <div className="h-8 w-48 bg-zinc-800 rounded mb-4 animate-pulse"></div>

      {/* Cards Row */}
      <div className="flex gap-3 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-none w-40 md:w-48 lg:w-56">
            <MovieCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-black">
      <HeroSkeleton />
      <div className="space-y-8 pb-12">
        <ContentRowSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
      </div>
    </div>
  );
}
