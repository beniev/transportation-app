# Project: Tovil — Israeli Moving Company SaaS Marketplace

## Quick Reference

| Item | Value |
|------|-------|
| Live site | https://www.tovil.app (frontend), https://api.tovil.app (backend) |
| GitHub | https://github.com/beniev/transportation-app.git (branch: main) |
| Language | Hebrew (RTL) primary, English secondary |
| Timezone | Asia/Jerusalem |

---

## 1. Tech Stack

- **Backend**: Django 5.0 + Django REST Framework, Python 3.12
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **DB**: PostgreSQL 16
- **AI**: Google Gemini 2.0 Flash (item parsing, price analysis, image analysis)
- **Auth**: JWT (SimpleJWT) + Google OAuth (allauth)
- **i18n**: Hebrew (RTL) + English, `react-i18next`
- **Deployment**: Railway (Docker containers)
- **State**: React Query (TanStack Query) for server state

---

## 2. Railway Deployment

### SSL Issue
Railway CLI has SSL certificate issues due to **Netspark/Norton SSL interception** (MITM).
The CLI uses Rust's `rustls` which rejects intercepted certificates as `UnknownIssuer`.
**Workaround**: Use `curl -k` with direct GraphQL API calls.

### Railway API Token
```
Token: a3204df8-e4c8-4c6e-8f25-38752aec8443
Name: API Token2
Scope: beniev's Projects
```

### Project Details
```
Project ID:  a992071b-8549-4ab3-9619-5215fe82d2c2
Environment: production (ID: e9b4e900-e2d4-42e9-995d-a8fd727dcd36)

Services:
  backend:    80323feb-36ea-4455-9fb7-ca71bb3df055  → api.tovil.app
  frontend:   af29a599-1ad0-431b-afd6-0fad6e4bbdb7  → www.tovil.app
  PostgreSQL: 94240b3e-e13f-4f36-87df-06c420be76f9
```

### Deploy Commands

**Deploy BOTH services (always specify commitSha!):**
```bash
COMMIT=$(git rev-parse HEAD)

# Single mutation deploys both
curl -k -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a3204df8-e4c8-4c6e-8f25-38752aec8443" \
  -d "{\"query\":\"mutation { frontend: serviceInstanceDeploy(serviceId: \\\"af29a599-1ad0-431b-afd6-0fad6e4bbdb7\\\", environmentId: \\\"e9b4e900-e2d4-42e9-995d-a8fd727dcd36\\\", commitSha: \\\"$COMMIT\\\") backend: serviceInstanceDeploy(serviceId: \\\"80323feb-36ea-4455-9fb7-ca71bb3df055\\\", environmentId: \\\"e9b4e900-e2d4-42e9-995d-a8fd727dcd36\\\", commitSha: \\\"$COMMIT\\\") }\"}"
```

**Check deployment status:**
```bash
curl -k -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a3204df8-e4c8-4c6e-8f25-38752aec8443" \
  -d '{"query":"{ project(id: \"a992071b-8549-4ab3-9619-5215fe82d2c2\") { services { edges { node { name deployments(first: 1) { edges { node { id status createdAt } } } } } } } }"}'
```

### Deploy Pitfalls
- **ALWAYS specify `commitSha`** — without it Railway deploys an old cached commit
- **TypeScript strict mode** — unused variables cause TS6133 build failures on Railway
- **After deploy** — user may need `Ctrl+Shift+R` to clear browser cache
- Backend Dockerfile: `/backend/Dockerfile`, Frontend: `/frontend/Dockerfile`
- Backend `entrypoint.sh` auto-runs: makemigrations → migrate → seed_item_catalog → collectstatic → gunicorn

---

## 3. Git

- Remote: `https://github.com/beniev/transportation-app.git`
- Branch: `main`
- SSL verification disabled: `git config http.sslVerify false` (Netspark)

---

## 4. Project Structure

