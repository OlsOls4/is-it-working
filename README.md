# Is It Working?

[![CI](https://github.com/OlsOls4/is-it-working/actions/workflows/ci.yml/badge.svg)](https://github.com/OlsOls4/is-it-working/actions/workflows/ci.yml)

**A skincare verdict tracker for the moment you ask "is this product actually working?"**

Log the products you start, take a guided selfie once a week, and YouCam Skin AI scores your skin. A deterministic, explainable verdict engine compares each product's target concern before vs after you started — against *your own* week-to-week noise and the product type's realistic time-to-effect — and tells you plainly: **KEEP**, **GIVE IT N MORE WEEKS**, or **DROP**. Then it turns the verdict into the right next purchase: **KEEP** → one-tap reorder; **DROP** → a swap (for complexion products, YouCam Skin Tone Analysis + a CIEDE2000 shade match + Makeup VTO preview on your own face); **GIVE IT N MORE WEEKS** → a YouCam AI Skin Simulation of the improvement you're waiting for.

Built for Perfect Corp's **YouCam API Skin AI & eCommerce VTO Hackathon (2026)**.

- **Live demo:** https://is-it-working.vercel.app (works for everyone with recorded YouCam results; live YouCam calls with an access code)
- **Screenshots:** [`screenshots/`](screenshots/) (desktop 1440 px and mobile 390 px)
- **For retailers:** `/retailers` in the app — the white-label "swap, don't churn" pitch

## Why

People abandon good products too early (retinoids need 8–12 weeks) and keep re-buying ones that never worked, or buy complexion products in the wrong shade and return them. Is It Working? turns a 30-second weekly selfie into evidence: fewer wasted purchases, fewer returns, and more confident repurchases for retailers.

## Features

- **Product log** — name, brand, type (retinoid, niacinamide, azelaic acid, vitamin C, AHA/BHA, benzoyl peroxide, moisturiser, peptide, complexion…), start date, target concern, price, shade (complexion products).
- **Guided weekly check-in** — front camera with a face-framing oval, lighting tips, on-device brightness and size checks, or photo upload. YouCam photo errors (face too small, head tilted up/down/sideways, too dark, image too small…) come back as a *retake* prompt with directions.
- **Skin analysis per week** — 8 SD concerns from YouCam AI Skin Analysis v2.1, raw + UI scores, overall score, skin age, per-concern detection masks. On save, the full-size photo and every mask are copied into **IndexedDB**, because YouCam's result links expire after ~2 h.
- **Verdicts** — KEEP / GIVE IT N MORE WEEKS / DROP with confidence and every reason in plain English; "COLLECTING n/3" until there are 3 check-ins since a product's start (no verdict on zero data). Complexion products are also judged on **shade fit** against the YouCam Skin Tone reading (CIEDE2000 ΔE > 5 = visible mismatch → drop and swap).
- **Your next purchase** — KEEP → one-tap reorder sheet; DROP → shade-matched swap you can try on (complexion) or a different-mechanism suggestion (skincare); WAIT → "finish the bottle" plus **YouCam AI Skin Simulation** of the target concern.
- **Dashboard** — two-column on desktop, phone layout on mobile; hero compare slider with real YouCam masks on week 0 and week 8; concern-coloured trend lines with a legend and product-start markers; a dismissible 60-second tour in demo mode.
- **Photo comparison** — drag-to-compare any two weeks, with that week's own YouCam mask on each side (a mask is only offered when both weeks have one).
- **Try before you buy** — Skin Tone Analysis → nearest of 30 shades by CIEDE2000 → Makeup VTO foundation + concealer → side-by-side with the dropped tint's own shade → in-app basket sheet.
- **For retailers** (`/retailers`) — white-label widget pitch, recurring vs one-off API use, per-active-tracker pricing proposal, illustrative retained-revenue calculator.
- **No accounts** — scores in `localStorage`, photos and masks in IndexedDB. Reset to demo or start your own tracking any time.
- **Accessibility** — WCAG AA text contrast, `prefers-reduced-motion`, keyboard-operable compare slider, `aria-pressed` toggle chips, no hydration mismatch.

## The verdict engine (`lib/verdict.ts`)

Deterministic, no LLM, unit-tested (`npm test`).

| Step | Rule |
|---|---|
| Baseline | mean of up to 2 check-ins on/before the start date (a check-in ≤3 days after start still counts) |
| Now | mean of the last 2 check-ins since starting |
| Noise | residual std-dev of the concern's whole series around a linear trend (floor 1.0 pt) |
| Threshold | 2 × standard error of (now − baseline), floor 2.0 pts |
| < 3 check-ins since start | GIVE IT N MORE WEEKS (not enough data) |
| change ≥ +threshold | KEEP |
| change ≤ −threshold | DROP, unless inside a known purge window (retinoids ≤6 wks, acids ≤3 wks, for acne/texture/redness) → wait |
| flat, before the type's minimum window | GIVE IT (min − weeks on) MORE WEEKS |
| flat, inside window but trending up enough to cross | GIVE IT up to 4 MORE WEEKS |
| flat, past the minimum window | DROP |
| Confidence | from effect size (z) and check-in count; −15 if another product on the same concern started within 3 weeks; −10 if there's no pre-start baseline |

Windows (`lib/concerns.ts`): retinoid 8–12 wks, niacinamide 4–8, azelaic 4–8, vitamin C 6–12, AHA/BHA 3–6, benzoyl peroxide 4–8, moisturiser 2–4, peptide 8–12, complexion 2–4, other 4–8. Scores used are YouCam `raw_score` (1–100, higher = healthier).

## YouCam APIs used

All calls are server-side (Next.js route handlers) using `process.env.YOUCAM_API_KEY` as a Bearer token against `https://yce-api-01.makeupar.com`. The key never reaches the browser.

| Feature | Endpoint | How it's used | Units (per `GET /s2s/v2.0/credit/feature-cost`) |
|---|---|---|---|
| File upload | `POST /s2s/v2.0/file` → `PUT` pre-signed URL | every live task uploads the selfie, then uses `src_file_id` | 0 |
| **AI Skin Analysis** | `POST /s2s/v2.1/task/skin-analysis`, poll `GET …/{task_id}` | weekly check-in: `dst_actions` = acne, redness, age_spot, wrinkle, pore, moisture, texture, radiance; `format: "json"`; `enable_mask_overlay: false` (PNG masks blended client-side) | 12 (SD, 5–8 concerns) |
| **AI Facial Color Tones Analyzer** (Skin Tone) | `POST /s2s/v2.0/task/skin-tone-analysis`, poll | reads `results.color.skin_color` for shade matching (CIEDE2000) and the complexion shade-fit verdict; `face_angle_strictness_level: "medium"` | 20 |
| **AI Makeup VTO** | `POST /s2s/v2.0/task/makeup-vto`, poll | `version "1.0"`, effects `foundation` (matched hex, coverage 60, glow 15) + `concealer` (12% lighter); also renders the dropped tint's own shade for a side-by-side | 1 |
| **AI Skin Simulation** | `POST /s2s/v2.0/task/skin-simulation`, poll | for GIVE IT N MORE WEEKS verdicts: the latest photo with the target concern improved (`texture`/`pores`/`spots`/`redness`/… = 0.5) | 4 (1–4 concerns) |

Code: `lib/youcam.ts` (client), `app/api/task/[feature]/route.ts` (upload + start), `app/api/task/[feature]/[taskId]/route.ts` (poll + normalise), `lib/normalize.ts` (response → app shape).

## Architecture

```
Browser (Next.js App Router, client components, localStorage)
  ├─ /check-in  camera/upload → prepareImage() → POST /api/task/skin-analysis → poll GET /api/task/skin-analysis/:id
  ├─ /, /products/:id, /trends, /compare   ← computeVerdict() (pure TS, runs client-side)
  ├─ /try-on    POST /api/task/skin-tone-analysis → matchShades() (CIEDE2000) → POST /api/task/makeup-vto
  └─ /products/:id (WAIT)  POST /api/task/skin-simulation
Server (Vercel functions)
  └─ /api/task/*  → access-code gate → credit check → per-IP limit → YouCam File API + task API (live)
                   any failure / no code → recorded fixtures (demo)
```

## Demo mode vs live mode

Demo mode is on for the whole deployment when `YOUCAM_API_KEY` is missing **or** `DEMO_MODE=1`. With a key and `DEMO_MODE=0`, live mode is switched on, but a request only reaches the YouCam API when **all** of these hold — otherwise it gets the recorded demo result, so the public URL always works and can't drain units:

1. `LIVE_ACCESS_CODE` is set on the server **and** the browser sends it (open the app once with `?access=<code>`; it's kept in `localStorage` and sent as `x-access-code`). No code configured → everyone gets the demo.
2. The unit balance (`GET /s2s/v1.0/client/credit`, free) covers the call's cost; otherwise → recorded result with *"Live YouCam credits exhausted — showing a recorded result."*
3. The per-IP daily limit isn't hit (`LIVE_DAILY_LIMIT_PER_IP`, default 6; `LIVE_DAILY_LIMIT_GLOBAL`, default 40; in-memory, best-effort per instance).
4. The API call succeeds. Any upload/task/poll error or timeout → recorded result with a note. Photo-quality errors (no face, too dark, face too small…) are shown so you can retake, with a button to see the recorded result instead.

The UI shows a **DEMO** / **LIVE** badge for *this* browser, and every recorded result is labelled. `?demo=1` forces the demo in a browser, `?demo=0` undoes it. The seeded demo profile (9 weekly check-ins, 3 products) is always available under Products → Your data, whatever the mode. `GET /api/mode` reports `{demo, liveConfigured, accessCodeRequired, accessOk, reason}` (send `x-access-code` to check a code).

What's real in the demo (all on a **synthetic, AI-generated face** — no real person):

| Item | Status |
|---|---|
| Weeks 0–8 skin-analysis scores + 72 detection masks (`fixtures/series/`, `public/demo/series/`, `lib/demo-series.ts` generated from them) | **Real** YouCam Skin Analysis v2.1 responses (week 0 recorded 13 Oct 2026, weeks 1–8 on 22 Oct 2026). Tests assert the app's numbers equal the fixtures. |
| Skin tone `#B8957C` (`fixtures/skin-tone.w08.real.json`) | **Real** YouCam Skin Tone Analysis of the week-8 photo |
| Try-on images: matched 5N and the dropped tint's Medium 04 (`fixtures/makeup-vto.*.real.json`) | **Real** YouCam Makeup VTO |
| Texture simulation (`fixtures/skin-simulation.texture.real.json`) | **Real** YouCam AI Skin Simulation |
| Weekly photos | Synthetic: week 0 is AI-generated; weeks 1–8 keep its luma (detail) and move its chroma towards an AI-generated "calmer skin" variant on an azelaic-like schedule, plus small exposure/white-balance jitter (`scripts/make-series.py`, sources in `scripts/series-src/`) |
| Brands, prices, the 30-shade range | Fictional; the range is generated by formula in CIELAB (`scripts/make-shade-range.py`), not tuned to the face |

In demo mode a check-in returns the recorded real week-8 analysis. On the seeded demo profile it isn't added to the timeline; on your own profile it's saved marked "sample".

## Run locally

```bash
npm install
cp .env.example .env.local     # leave YOUCAM_API_KEY empty for demo mode
npm run dev                    # http://localhost:3000
npm test                       # verdict engine, normalisers, fixtures, shade matching, error routing
```

Camera capture needs HTTPS or `localhost`.

### Environment variables

| Name | Purpose |
|---|---|
| `YOUCAM_API_KEY` | YouCam API key (server-side only). Empty → demo mode. |
| `DEMO_MODE` | `1` forces demo mode even with a key; `0` (with a key) = live. |
| `YOUCAM_API_BASE` | optional, defaults to `https://yce-api-01.makeupar.com` |
| `LIVE_ACCESS_CODE` | required for live calls: browsers must send it as `x-access-code` (open the app once with `?access=<code>`). Unset → live calls are served the demo. |
| `LIVE_DAILY_LIMIT_PER_IP` / `LIVE_DAILY_LIMIT_GLOBAL` | optional live-call caps per day (defaults 6 / 40, per serverless instance) |

## Deploy

`scripts/deploy.sh` deploys the working tree to Vercel production via the REST API (`VERCEL_TOKEN` env var or a proxy that injects it). Or import the repo in Vercel; no build settings needed. To go live, add `YOUCAM_API_KEY`, `DEMO_MODE=0` and `LIVE_ACCESS_CODE` in the Vercel project's environment variables and redeploy.

## Limitations

- Photos and masks persist in the browser's IndexedDB; clearing site data removes them (scores in localStorage too). No cloud sync.
- The rate limit and credit cache are in memory per serverless instance (best-effort).
- Brands and shades are fictional. Cosmetic observations, not medical advice.

## Licence

MIT — see [LICENSE](LICENSE).
