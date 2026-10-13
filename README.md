# Is It Working?

**A skincare verdict tracker for the moment you ask "is this product actually working?"**

Log the products you start, take a guided selfie once a week, and YouCam Skin AI scores your skin. A deterministic, explainable verdict engine compares each product's target concern before vs after you started — against *your own* week-to-week noise and the product type's realistic time-to-effect — and tells you plainly: **KEEP**, **GIVE IT N MORE WEEKS**, or **DROP**. When a product gets dropped (or it's a complexion product), YouCam Skin Tone Analysis + Makeup VTO let you preview a shade-matched alternative on your own face before you buy.

Built for Perfect Corp's **YouCam API Skin AI & eCommerce VTO Hackathon (2026)**.

- **Live demo:** https://is-it-working.vercel.app (demo mode, no setup)
- **Screenshots:** [`screenshots/`](screenshots/)

## Why

People abandon good products too early (retinoids need 8–12 weeks) and keep re-buying ones that never worked, or buy complexion products in the wrong shade and return them. Is It Working? turns a 30-second weekly selfie into evidence: fewer wasted purchases, fewer returns, and more confident repurchases for retailers.

## Features

- **Product log** — name, brand, type (retinoid, niacinamide, azelaic acid, vitamin C, AHA/BHA, benzoyl peroxide, moisturiser, peptide, complexion…), start date, target concern (acne, redness, dark spots, wrinkles, pores, moisture, texture, radiance), price.
- **Guided weekly check-in** — mobile-web front camera with a face-framing oval, lighting tips, an on-device brightness check, or photo upload. Images are downscaled client-side before upload.
- **Skin analysis per week** — 8 SD concerns from YouCam AI Skin Analysis v2.1, raw + UI scores, overall score, skin age, and per-concern detection masks.
- **Dashboard** — verdict cards with confidence, "£ you don't need to spend on your next refill", per-concern trend lines with lettered product-start markers.
- **Verdict detail** — trend with the noise band drawn around your baseline, before/now/change/wobble/needed stats, "is it too early?" window bar, and every reason in plain English.
- **Photo comparison** — drag-to-compare week A vs week B, with YouCam detection masks overlaid per concern.
- **Try before you buy** — Skin Tone Analysis → nearest shade in a (fictional) foundation range by CIE76 ΔE → Makeup VTO foundation + concealer preview → buy CTA placeholder. Flags when your current tint is a visible mismatch.
- **No accounts** — all data in `localStorage`. Reset to demo or start your own tracking any time.

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
| **AI Facial Color Tones Analyzer** (Skin Tone) | `POST /s2s/v2.0/task/skin-tone-analysis`, poll | reads `results.color.skin_color` for shade matching; `face_angle_strictness_level: "medium"` | 20 |
| **AI Makeup VTO** | `POST /s2s/v2.0/task/makeup-vto`, poll | `version "1.0"`, effects `foundation` (matched hex, coverage 60, glow 15) + `concealer` (12% lighter) | 1 |

Code: `lib/youcam.ts` (client), `app/api/task/[feature]/route.ts` (upload + start), `app/api/task/[feature]/[taskId]/route.ts` (poll + normalise), `lib/normalize.ts` (response → app shape).

## Architecture

```
Browser (Next.js App Router, client components, localStorage)
  ├─ /check-in  camera/upload → prepareImage() → POST /api/task/skin-analysis → poll GET /api/task/skin-analysis/:id
  ├─ /, /products/:id, /trends, /compare   ← computeVerdict() (pure TS, runs client-side)
  └─ /try-on    POST /api/task/skin-tone-analysis → matchShades() → POST /api/task/makeup-vto
Server (Vercel functions)
  └─ /api/task/*  → YouCam File API + task API (live)  |  recorded fixtures (demo)
```

## Demo mode vs live mode

Demo mode is on when `YOUCAM_API_KEY` is missing **or** `DEMO_MODE=1`. The UI shows a **DEMO** / **LIVE** badge, and every demo result is labelled.

What's real and what's simulated (all on a **synthetic, AI-generated face** — no real person):

| Item | Status |
|---|---|
| Week-0 skin analysis scores + 8 detection masks (`fixtures/skin-analysis.week00.real.json`, `public/demo/masks/`) | **Real** YouCam response, recorded 13 Oct 2026 |
| Foundation + concealer try-on image (`fixtures/makeup-vto.foundation.real.json`, `public/demo/vto-foundation.jpg`) | **Real** YouCam response |
| Weeks 1–8 scores (`lib/demo-data.ts`) | **Simulated**, same shape as the real response |
| Week 4 / week 8 photos | AI-generated variants of the same synthetic face (week 4 is a blend) |
| Skin tone response (`fixtures/skin-tone.week00.simulated.json`) | **Simulated** in the documented schema; skin hex sampled from the photo (the live call costs 20 units, over the hackathon budget) |

In demo mode a check-in returns the recorded real analysis of the sample face and is not added to the timeline.

## Run locally

```bash
npm install
cp .env.example .env.local     # leave YOUCAM_API_KEY empty for demo mode
npm run dev                    # http://localhost:3000
npm test                       # verdict engine tests
```

Camera capture needs HTTPS or `localhost`.

### Environment variables

| Name | Purpose |
|---|---|
| `YOUCAM_API_KEY` | YouCam API key (server-side only). Empty → demo mode. |
| `DEMO_MODE` | `1` forces demo mode even with a key; `0` (with a key) = live. |
| `YOUCAM_API_BASE` | optional, defaults to `https://yce-api-01.makeupar.com` |
| `LIVE_ACCESS_CODE` | optional; if set, live calls require header `x-access-code` (open the app once with `?access=<code>` to store it in the browser) so a public deployment can't drain units |

## Deploy

`scripts/deploy.sh` deploys the working tree to Vercel production via the REST API (`VERCEL_TOKEN` env var or a proxy that injects it). Or import the repo in Vercel; no build settings needed. To go live, add `YOUCAM_API_KEY` and `DEMO_MODE=0` in the Vercel project's environment variables and redeploy.

## Limitations

- Live mask URLs from YouCam expire (signed S3 links, ~2 h); scores persist, masks for live check-ins don't.
- Brands and shades in the demo are fictional. Not medical advice.

## Licence

MIT — see [LICENSE](LICENSE).
