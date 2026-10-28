"use client";

import { useActionState, useEffect, useState } from "react";
import { followStation, type FollowState } from "./actions";

type Result = { id: string; name: string; capacity: number };
type Search =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "done"; results: Result[] }
  | { state: "down" };

const DEBOUNCE_MS = 300;

export function StationSearch() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [picked, setPicked] = useState<Result | null>(null);
  const [saveState, save, saving] = useActionState<FollowState, FormData>(followStation, {});

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ state: "idle" });
      return;
    }
    setSearch({ state: "loading" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stations?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return setSearch({ state: "down" });
        const body = (await res.json()) as { stations: Result[] };
        setSearch({ state: "done", results: body.stations });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearch({ state: "down" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // After a successful follow, start over.
  useEffect(() => {
    if (saveState.savedAt) {
      setPicked(null);
      setQuery("");
    }
  }, [saveState.savedAt]);

  if (picked) {
    return (
      <form action={save} className="rounded-xl border border-line bg-card p-4">
        <input type="hidden" name="station_id" value={picked.id} />
        <p className="text-sm text-muted">Following</p>
        <p className="mb-4 font-medium">{picked.name}</p>

        <label className="mb-1 block text-sm font-medium" htmlFor="nickname">
          What do you call it?
        </label>
        <input
          id="nickname"
          name="nickname"
          required
          maxLength={40}
          autoFocus
          placeholder="Lab, Home, Gym…"
          className="mb-4 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-base"
        />

        <fieldset className="mb-4">
          <legend className="mb-1 text-sm font-medium">When you get there, you need</legend>
          <div className="flex gap-2">
            {(["bike", "dock"] as const).map((need) => (
              <label
                key={need}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-background px-3 has-[:checked]:border-accent has-[:checked]:text-accent"
              >
                <input type="radio" name="need" value={need} defaultChecked={need === "bike"} className="sr-only" />
                {need === "bike" ? "A bike" : "A free dock"}
              </label>
            ))}
          </div>
        </fieldset>

        {saveState.error && (
          <p role="alert" className="mb-3 text-sm text-empty">
            {saveState.error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 flex-1 rounded-lg bg-accent px-4 font-medium text-background disabled:opacity-60"
          >
            {saving ? "Following…" : "Follow station"}
          </button>
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="min-h-11 rounded-lg border border-line px-4"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor="station-search">
        Find a Divvy station
      </label>
      <input
        id="station-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Street name, like Ellis or 57th"
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-base"
      />

      <div aria-live="polite" className="mt-2">
        {search.state === "loading" && (
          <ul aria-label="Searching" className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-11 animate-pulse rounded-lg bg-card" />
            ))}
          </ul>
        )}
        {search.state === "down" && (
          <p className="rounded-lg bg-card p-3 text-sm text-warn">
            Divvy isn&apos;t responding right now, so search is unavailable. Try again in a minute.
          </p>
        )}
        {search.state === "done" && search.results.length === 0 && (
          <p className="rounded-lg bg-card p-3 text-sm text-muted">
            No station matches &ldquo;{query.trim()}&rdquo;. Try just the street name.
          </p>
        )}
        {search.state === "done" && search.results.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {search.results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setPicked(s)}
                  className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left hover:bg-card"
                >
                  <span>{s.name}</span>
                  <span className="text-sm text-muted">{s.capacity} docks</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