```
transportation_app/
├── backend/
│   ├── config/                    # Django settings (base.py, production.py)
│   ├── apps/
│   │   ├── accounts/              # User, MoverProfile, CustomerProfile, Admin mover mgmt
│   │   ├── orders/                # Order, OrderItem, OrderImage, Comparison, Review
│   │   ├── movers/                # ItemCategory, ItemType, MoverPricing, PricingFactors
│   │   ├── ai_integration/        # Gemini client, item parser, price analyzer, image analyzer
│   │   ├── quotes/                # QuoteTemplate, Quote, QuoteItem, Signature
│   │   ├── payments/              # SubscriptionPlan, Subscription, Payment, Coupon
│   │   ├── scheduling/            # WeeklyAvailability, BlockedDate, Booking, TimeSlot
│   │   ├── notifications/         # NotificationType, Notification, EmailLog, SMSLog
│   │   ├── analytics/             # AnalyticsEvent, DailyAnalytics, MonthlyAnalytics
│   │   └── core/                  # Utils (haversine_distance, coordinates)
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios instance with JWT interceptor
│   │   │   ├── endpoints/         # API endpoint functions (orders, auth, pricing, etc.)
│   │   │   └── hooks/             # React Query hooks (useOrders, usePricing, etc.)
│   │   ├── components/
│   │   │   ├── layout/            # AdminLayout, MoverLayout, CustomerLayout, AuthLayout
│   │   │   └── common/            # LoadingSpinner, LanguageSwitcher, AddressAutocomplete
│   │   ├── contexts/              # AuthContext, LanguageContext
│   │   ├── pages/
│   │   │   ├── admin/             # AdminOrders, MoverApprovals, Catalog
│   │   │   ├── mover/             # Dashboard, Orders, Pricing, ServiceArea, Onboarding...
│   │   │   ├── customer/          # CreateOrder, OrderStatus, EditOrder, CompareMovers
│   │   │   └── auth/              # Login, Register
│   │   ├── types/                 # TypeScript interfaces (orders, auth, pricing, etc.)
│   │   └── styles/globals.css
│   ├── Dockerfile
│   └── vite.config.ts
└── CLAUDE.md                      # ← This file
```

---

## 5. External Integrations

### Google Gemini AI
- **Model**: `gemini-2.0-flash` (fast, stable)
- **Transport**: REST (not gRPC) — avoids SSL issues on Windows
- **Key env var**: `GEMINI_API_KEY`
- **SSL workaround**: `GEMINI_DISABLE_SSL_VERIFY=true` for dev
- **Services**:
  - `ItemParserService` — free-text → structured items with weight/size estimates
  - `PriceAnalyzerService` — calculates order pricing with 15+ factors
  - `ImageAnalyzerService` — identifies items from photos
  - `ClarificationService` — generates variant questions for generic items
- **Fallback**: Direct HTTP POST when SDK fails

### Google OAuth
- Provider: `allauth.socialaccount.providers.google`
- Endpoint: `POST /api/v1/auth/google/`
- Env vars: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

### Google Maps
- Address autocomplete in order forms
- Env vars: `GOOGLE_MAPS_API_KEY` (backend), `VITE_GOOGLE_MAPS_API_KEY` (frontend)

### SMS4Free (Israeli SMS)
- Env vars: `SMS4FREE_KEY`, `SMS4FREE_USER`, `SMS4FREE_PASS`, `SMS4FREE_SENDER`
- Default sender: "MoversIL"

### Tranzila (Payment Gateway, optional)
- Terminal: `TRANZILA_TERMINAL`, Password: `TRANZILA_PASSWORD`

---

## 6. Authentication

- **Method**: Email-based (no username), JWT tokens
- **Library**: `dj-rest-auth` + `allauth` + `simplejwt`
- **Access token**: 60 min lifetime
- **Refresh token**: 7 days, auto-rotated
- **Frontend storage**: `localStorage` — `accessToken`, `refreshToken`
- **Auto-refresh**: Axios interceptor retries 401s with refreshed token
- **User types**: `customer`, `mover`, `admin`
- **Google OAuth**: Returns JWT tokens same as regular login

