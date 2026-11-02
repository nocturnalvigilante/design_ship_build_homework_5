# User journey: leaving the lab at 5:40

Written from the rider's side, as the instructor asked: *"what is this experience like from a user's perspective?"* Screenshots are from the live app.

**Maya** is a second-year who works in a lab on Ellis Ave. Most evenings she takes a Divvy from the station outside, Ellis & 55th, to her apartment. Twice last week she walked out and it was empty, and she didn't know where the nearest bikes were.

## Once: set it up (about a minute)

1. **She lands on DockCheck Live.** The first thing she reads is her own problem: *"You walk to your Divvy station and there are no bikes."* The example card shows exactly that moment: *Empty: don't walk over*, and *Try instead: University Ave & 57th St, about 4 min walk.* She gets it in one look. ([`landing.png`](evidence/landing.png))
2. **She taps "Follow your station"** and signs up with Google.
3. **The page opens on a map of Hyde Park** with the stations around her as dots, and one line telling her what to do: click a dot, or type a street. ([`map-empty.png`](evidence/map-empty.png))
4. **She clicks the dot outside her lab**, leaves the name blank (it uses "Ellis Ave & 55th St"), chooses *A bike*, and taps Follow. The card appears with its live count.

## Every evening: the 10-second check

5. **At 5:38, packing up, she opens DockCheck.** The top line says *Live · checked 8 s ago*, so she knows the number is current.
6. **Three possible answers, all in one line:**
   - **"Go: there's a bike waiting"** (green). She leaves.
   - **"Go now: only a few left"** (amber). She leaves now, not in ten minutes. The card also shows where to go if it's gone.
   - **"Empty: don't walk over"** (red). Instead of walking out to check, she reads *Try instead: University Ave & 57th St, 12 bikes, about 5 min walk*, taps *Directions there*, and goes straight there. ([`verdict-card.png`](evidence/verdict-card.png), a real empty station on 1 Nov 2026)
7. **If she keeps the page open while she finishes up,** the number changes on its own as bikes come and go, with a brief highlight, so she can wait for one to come back.

## When something's wrong, it says so

8. **If DockCheck stops getting updates** (the worker is slow or stopped), an amber box says *Updates have paused* and the counts dim, so she doesn't trust an old number.
9. **If Divvy itself is unreachable,** a red box says *Can't reach Divvy right now. Counts below are from 3:42 AM.* ([`live-states.md`](evidence/live-states.md))

## Why she keeps using it (and not a spreadsheet)

A list of her stations would tell her where they are. DockCheck tells her **what's there now, what to do about it, and how fresh that is**, in the time it takes to put on her coat.
