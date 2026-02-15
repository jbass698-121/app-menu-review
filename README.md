# Menu Review — Personal Food Memory Companion

A mobile-first web app that helps you remember which dishes you liked or disliked at restaurants so you know what to order (or skip) next time.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth & DB:** Supabase (PostgreSQL + Auth + Storage)
- **Restaurant Data:** Google Places API (New)
- **Deployment:** Vercel

## Getting Started

### 1. Set up the database

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor to create the tables, RLS policies, and triggers.

### 2. Configure environment variables

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key (Places API enabled) |

### 3. (Optional) Create a Supabase Storage bucket

Create a public bucket called `review-photos` in Supabase Storage for dish photo uploads.

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Manual Test Path

1. **Sign up** at `/auth/sign-up` with email and password
2. **Search** for a restaurant using the search bar on the home page
3. **Select** a restaurant from search results
4. **Add a dish** — tap "Add dish", enter a name, choose YES/NO, optionally rate and add notes
5. **Return** to the restaurant page and see your YES/NO indicators on reviewed items
6. **Quick review** — tap "Quick review" to log multiple dishes from one visit
7. **History** — go to the History tab to search across all your reviews
8. **Settings** — export your data as CSV or sign out

## Project Structure

```
src/
├── app/
│   ├── (protected)/          # Auth-required routes
│   │   ├── page.tsx          # Home
│   │   ├── history/          # Review history
│   │   ├── settings/         # Account & data
│   │   └── restaurants/
│   │       ├── search/       # Restaurant search
│   │       └── [id]/         # Restaurant detail
│   │           ├── add-item/ # Add dish + review
│   │           └── quick-review/ # Multi-item review
│   ├── auth/                 # Sign in / sign up
│   └── api/                  # Server API routes
│       ├── places/           # Google Places proxy
│       ├── restaurants/      # Restaurant CRUD
│       └── export/           # CSV export
├── components/               # Shared UI components
├── lib/                      # Supabase clients, types, utils
└── services/                 # Menu OCR service (mock)
```

## Menu OCR (Demo)

The app includes a mock OCR service (`src/services/menu-ocr.ts`) with a `MenuOcrService` interface. The "Import menu (demo)" button on restaurant pages demonstrates the flow with sample data. Replace `MockMenuOcrService` with a real provider (Google Vision, AWS Textract, etc.) to enable actual menu scanning.

## Limitations & TODOs

- Menu OCR is mock-only (no real image processing)
- Photo uploads require a `review-photos` Storage bucket in Supabase
- No offline/PWA support yet
- No push notifications
- Single-user focus (no social features)
