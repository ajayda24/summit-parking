# Summit Parking 🅿️

**Stop circling. Start parking.** A marketplace for parking spaces: owners list idle driveways, plots and basements; drivers find a spot that fits their vehicle, book by the hour and pay from an in-app wallet; admins verify owners and keep the marketplace fair.

Built for the whatnext.club *Idea → Product* challenge. Maps and payments are mocked, but **every feature works end to end in demo mode**.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

- Data lives in SQLite (`data/parking.db`). It's created and seeded automatically on first request.
- Reset to fresh seed data with the **Demo → Reset demo data** button, or `npm run reset`.
- Use the **account switcher** (avatar, top right) to jump between drivers, owners and the admin. No passwords.
- The **Demo pill** (bottom right) fast-forwards the clock (+15/+30/+60 min) so you can show overstays and no-shows, and can simulate a failed payment.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Leaflet (OSM/CARTO tiles) · better-sqlite3 · Recharts.

---

## Mini BRD

### 01 · Problem statement
- **Drivers** spend 10–20 minutes circling for parking. Before arriving they can't tell whether a spot is free, what it costs, or whether their car fits and can reach it (narrow lanes, SUVs, EVs).
- **Owners** leave driveways, plots and basements idle for hours with no easy, trusted way to earn from them.
- **Where it hurts most:** the moment of arrival ("Is it there? Will my car fit? Can I get in?") and trust ("Is this owner real? Will I be overcharged?"). Summit is built on **fit + certainty + trust**.

### 02 · Personas
| User | Attributes we model |
|---|---|
| Driver | Vehicle: bike / hatchback / sedan / SUV / van · Fuel: petrol / diesel / CNG / EV · wants covered, close, cheap |
| Owner | Spot type: driveway / plot / basement / shop front · Size S–XL · Access road narrow / normal / wide · Covered · Amenities (EV charger, CCTV, guard, 24×7, wash) · Instant or request booking |
| Admin | Trust & ops: verification, disputes, pricing, users, analytics |

Seeded personas: **Riya** (SUV + EV, only ₹150 in wallet), **Arjun** (bike rider), **Sana** (sedan, risky cancellations), **Meera** (owner with 7 spots), **Kiran** (new owner, empty), **Farhan** (rejected listing), **Leela** (pending listing + request-mode garage), **Ops Admin**.

### 03 · User stories
- As a driver I set my vehicle once and only see spots it fits.
- As a driver I find nearby spots on a map or list, compare them, book a time, pay from my wallet and get a QR ticket.
- As a driver I can check in, extend, cancel or overstay, and I'm charged fairly and automatically.
- As an owner I list a spot with location, photo, size, availability and price, prove I own it, and earn once verified.
- As an owner I see live occupancy, accept or decline requests, verify QR check-ins, rate drivers and withdraw earnings.
- As an admin I verify owners, resolve disputes, set commission and surge, moderate content and watch demand vs supply.

### 04 · Functional requirements (all built)
| Area | Features |
|---|---|
| Accounts & wallet | One-click account switcher, create demo account, per-user wallet with top-up (demo UPI/card), owner withdrawal to demo bank, full transaction ledger, in-app notifications |
| Driver | Multiple vehicles, size-aware search, map + list (synced hover), filters (fits my car / EV / covered / price / rating) + sort, compare up to 3, spot detail with reviews, 7-day date picker with availability timeline, live price with surge, wallet pay with inline top-up, QR ticket, check-in, live timer ring, extend, cancel with refund preview, overstay counter + auto-pay, receipt, reviews, disputes, favourites, directions |
| Owner | 5-step listing wizard (map pin, photo upload, size/road/amenities, hours/days/blocked dates, smart price suggestion, instant/request mode, ownership proof + ID upload), edit / pause / resubmit, live occupancy board, accept/decline requests, QR/code check-in verification, cancel (with penalty), earnings chart + per-booking breakdown, rate drivers |
| Admin | Stats dashboard + charts, verification queue with document review & duplicate-document detection, users (suspend / restore / log in as), commission and zone surge rules, dispute resolution with platform refunds, review & photo moderation, demand vs supply heatmap, fraud/risk flags, CSV export of bookings and payments |
| Demo tools | Clock fast-forward, simulate payment failure, reset data |

