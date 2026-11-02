import Link from "next/link";

// What a signed-out visitor sees at /: the problem, what DockCheck Live does
// about it, and one thing to do. No data is read here; the example is static.
export function Landing() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-muted">DockCheck Live · for Divvy riders</p>

      {/* The problem, in the rider's words. */}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Know before you walk to the bike station.
      </h1>
      <p className="mt-3 text-lg text-muted">
        You walk to your Divvy station and there are no bikes. Or you ride to class and there&apos;s nowhere to dock.
        DockCheck Live tells you, as you leave, whether your station has what you need, and if it doesn&apos;t, where to go
        instead.
      </p>

      {/* What it looks like when it matters: the station is empty. */}
      <figure aria-label="Example station card" className="mt-8 rounded-xl border border-line bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
          Live · checked 12 s ago
        </p>
        <p className="font-semibold">Lab</p>
        <p className="mb-2 text-sm text-muted">Ellis Ave &amp; 58th St</p>
        <p className="mb-2 text-sm font-semibold text-empty">Empty: don&apos;t walk over</p>
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums text-empty">0</span>
          <span className="text-muted">bikes left of 15</span>
        </p>
        <div className="mt-3 rounded-lg border border-line bg-background p-3 text-sm">
          <p className="font-medium">Try instead: University Ave &amp; 57th St</p>
          <p className="text-muted">6 bikes · about 4 min walk · Directions there</p>
        </div>
        <figcaption className="mt-3 text-xs text-muted">Example. After you sign in, these are your own stations.</figcaption>
      </figure>

      {/* Why not just a list of stations: */}
      <ul className="mt-8 space-y-2 text-sm">
        <li>
          <span className="font-medium">Live, not a list.</span>{" "}
          <span className="text-muted">Counts change on screen as bikes leave and arrive. No refreshing.</span>
        </li>
        <li>
          <span className="font-medium">Tells you what to do.</span>{" "}
          <span className="text-muted">Go, go now, or go somewhere else, with the walk time.</span>
        </li>
        <li>
          <span className="font-medium">Honest about freshness.</span>{" "}
          <span className="text-muted">It says when it last checked, and warns you if updates stop.</span>
        </li>
      </ul>

      <p className="mt-8 text-sm text-muted">
        Takes a minute: follow the station you leave from, then open DockCheck just before you head out.
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/sign-up"
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent px-4 font-medium text-background"
        >
          Follow your station
        </Link>
        <Link href="/sign-in" className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}
