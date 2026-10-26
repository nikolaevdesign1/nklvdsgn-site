# nklv.dsgn

Public site for the nklv.dsgn design studio.

## Run

```bash
cd website
npm install
npm run dev -- --hostname 0.0.0.0 --port 41731
```

Open http://127.0.0.1:41731

## Routes

- `/` — one screen: a design-agency line and a horizontal strip of placeholder work
- `/projects` — mosaic of the same placeholder frames
- `/about` — studio, services, niko.ai, award slots, FAQ
- `/contacts` — message form over the 3D hands
- `/sign-in` — preview sign-in, stored in this browser

Brief with Friend is a chat. File names stay in the browser. Prices come from `src/data/rates.ts`. A Gemini reply is optional: put `GEMINI_API_KEY` in `.env.local` on the server. The key is not sent to the browser. With an empty key, the chat stays on the prepared brief.

Scroll is slowed with Locomotive Scroll on every page.

Book a call uses `CALENDLY_URL` in `src/lib/links.ts`. It is a placeholder until a real Calendly link is set.

Project titles and images in `src/data/projects.ts` are stand-ins from https://artemiilebedev.com/ and are marked as placeholders.
