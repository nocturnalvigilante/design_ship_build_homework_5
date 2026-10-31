import Link from "next/link";

// What a signed-out visitor sees at /: what the app is, before asking them to sign in.
// No data is read here; the example card is static.
export function Landing() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">DockCheck Live</h1>
      <p className="mt-3 text-lg text-muted">
        Live bikes and free docks at the Divvy stations you use, so you know before you walk over.
      </p>
      <p className="mt-3 text-muted">
        Open it just before you head out: it shows whether there&apos;s a bike (or a free dock) waiting at your station
        right now, and keeps updating while it&apos;s open.
      </p>

      <ol className="mt-8 space-y-2 text-sm">
        <li>
          <span className="font-medium">1. Follow a station.</span>{" "}
          <span className="text-muted">Search a street, like Ellis, and call it &ldquo;Lab&rdquo;.</span>
        </li>
        <li>
          <span className="font-medium">2. Keep the page open.</span>{" "}
          <span className="text-muted">Counts update on their own as Divvy reports them. No refreshing.</span>
        </li>
        <li>
          <span className="font-medium">3. See how fresh it is.</span>{" "}
          <span className="text-muted">The page says when it last checked, and warns you if updates stop.</span>
        </li>
      </ol>

      <figure aria-label="Example station card" className="mt-8 rounded-xl border border-line bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
          Live · checked 12 s ago
        </p>
        <p className="font-semibold">Lab</p>
        <p className="mb-3 text-sm text-muted">Ellis Ave &amp; 58th St</p>
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums text-good">3</span>
          <span className="text-muted">bikes left of 15</span>
        </p>
        <figcaption className="mt-3 text-xs text-muted">Example. Your own stations appear after you sign in.</figcaption>
      </figure>

      <div className="mt-8 flex gap-2">
        <Link
          href="/sign-up"
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent px-4 font-medium text-background"
        >
          Sign up
        </Link>
        <Link href="/sign-in" className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line px-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}
