# Project Status

## Decisions Made

- Build `v1` as a web-first product with `Next.js + TypeScript`
- Use a modular monolith for the main product and one separate `Go` worker for snapshots and background jobs
- Use `Postgres` as the primary database
- Host the database on `Supabase`
- Use `Prisma` as the ORM and database client layer
- Use `Clerk` for authentication
- Use `Tailwind CSS` for styling
- Use `lightweight-charts` for market charts
- Use `Twelve Data` as the initial market data provider
- Keep the market data integration behind a provider abstraction so it can be swapped later

## API And Domain Decisions

- `v1` supports `U.S. equities` only
- `v1` supports `market orders` only
- Orders fill immediately using the latest known provider price
- `v1` does not support options, social features, real money movement, or a complex matching engine
- Portfolio state should be derived from executed fills plus current quotes, not from frontend-calculated values
- Planned `v1` API surfaces:
  - `GET /api/search?query=`
  - `GET /api/stocks/:symbol`
  - `GET /api/stocks/:symbol/history?range=1D|1W|1M|3M|1Y`
  - `GET /api/portfolio`
  - `GET /api/orders`
  - `POST /api/orders`

## Progress So Far

- Step 1 complete: root `package.json` exists and is configured as the workspace root
- Step 2 complete: `apps/web` was scaffolded and the Next.js dev server runs successfully
- Step 3 complete: Prisma is installed, `prisma/schema.prisma` exists, `prisma.config.ts` is in place, and Prisma connects to Supabase
- Step 4 complete: `workers/snapshots/go.mod` exists and the Go worker is initialized as a module
- Step 5 complete: Clerk, Supabase, and Twelve Data env vars are wired and each integration was sanity-checked independently
- Step 6 complete: the first schema draft now defines `User`, `BrokerageAccount`, and `AccountStatus`
- Step 7 complete: the protected `/setup` onboarding gate now provisions `User` and `BrokerageAccount` from Clerk identity data before entering the product
- Step 8 complete: a shared Prisma client module now exists for the Next.js app and the current onboarding page lint checks cleanly
- Step 9 complete: `/dashboard` now requires auth, verifies provisioning, and renders the seeded paper account state
- Step 10 complete: `/`, `/sign-in`, and `/sign-up` now redirect signed-in users into setup, and the shell includes a working sign-out control
- Step 11 complete: Clerk auth buttons are now used in the supported form for the installed Clerk version: childless `<SignInButton />` and `<SignUpButton />` components, with custom button children avoided
- Step 12 complete: the Day 1 auth route matrix was manually verified for signed-in and signed-out users across `/`, `/sign-in`, `/sign-up`, `/setup`, and `/dashboard`
- Step 13 complete: Day 2 market data provider boundary is implemented under `apps/web/lib/market-data`
- Step 14 complete: Twelve Data adapter now supports symbol search, quotes, and historical candles through normalized app-owned types
- Step 15 complete: market data provider was manually smoke-tested with `searchSymbols("AAPL")`, `getQuote("AAPL")`, and `getHistory("AAPL", "1M")`

## Current Files And Runtime Notes

- Root Prisma connection lives in `.env`
- Next.js runtime env vars live in `apps/web/.env.local`
- Supabase uses the `session pooler` connection string because the direct connection path was not reachable from the current network
- Prisma is using `prisma.config.ts`, which matches the installed `Prisma 7` setup
- `prisma/schema.prisma` validates successfully with `npx prisma validate`
- The onboarding gate lives at `apps/web/app/setup/page.tsx`
- The shared Prisma client now lives at `apps/web/lib/prisma.ts` and is imported as `@/lib/prisma`
- The onboarding page and current Prisma schema both expect `User.email` to be present
- The signed-in dashboard lives at `apps/web/app/dashboard/page.tsx`
- The installed Clerk button components should be used without children unless the app intentionally switches to fully custom auth controls
- The shared header owns signed-out auth actions through Clerk's childless `<SignInButton />` and `<SignUpButton />` components
- The market data boundary lives at `apps/web/lib/market-data`
- `apps/web/lib/market-data/types.ts` defines app-owned market data shapes: `HistoryRange`, `MarketSymbol`, `MarketQuote`, and `MarketCandle`
- `apps/web/lib/market-data/provider.ts` defines the `MarketDataProvider` contract
- `apps/web/lib/market-data/factory.ts` returns the active provider, currently `TwelveDataProvider`
- `apps/web/lib/market-data/providers/twelve-data.ts` contains the Twelve Data adapter, including raw response types, range mapping, URL construction, JSON fetching, number parsing, and provider-to-app mapping helpers
- Twelve Data quote/history calls should constrain U.S. listings where needed; `AAPL` quote testing succeeded with `exchange=NASDAQ`
- Historical candle responses are normalized to oldest-first order for chart/API friendliness
- `npx prisma generate`, `npx tsc -p apps/web/tsconfig.json --noEmit`, and `npm --workspace apps/web run lint` all pass against the current onboarding work

