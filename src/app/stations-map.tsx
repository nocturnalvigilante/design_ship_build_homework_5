"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Follow, Status } from "./live-stations";
import { HYDE_PARK, type NearbyStation } from "./map-shared";
import type { Result } from "./station-search";

// Leaflet sets innerHTML for string icons and tooltips, so everything here is
// built as DOM nodes with textContent: station names and nicknames are never
// parsed as HTML.
function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function nearbyTooltip(s: NearbyStation) {
  const box = el("div", "");
  box.append(el("div", "font-semibold", s.name));
  const counts =
    s.bikes !== undefined && s.docks !== undefined
      ? `${s.bikes} bikes · ${s.docks} free docks (when the page loaded)`
      : `${s.capacity} docks`;
  box.append(el("div", "", counts));
  box.append(el("div", "text-accent", "Click to follow"));
  return box;
}

function followedPin(f: Follow, status: Status | undefined) {
  const count = status ? (f.need === "bike" ? status.bikes : status.docks) : undefined;
  const closed = status ? (f.need === "bike" ? !status.is_renting : !status.is_returning) : false;
  const tone = count === undefined || closed ? "dc-pin-none" : count === 0 ? "dc-pin-empty" : "dc-pin-good";
  const pin = el("div", `dc-pin ${tone}`);
  pin.append(el("span", "dc-pin-name", f.nickname));
  pin.append(el("span", "dc-pin-count", closed ? "closed" : count === undefined ? "–" : String(count)));
  const unit = f.need === "bike" ? "bike" : "dock";
  pin.append(el("span", "dc-pin-unit", count === 1 ? unit : `${unit}s`));
  return pin;
}

export function StationsMap({
  follows,
  statuses,
  nearby,
  onPick,
}: {
  follows: Follow[];
  statuses: Record<string, Status>;
  nearby: NearbyStation[];
  onPick: (station: Result) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const dots = useRef<L.LayerGroup | null>(null);
  const pins = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  // Create the map once.
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { center: HYDE_PARK, zoom: 15, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    dots.current = L.layerGroup().addTo(m);
    pins.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Small dots for the other stations nearby; a click starts the follow form.
  const followedIds = follows.map((f) => f.station_id).join(",");
  useEffect(() => {
    const layer = dots.current;
    if (!layer) return;
    layer.clearLayers();
    const followed = new Set(followedIds.split(","));
    for (const s of nearby) {
      if (followed.has(s.id)) continue;
      const empty = s.bikes === 0;
      L.circleMarker([s.lat, s.lon], {
        radius: 6,
        weight: 1.5,
        color: "#ffffff",
        fillColor: empty ? "#8a8f98" : "#0b6bcb",
        fillOpacity: 0.9,
      })
        .bindTooltip(nearbyTooltip(s), { direction: "top", offset: [0, -6] })
        .on("click", () => pick.current({ id: s.id, name: s.name, capacity: s.capacity }))
        .addTo(layer);
    }
  }, [nearby, followedIds]);

  // Prominent pins for followed stations, redrawn whenever Realtime changes a count.
  useEffect(() => {
    const layer = pins.current;
    if (!layer) return;
    layer.clearLayers();
    for (const f of follows) {
      if (f.lat === undefined || f.lon === undefined) continue;
      L.marker([f.lat, f.lon], {
        icon: L.divIcon({
          className: "dc-pin-anchor",
          html: followedPin(f, statuses[f.station_id]),
          // No fixed size: the pin sizes itself and CSS centres it over the point.
          iconSize: null as unknown as L.PointExpression,
        }),
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(layer);
    }
  }, [follows, statuses]);

  // Frame the followed stations (or Hyde Park) when the set of follows changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const points = follows
      .filter((f) => f.lat !== undefined && f.lon !== undefined)
      .map((f) => [f.lat!, f.lon!] as [number, number]);
    // Zoom 15 shows a few blocks around, so nearby dots are in view too.
    if (points.length === 0) m.setView(HYDE_PARK, 15);
    else if (points.length === 1) m.setView(points[0], 15);
    else m.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
    // Only when the follows change, not on every count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followedIds]);

  return <div ref={box} className="isolate h-72 w-full overflow-hidden rounded-xl border border-line md:h-[420px]" />;
}
