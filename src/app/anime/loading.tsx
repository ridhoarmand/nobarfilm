export default function Loading() {  return (
    <div className="bg-black min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="h-8 w-48 bg-zinc-800 rounded-md animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