## Target Progress

- Day 1: stabilize the auth/onboarding loop, keep `/`, `/sign-in`, `/sign-up`, `/setup`, and `/dashboard` working cleanly, and commit the current foundation once verified
- Day 2: add the market data provider boundary in the web app, starting with a `MarketDataProvider` interface and a Twelve Data-backed adapter for search, quote, and history
- Day 3: create read-only stock API routes: `GET /api/search`, `GET /api/stocks/:symbol`, and `GET /api/stocks/:symbol/history`
- Day 4: expand the Prisma domain for trading with positions, orders, and fills, then generate and apply the next migration
- Day 5: implement `GET /api/portfolio`, `GET /api/orders`, and the first safe version of `POST /api/orders` for immediate paper fills
- End-of-week demo: signed-in user can search a U.S. stock, inspect a quote/history view, submit a market paper order, and see cash, buying power, orders, and positions update from server-owned state

- Step 16 complete: three read-only market data API routes created under `apps/web/app/api/market/`: `GET /api/market/search?q=`, `GET /api/market/quote/[symbol]`, and `GET /api/market/history/[symbol]?range=`
- Step 17 complete: search route hardened with USD currency filter, NASDAQ-only exchange filter, derivative product filter (`!symbol.endsWith("XX")`), and symbol deduplication via `Map`
- Step 18 complete: all three market routes manually curl-tested across happy path and edge cases — invalid range returns 400, invalid symbol returns 500, missing params return safe defaults

- Step 19 complete: global layout nav updated with a signed-in-only search bar (`Search Stocks` input with icon) and a `Portfolio` nav link pointing to `/dashboard`, both wrapped in `<Show when="signed-in">`
- Step 20 complete: nav spacing corrected using `flex gap-6` on the `<nav>` container and `me-4` margin to separate nav links from user controls
- Step 21 complete: Tailwind CSS reference sheet created at `docs/tailwind-reference.md` with class descriptions and links to official documentation
- Step 22 complete: nav search bar extracted into a reusable `SearchBar` component at `apps/web/app/components/search-bar.tsx` with live search, dropdown results, and `router.push` navigation to `/stocks/[symbol]`
- Step 23 complete: search dropdown shows popular stocks (`AAPL`, `GOOGL`, `NVDA`, `TSLA`, `AMZN`, `TSMC`) when focused with empty query, and live results when typing
- Step 24 complete: search filter updated to use a US exchange allowlist (`NASDAQ`, `NYSE`, `NYSE Arca`, `NYSE American`, `CBOE`) replacing the NASDAQ-only filter — `VOO` and other NYSE Arca ETFs now return correctly
- Step 25 complete: `lightweight-charts` confirmed already installed in `apps/web`
- Step 26 complete: Prisma schema updated with `Position`, `Transaction`, `PortfolioSnapshot` models and `TransactionType` enum — back-relations added to `BrokerageAccount`
- Step 27 complete: migration `20260520111820_add_positions_transactions_snapshots` applied successfully to Supabase
- Step 28 complete: Prisma CLI upgraded to v7.8.0 to match `@prisma/client` — version mismatch resolved
- Step 29 complete: Prisma Client regenerated successfully with new model types
- Step 30 complete: Row-Level Security enabled on all Supabase tables
- Step 31 Complete: Trade API route implemeted and tested with current account
- Step 32 Complete: Portofolio API route implemted and tested with current account
- Step 33 Complete: Implemented the skeleton of Stock Detail and Order Entry page

## Current Files And Runtime Notes

- Root Prisma connection lives in `.env`
- Next.js runtime env vars live in `apps/web/.env.local`
- Supabase uses the `session pooler` connection string because the direct connection path was not reachable from the current network
- Prisma is using `prisma.config.ts`, which matches the installed `Prisma 7` setup
- `prisma/schema.prisma` validates successfully with `npx prisma validate`
- The onboarding gate lives at `apps/web/app/setup/page.tsx`
- The shared Prisma client now lives at `apps/web/lib/prisma.ts` and is imported as `@/lib/prisma`
- The signed-in dashboard lives at `apps/web/app/dashboard/page.tsx`
- The market data boundary lives at `apps/web/lib/market-data`
- Search bar component lives at `apps/web/app/components/search-bar.tsx`
- Search filter uses `US_EXCHANGES` allowlist + `currency === "USD"` + `!symbol.endsWith("XX")` to return clean US stock and ETF results

## Good Next Steps

### Ready Now
- Finish the Stock Detail + Order Entry page  with the light-chart and order widget (`/stocks/[symbol]`)
- Build out the Portfolio/Dashboard page (redesign of `/dashboard`)