---

## 7. API Structure

All endpoints under `/api/v1/`. DRF **PageNumberPagination** globally (PAGE_SIZE=20).
Frontend MUST unwrap: `response.data.results ?? response.data`

### Key Endpoints
```
Auth:     /api/v1/auth/{login,register,google,token/refresh,profile}/
Orders:   /api/v1/orders/{,create,mover/,available/,admin/,<id>/}
          /api/v1/orders/<id>/{submit,approve,reject,schedule,complete,cancel}/
          /api/v1/orders/<id>/{items/,images/,comparison/,comparison/generate/}
Movers:   /api/v1/movers/{categories/,item-types/,<id>/pricing/,<id>/pricing-factors/}
AI:       /api/v1/ai/{parse-description/,process-order/,analyze-image/}
Quotes:   /api/v1/quotes/{,<id>/,<id>/send/,<id>/sign/,<id>/pdf/}
Admin:    /api/v1/auth/admin/movers/{,<id>/approve/,<id>/reject/}
          /api/v1/orders/admin/{,<id>/}
Scheduling: /api/v1/scheduling/{availability/,bookings/}
Payments:   /api/v1/payments/{plans/,subscription/,methods/}
```

---

## 8. Key Business Logic

### Order Flow
```
DRAFT → PENDING → COMPARING → QUOTED → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED
                                                                                  ↓
                                                                          Review created
Side paths: CANCELLED, REJECTED (from most states)
```

### AI Item Processing Pipeline
1. Customer enters free-text description (Hebrew)
2. `ItemParserService.parse_description()` → Gemini AI
3. AI returns structured items with: name, quantity, fragile, assembly needs, weight_class, size, confidence
4. Items matched to `ItemType` catalog (or left unmatched with AI estimates)
5. Generic matches → clarification questions (variant selection)
6. Customer answers → `ItemVariantService` resolves to specific variant
7. Pricing calculated for all items

### Smart Pricing (Unmatched Items)
Items not found in the DB catalog get priced by AI-estimated weight × size:

| Size \ Weight | Light (0.8×) | Medium (1.0×) | Heavy (1.3×) | Extra Heavy (1.6×) |
|---------------|-------------|---------------|-------------|-------------------|
| Small (₪50)   | ₪40 | ₪50 | ₪65 | ₪80 |
| Medium (₪100) | ₪80 | ₪100 | ₪130 | ₪160 |
| Large (₪200)  | ₪160 | ₪200 | ₪260 | ₪320 |
| XL (₪350)     | ₪280 | ₪350 | ₪455 | ₪560 |

**Fragile multiplier**: ×1.25 on top (applies to both matched and unmatched items)

### Price Comparison Service
1. Find eligible movers (within service_radius_km, verified, active)
2. For each mover: calculate full order price using their PricingFactors
3. Price includes: items + floor surcharges + distance + travel + seasonal + day-of-week
4. Rank by total price, store as ComparisonEntries
5. Customer selects → creates Quote → order moves to APPROVED

### Pricing Factors (per mover, with defaults)
- Floor surcharge: 5% per floor (no elevator), 50% discount with elevator
- Distance to truck: 5% per 10m
- Travel: ₪5/km, minimum ₪50
- Seasonal: 1.25× in July-August
- Weekend: 15% surcharge, Friday: 10%
- Minimum order: ₪200

---

## 9. Database Models (Key)

### Accounts
- **User** — email auth, user_type (customer/mover/admin), preferred_language
- **MoverProfile** — company info, location (lat/lng), service_radius_km, verification_status, rating, onboarding_step
- **CustomerProfile** — spam_score, default_address

