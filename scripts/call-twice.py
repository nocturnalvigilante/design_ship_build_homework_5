# Calls Divvy's station_status twice, a few minutes apart, and reports what changed.
# Usage: python3 -I scripts/call-twice.py <seconds-between> <out-dir>
import json, sys, time, urllib.request

URL = "https://gbfs.lyft.com/gbfs/1.1/chi/en/station_status.json"
INFO = "https://gbfs.lyft.com/gbfs/1.1/chi/en/station_information.json"
FIELDS = ["num_bikes_available", "num_ebikes_available", "num_bikes_disabled",
          "num_docks_available", "num_docks_disabled", "is_renting", "is_returning", "last_reported"]

def get(url):
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)

wait, out = int(sys.argv[1]), sys.argv[2]
names = {s["station_id"]: s["name"] for s in get(INFO)["data"]["stations"]}
a = get(URL); json.dump(a, open(f"{out}/status-call-1.json", "w"))
time.sleep(wait)
b = get(URL); json.dump(b, open(f"{out}/status-call-2.json", "w"))

sa = {s["station_id"]: s for s in a["data"]["stations"]}
sb = {s["station_id"]: s for s in b["data"]["stations"]}
fmt = lambda t: time.strftime("%H:%M:%S %Z", time.localtime(t))
print(f"Call 1: feed last_updated {fmt(a['last_updated'])}, ttl {a['ttl']} s, {len(sa)} stations")
print(f"Call 2: feed last_updated {fmt(b['last_updated'])}, ttl {b['ttl']} s, {len(sb)} stations")
print(f"Time between feed updates: {b['last_updated'] - a['last_updated']} s\n")

changed, by_field = [], {f: 0 for f in FIELDS}
for sid in sa.keys() & sb.keys():
    diffs = [f for f in FIELDS if sa[sid].get(f) != sb[sid].get(f)]
    for f in diffs: by_field[f] += 1
    if any(f != "last_reported" for f in diffs): changed.append(sid)
print(f"Stations whose counts or status changed: {len(changed)} of {len(sa)}")
print(f"Stations whose last_reported moved (station checked in, maybe same counts): {by_field['last_reported']}")
print("Changes per field:", {f: n for f, n in by_field.items() if f != 'last_reported'})
print(f"Only in call 1: {len(sa.keys() - sb.keys())}, only in call 2: {len(sb.keys() - sa.keys())}\n")
print("Examples (bikes / e-bikes / docks):")
for sid in sorted(changed, key=lambda s: names.get(s, s))[:12]:
    x, y = sa[sid], sb[sid]
    print(f"  {names.get(sid, sid)[:40]:40} {x['num_bikes_available']}/{x['num_ebikes_available']}/{x['num_docks_available']}"
          f"  ->  {y['num_bikes_available']}/{y['num_ebikes_available']}/{y['num_docks_available']}")
campus = [s for s in changed if any(k in names.get(s, "") for k in ["Ellis", "University Ave", "Woodlawn", "Kimbark", "Blackstone", "Harper", "Drexel", "Kenwood"])]
print(f"\nCampus stations that changed: {len(campus)}")
for sid in campus:
    x, y = sa[sid], sb[sid]
    print(f"  {names[sid]:40} {x['num_bikes_available']}/{x['num_ebikes_available']}/{x['num_docks_available']}  ->  {y['num_bikes_available']}/{y['num_ebikes_available']}/{y['num_docks_available']}")
