# GigLog

A mobile-first work and earnings journal for recording shifts, tracking payments, and sharing monthly reports.

## Overview

GigLog turns daily work records into a clear calendar and monthly financial summary. Users can sign in, record a fixed amount or hourly work, distribute entries across multiple days, track payment status, and copy or share a formatted report.

## Highlights

- Supabase authentication and per-user data
- Calendar-based work entry management
- Fixed-amount, hourly-rate, and multi-day entry modes
- Paid and outstanding income tracking
- Monthly totals and missing-information reminders
- Telegram-friendly report sharing
- Installable PWA with offline service-worker support

## Tech stack

React 19 · Vite · Tailwind CSS · Supabase · ESLint

## Run locally

```bash
git clone https://github.com/eternalstoneinside/giglog.git
cd giglog
npm install
npm run dev
```

Configure the Supabase project values expected by `src/lib/supabase.js` before signing in.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build the production bundle
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build

## Author

Designed and developed by [Dmytro Orlenko](https://github.com/eternalstoneinside).
