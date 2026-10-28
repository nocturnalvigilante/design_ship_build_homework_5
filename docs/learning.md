# What I learned building DockCheck Live (Assignment 5)

The brief ends each step with an "Ask your agent" prompt. These are the answers, about this system, in the order of the steps.

## 1. The Divvy response: what each field means, how often it changes, and which fields the app needs

*"Explain this response: what each field means, how often it changes, and which fields my app needs."*

Called twice, 3 minutes apart, just after midnight on 28 Oct 2026 (`docs/evidence/source-called-twice.txt`, raw responses beside it):

- The feed refreshed between calls (`last_updated` 00:01:08 → 00:04:09). `ttl` is 60 s, so it can change every minute.
- **30 of 2,076 stations** had different counts after 3 minutes, even at midnight. Daytime will be busier.
- But **1,116 stations** had a new `last_reported`. A station checks in every few minutes **even when nothing changed**.

| Field | Meaning | How often it changes | Needed? |
|---|---|---|---|
| `last_updated` (feed) | when Divvy built this snapshot | every ~60 s | **yes**: freshness |
| `ttl` (feed) | seconds until the next snapshot | fixed, 60 | yes: how often to poll |
| `station_id` | stable id, joins to `station_information` | never | **yes**: the key |
| `num_bikes_available` | rentable bikes, classic + e-bikes | often | **yes** |
| `num_ebikes_available` | the e-bikes among them | often | **yes** |
| `num_docks_available` | free docks to return a bike | often | **yes** |
| `num_bikes_disabled` / `num_docks_disabled` | broken bikes or docks | rarely | no |
| `is_renting` / `is_returning` | station switched off for renting / returning | rarely | **yes**: "closed" state |
| `last_reported` | when this station last checked in | every few minutes, **even with no change** | stored, but **not** used to decide "changed" |

**What this means for the worker:** "changed" has to mean *the counts or renting/returning changed*, not `last_reported`. Comparing `last_reported` would rewrite ~1,100 rows every run, and every rewrite is a Realtime message to every open page. Comparing the counts rewrites ~30.
