# Grader feedback on DockCheck (Assignment 4), applied to DockCheck Live

A grader recorded a 3 min 54 s screen video (with voice) of themselves using **A4's** site
(dockcheck-phi.vercel.app) on a desktop browser. The video is kept out of git (22 MB); this is its
transcript, made locally with faster-whisper (`small.en`), unedited.

DockCheck Live grew out of A4 and shares its first screen, search and card layout, so the points
below apply here too. The last section says what this repo changed in response.

## Transcript

> [0:00] Hello, I am grading your design build ship project for the first page I get to after the login is this.  
> [0:10] So first thing I would say is like it would be really great if you had some kind of landing page or something before login  
> [0:18] so that I could actually see what I was getting into before having a login.  
> [0:26] So that's one thing I know I don't think that's listed in the instruction so it's like not a huge deal but design wise  
> [0:32] it would be great to see something like that so that I know kind of like oh do I want to actually log into this website  
> [0:39] and then the first thing I get to is this page which was a bit confusing.  
> [0:44] Doc check makes me think I was thinking it was going to be like a document but I guess like it says Doc check  
> [0:50] so I guess it's like a divvy bike but this page is like quite bare bones.  
> [0:57] I think it would be nice if there could be a map or something like or I don't know a little bit more on this page  
> [1:07] because it's not really clear what I'm exactly supposed to do so I guess I'll just type in Ellis.  
> [1:13] Okay I'm going to call it myself.  
> [1:20] Okay so this is I guess just like being able to check if there's like Docs and bikes which this seems pretty useful  
> [1:33] like if you always you know Monday Wednesday Friday or need to leave the bike at 5 40 p.m. after work then that seems pretty good  
> [1:43] but like I guess I wonder what is it supposed to do like it.  
> [1:52] Do I log do I log into this every time at 5 o'clock before I leave the office to see if there's a doc available  
> [2:00] or like what does it look like I think what would be really nice would be to be able to see a map that had like an image  
> [2:08] with all the docs available and the bikes and let's say like okay I'm gonna say 57th and shields there's seven  
> [2:18] okay I need it and like let's say I need a bike okay other bike okay yeah so okay so I've added this here  
> [2:33] when I usually leave open but it says open doc check when you leave and it will learn but I'm a bit confused  
> [2:47] so I would definitely recommend like updating this UI a bit I think you seem to have a good integration with the divi  
> [2:55] bikes to be able to see how many bikes are left but yeah it's not like super clear also since this is a desktop site  
> [3:04] I think I would be able to see these like side by side this format is looking a bit like mobile  
> [3:11] so like let's say I want to do like 56th whatever that is and save and then also like do I really need to type in a name  
> [3:25] it's already called Halstead Street and 56th Street so like shouldn't it be okay if I don't type in a name  
> [3:30] but yeah I think I would expect these to be kind of more side by side instead of having to go down like that  
> [3:37] so yeah this is my recommendation the the color scheme and everything like I find it easy to read  
> [3:43] but a little bit confusing on like what it does and how exactly you know to use it  

## What they said

| # | Point | When |
|---|---|---|
| 1 | No landing page before login: they couldn't tell what the site was before signing in (not required by the brief) | 0:10 |
| 2 | "DockCheck" made them think of documents, not Divvy docks | 0:44 |
| 3 | First page is bare: not clear what to do, so they guessed and typed "Ellis" | 0:50, 1:07 |
| 4 | Wanted a map of stations with bikes and docks (asked twice) | 0:57, 2:00 |
| 5 | Unclear purpose: "do I log into this every time at 5 before I leave the office?" | 1:43 |
| 6 | A4's "open DockCheck when you leave and it will learn" confused them | 2:33 |
| 7 | Naming a station shouldn't be required, it already has a name | 3:11 |
| 8 | On desktop the single column looks like a phone layout; cards should be side by side | 3:04, 3:30 |
| 9 | Liked: the Divvy integration, the usefulness, easy-to-read colours | 1:20, 2:47, 3:37 |

## What DockCheck Live changed

- **1, 2, 5:** signed-out visitors at `/` now see a landing page that says it's for Divvy bikes and docks, shows an example station card, and has Sign in / Sign up buttons.
- **3:** the empty state says what the page does and gives a concrete first step.
- **7:** the nickname is optional; left blank, the station's own name is used.
- **8:** on wider screens, followed stations sit in a 2–3 column grid.
- **4 (map):** not done; it would need a map package, and no new packages are added without asking.
- **6:** doesn't apply; DockCheck Live has no leave-time feature.
