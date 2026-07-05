export function StoreListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="w-[400px] flex-none overflow-y-auto p-6 flex flex-col gap-4 bg-[#f7f4ee]">
      <div className="h-5 w-40 rounded bg-[#e4ded0] animate-pulse" />
      <StoreListSkeletonItems count={count} />
    </div>
  );
}

export function StoreListSkeletonItems({ count = 3 }: { count?: number }) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={index}
      data-testid="store-list-skeleton-card"
      className="bg-white border-[1.5px] border-[#e4ded0] rounded-md shadow-[0_1px_3px_rgba(20,20,20,.06),0_1px_2px_rgba(20,20,20,.04)] p-4 flex flex-col gap-3"
    >
      <div className="flex gap-3">
        <div className="w-20 h-20 flex-none rounded-md bg-[#e4ded0] animate-pulse" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-[#e4ded0] animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-[#ece6d8] animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-[#ece6d8] animate-pulse" />
        </div>
        <div className="w-10 h-6 rounded-full bg-[#e4ded0] animate-pulse" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-[#ece6d8] animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-[#ece6d8] animate-pulse" />
      </div>
      <div className="h-3 w-full rounded bg-[#ece6d8] animate-pulse" />
      <div className="h-3 w-5/6 rounded bg-[#ece6d8] animate-pulse" />
      <div className="flex justify-between pt-1">
        <div className="h-4 w-16 rounded bg-[#ece6d8] animate-pulse" />
        <div className="h-9 w-28 rounded-md bg-[#e4ded0] animate-pulse" />
      </div>
    </div>
  ));
}