### Orders
- **Order** — customer↔mover, status, origin/destination (address, floor, elevator, coordinates), pricing breakdown, ai_processed
- **OrderItem** — item_type (FK nullable), name, quantity, flags (fragile, assembly, disassembly), estimated_weight_class, estimated_size, pricing fields, ai_confidence
- **OrderImage** — image_url, ai_analyzed, ai_analysis
- **OrderComparison** — status, eligible movers count, expires_at
- **ComparisonEntry** — mover snapshot, total_price, pricing_breakdown, rank
- **Review** — rating (1-5), text, auto-updates mover rating

### Movers (Catalog)
- **ItemCategory** — name_en/he, icon, parent, display_order
- **ItemType** — name_en/he, category, is_generic, parent_type (variants), weight_class, default prices
- **ItemAttribute** — variant questions (door_count, bed_size, sofa_type)
- **MoverPricing** — mover's custom price per item_type
- **PricingFactors** — mover's pricing rules (floors, distance, seasonal, etc.)

### Quotes
- **Quote** — order, template, status (draft/sent/accepted), items_data, pricing_data, pdf_file
- **Signature** — digital signature (base64), signer details, verification_code

### Payments
- **SubscriptionPlan** — free/basic/pro/enterprise with feature gates
- **Subscription** — per mover, usage tracking (orders/quotes per month)

### Scheduling
- **WeeklyAvailability** — per mover, per day, start/end times, max_bookings
- **Booking** — order↔mover, scheduled times, crew_size, confirmation status

---

## 10. Frontend Patterns

### Routes (App.tsx)
```tsx
/login, /register                    — AuthLayout
/order, /order/status/:id, /order/edit/:id, /order/compare/:id  — CustomerLayout
/mover, /mover/orders, /mover/pricing, /mover/service-area...   — MoverLayout
/admin, /admin/movers, /admin/orders                            — AdminLayout (admin only)
```

### Key Contexts
- **AuthContext** — user, login(), logout(), loginWithGoogle(), isAuthenticated
- **LanguageContext** — language ('he'/'en'), RTL detection

### API Layer Pattern
```
src/api/endpoints/orders.ts    → raw API calls (ordersAPI.getOrders, etc.)
src/api/hooks/useOrders.ts     → React Query hooks (useOrders, useCreateOrder, etc.)
src/types/orders.ts            → TypeScript interfaces
```

### RTL Support
- Default language: Hebrew
- `const isRTL = i18n.language === 'he'`
- Use `dir={isRTL ? 'rtl' : 'ltr'}` on containers
- Use `text-start`/`text-end` instead of `text-left`/`text-right`
- Range inputs wrapped in `<div dir="ltr">` to prevent RTL reversal

### Admin Pages Pattern
- Use `useState` + manual fetch (not React Query) — matches MoverApprovals pattern
- Tabs for status filtering, search input
- `LoadingSpinner` for loading states
- `toast` from `react-hot-toast` for notifications
- Purple color theme (`bg-purple-600`, `border-purple-500`)
- Paginated API response: `{ count, next, previous, results }`

---

## 11. Common Gotchas

1. **Pagination unwrapping** — Backend returns `{count, results: [...]}`. Frontend must use `response.data.results ?? response.data`
2. **TypeScript strict mode** — Unused variables = build failure on Railway (TS6133)
3. **Railway deploy without commitSha** — Will deploy old cached commit, not latest
4. **SSL everywhere** — Netspark intercepts SSL. Use `curl -k`, `git config http.sslVerify false`, `GEMINI_DISABLE_SSL_VERIFY=true`
5. **Fragile multiplier** — Must be applied in BOTH `calculate_item_price` and `comparison_service` items dict
6. **Mover eligibility** — Movers need `is_verified=True` AND `verification_status='approved'` to appear in comparisons
7. **RTL range inputs** — HTML range inputs flip in RTL. Wrap in `<div dir="ltr">`
8. **entrypoint.sh** — Runs `seed_item_catalog` on every deploy. Idempotent (uses get_or_create)
9. **CORS** — Production CORS set via `CORS_ALLOWED_ORIGINS` env var on Railway
10. **Gemini transport** — Must use REST not gRPC on Windows due to SSL issues