### 05 · Business rules
- **Fit:** bike → S+, hatchback/sedan → M+, SUV → L+, van → XL. SUV/van on a narrow lane gets a warning. The EV filter requires a charger.
- **Booking:** inside open hours and days, not on blocked dates, min 1 hr in 30-min steps, not in the past, no overlap, spot must be verified and not paused, user not suspended.
- **Price:** hours × ₹/hr × surge (zone + time window) + ₹5 convenience fee.
- **Money flow:** the driver pays into platform escrow at booking. At check-out the owner gets base minus commission (default 10%); the platform keeps commission + fee. Every movement is a ledger row, and wallets always reconcile.
- **Request mode:** payment held; auto-refunded if the owner declines or doesn't answer within 15 min.
- **Lifecycle:** `requested → confirmed → live → completed`; exits `declined`, `cancelled`, `no_show`.
- **Check-in:** opens 15 min before start. **No-show** 30 min after start → no refund, owner gets 50% compensation.
- **Cancellation:** ≥1 hr before → 100% refund; <1 hr → 50% (the other half compensates the owner). Owner cancels → 100% refund plus a risk point on the owner.
- **Overstay:** 10-min grace, then 1.5× the hourly rate per started 15 min, auto-debited at check-out (the wallet may go negative; the driver can't book again until topped up).
- **Extend:** only if the next slot is free and within open hours.
- **Verification:** ownership proof + ID required; hidden from drivers until approved; rejection carries a reason; editing with new documents resubmits.
- **Reviews:** only after completion, one per booking per side.

### 06 · Edge cases: "what happens when things DON'T go as expected?"
| Case | Handling |
|---|---|
| Slot taken meanwhile | 409 → card shakes, message shows next free time |
| Wallet too low | Inline "Add ₹X & pay" |
| Payment fails | Failure screen + retry, nothing charged |
| Double-tap pay | Button locks during processing |
| Car too big / narrow road | Card greyed "Too small for your SUV" / narrow-lane warning; API also rejects |
| No results | Illustrated empty road + clear filters |
| Driver overstays | Coral overtime counter, owner alerted (incl. if the next booking is near), auto-charge |
| Driver never arrives | Auto no-show, slot freed, owner compensated |
| Owner ignores / declines a request | Auto-refund + notification |
| Fake or duplicate documents | Flagged in the verify queue and risk flags; admin rejects with reason; owner can resubmit |
| Owner pauses a spot with bookings | Warning; existing bookings honoured |
| Something went wrong | Driver raises a dispute → admin refunds from the platform |
| Abusive review | Auto-flagged, admin hides it, rating recalculates |
| Suspended user | Banner, booking/listing blocked |
| Map tiles offline | List view still works |

### 07 · MVP vs later (MoSCoW)
- **Must:** find parking · map/list · details · book slot · wallet pay · owner lists space · account switcher · seed data
- **Should:** vehicle fit · live check-in/out · cancel + refund · overstay auto-pay · document verification · owner dashboard + payouts · overlap check
- **Could:** compare · extend · favourites · reviews · request mode · surge + price suggestions · disputes · moderation · heatmap · fraud flags · CSV · notifications · demo clock
- **Won't now (real integrations):** real payment gateway / UPI, real KYC (DigiLocker), SMS/push, camera QR scanning, IoT gates, native apps, OTP auth

All Must, Should and Could items are built in demo form.

### 08 · End-to-end demo script (≈5 min)
1. **Kiran (owner)** → *List a spot* → wizard: name, tap the map, size L, ₹40/hr, "Use sample" for both documents → **Pending verification**.
2. **Ops Admin** → *Verification* → review docs → **Approve** (Kiran is notified).
3. **Riya (driver, SUV)** → *Find parking* → Kiran's spot appears → book 3–4 hrs → wallet is short → **Add money & pay** → parking animation + QR ticket.
4. **Kiran** → *Live board* → tap Riya's code under "Arriving soon" → checked in (or Riya taps *Check in*).
5. **Demo pill** → ⏩ jump past the end time → Riya's pass shows the **overtime counter** → *Check out & pay overtime*.
6. **Kiran** → earnings count up → *Wallet* → **Withdraw** → rate Riya.
7. **Riya** → rate the spot. **Admin** overview shows updated revenue and overstays.

Alternative paths: cancel early vs late (Riya's upcoming booking), request mode (Leela's HSR garage), dispute (open one on Riya's Sony Signal booking), suspend Sana, toggle payment failure.

---

## Top 10 features per user

**Parking owner:** 1 List a space · 2 Pin location + photo · 3 Ownership + ID verification · 4 Size, road width, covered, amenities · 5 Availability, blocked dates, hourly price · 6 Instant or request mode with accept/decline · 7 Live occupancy + QR check-in · 8 Earnings dashboard + withdraw · 9 Smart price suggestions · 10 Rate drivers / pause listing

**Driver:** 1 Vehicle profile (type, fuel) · 2 Nearby parking on map/list · 3 Filters + sort · 4 Compare options · 5 Date & time with live price · 6 Book + wallet pay → QR ticket · 7 Live check-in/out, extend · 8 Cancel with refund rules · 9 Overstay auto-charge receipt · 10 Directions, favourites, reviews, disputes

**Admin:** 1 Stats dashboard · 2 Verification queue · 3 User management, suspend, log in as · 4 Commission setting · 5 Zone surge rules · 6 Disputes & refunds · 7 Review/photo moderation · 8 Demand vs supply heatmap · 9 Fraud flags · 10 CSV export

## Project layout
```
app/                 pages (driver/, owner/, admin/, wallet/) + api/[...path] catch-all route
components/          AppShell (header, switcher, bell, demo pill), illustrations (road art), ui kit, MapView, PaySheet, ListingWizard
lib/shared.ts        pure rules shared by client + server (fit, pricing, overtime, refunds)
lib/api.ts           all server endpoints + lifecycle sweep (no-show, request expiry, overstay alerts)
lib/ledger.ts        wallet transfers, notifications, settings
lib/seed.ts          demo users, spots, bookings in every state, reviews, disputes
```
