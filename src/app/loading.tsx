// Shown while the page fetches your stations and Divvy's live counts.
export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 pb-16" aria-busy="true" aria-label="Loading your stations">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-28 animate-pulse rounded bg-card" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-card" />
      </div>
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-card" />
      <ul className="space-y-4">
        {[0, 1].map((i) => (
          <li key={i} className="space-y-3 rounded-xl border border-line p-4">
            <div className="h-5 w-24 animate-pulse rounded bg-card" />
            <div className="h-4 w-48 animate-pulse rounded bg-card" />
            <div className="h-10 w-32 animate-pulse rounded bg-card" />
          </li>
        ))}
      </ul>
    </div>
  );
}
