import type Database from "better-sqlite3";
import { credit, notify, payOwner, PLATFORM_ID, setSetting, transfer } from "./ledger";
import { FEE, HOUR, MIN, overtime } from "./shared";

type D = Database.Database;
const DAY = 24 * HOUR;

export function seed(d: D) {
  const t = Date.now();
  const at = (ms: number) => Math.round(ms / MIN) * MIN;

  setSetting(d, "commission", 10);
  setSetting(d, "clock_offset", 0);
  setSetting(d, "fail_payment", false);
  setSetting(d, "surge_rules", [
    { zone: "Koramangala", from: 18, to: 22, mult: 1.3 },
    { zone: "Indiranagar", from: 9, to: 11, mult: 1.2 },
  ]);

  const users: [number, string, string, string, string][] = [
    [1, "Riya Sharma", "driver", "SUV + EV owner, daily office commute", "#CDE7FF"],
    [2, "Arjun Rao", "driver", "Delivery rider on a bike", "#BDEBD6"],
    [3, "Sana Khan", "driver", "Weekend shopper, sedan on CNG", "#FFD6BF"],
    [4, "Meera Iyer", "owner", "Owns 7 spots across Koramangala & Indiranagar", "#D9D2FF"],
    [5, "Kiran Patel", "owner", "New owner with an empty driveway", "#FFF1B8"],
    [6, "Farhan Ali", "owner", "Listing was rejected, needs to resubmit", "#FFC9DE"],
    [7, "Leela Menon", "owner", "HSR plot owner, one listing under review", "#C9F2EE"],
    [8, "Ops Admin", "admin", "Platform operations & trust team", "#FFF1B8"],
  ];
  const insUser = d.prepare("INSERT INTO users (id, name, role, tagline, avatar_color, created_at) VALUES (?,?,?,?,?,?)");
  for (const u of users) insUser.run(...u, t - 30 * DAY);

  const insVeh = d.prepare("INSERT INTO vehicles (user_id, label, plate, type, fuel, active) VALUES (?,?,?,?,?,?)");
  insVeh.run(1, "Hyundai Creta", "KA 01 MK 4521", "suv", "petrol", 1);
  insVeh.run(1, "Tata Nexon EV", "KA 03 EV 2210", "hatchback", "ev", 0);
  insVeh.run(2, "Honda Activa", "KA 05 HX 9087", "bike", "petrol", 1);
  insVeh.run(3, "Honda City", "KA 51 CN 3344", "sedan", "cng", 1);

  const insSpot = d.prepare(`INSERT INTO spots (id, owner_id, title, address, zone, lat, lng, spot_type, size, road_width, covered,
    amenities, price, open_from, open_to, mode, status, reject_reason, paused, description, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  type S = [number, number, string, string, string, number, number, string, string, string, number, string[], number, number, number, string, string, string | null, number, string];
  const spots: S[] = [
    [1, 4, "Sunny Driveway", "12, 5th Block, Koramangala", "Koramangala", 12.934, 77.619, "driveway", "M", "normal", 0, ["cctv"], 30, 0, 24, "instant", "verified", null, 0, "Gated driveway in front of a quiet house. Gate code shared after booking."],
    [2, 4, "Green Basement Parking", "80ft Road, Koramangala 4th Block", "Koramangala", 12.9372, 77.6268, "basement", "L", "wide", 1, ["ev_charger", "cctv", "guard", "24x7"], 50, 0, 24, "instant", "verified", null, 0, "Covered basement bay with a 7 kW charger. Guard on duty all night."],
    [3, 4, "Forum Side Plot", "Hosur Rd, near Forum Mall", "Koramangala", 12.9345, 77.6112, "plot", "XL", "wide", 0, ["guard"], 40, 6, 23, "instant", "verified", null, 0, "Big open plot — vans and tempos welcome."],
    [4, 7, "Leela's Bike Bay", "Sector 1, HSR Layout", "HSR", 12.9121, 77.6446, "shopfront", "S", "narrow", 1, ["cctv"], 15, 0, 24, "instant", "verified", null, 0, "Covered two-wheeler bay beside a bakery."],
    [5, 7, "HSR Sector 2 Garage", "19th Main, HSR Sector 2", "HSR", 12.9098, 77.6502, "driveway", "L", "normal", 1, ["ev_charger"], 45, 0, 24, "request", "verified", null, 0, "Private garage. Owner approves each request — usually within minutes."],
    [6, 7, "27th Main Corner Plot", "27th Main, HSR Sector 1", "HSR", 12.9135, 77.642, "plot", "XL", "wide", 0, ["24x7"], 35, 0, 24, "instant", "pending", null, 0, "Corner plot next to the park."],
    [7, 6, "Old Airport Road Lane", "Old Airport Rd, Indiranagar", "Indiranagar", 12.969, 77.647, "driveway", "M", "narrow", 0, [], 25, 7, 22, "instant", "rejected", "Ownership document is blurry and matches another owner's upload — please upload a clear copy of your own deed.", 0, "Driveway in a narrow lane."],
    [8, 4, "100ft Road Covered Bay", "100 Feet Rd, Indiranagar", "Indiranagar", 12.9716, 77.6412, "basement", "L", "wide", 1, ["ev_charger", "cctv", "guard"], 70, 0, 24, "instant", "verified", null, 0, "Premium covered bay right on 100ft Road."],
    [9, 4, "CMH Road Shopfront", "CMH Rd, Indiranagar", "Indiranagar", 12.9784, 77.6408, "shopfront", "M", "normal", 0, [], 30, 9, 21, "instant", "verified", null, 1, "Paused while the shop front is being renovated."],
    [10, 7, "Jyoti Nivas EV Hub", "JNC Road, Koramangala 5th Block", "Koramangala", 12.933, 77.6155, "plot", "L", "wide", 1, ["ev_charger", "24x7", "wash"], 60, 0, 24, "instant", "verified", null, 0, "Solar-roofed plot with two fast chargers and a wash bay."],
    [11, 4, "1st Block Lane Spot", "1st Block, Koramangala", "Koramangala", 12.928, 77.63, "driveway", "M", "narrow", 0, ["cctv"], 20, 0, 24, "instant", "verified", null, 0, "Budget spot in a narrow lane. Best for hatchbacks."],
    [12, 4, "Sony Signal Van Yard", "Sony World Junction, Koramangala", "Koramangala", 12.9368, 77.623, "plot", "XL", "wide", 0, ["guard", "24x7"], 55, 0, 24, "instant", "verified", null, 0, "Large yard for vans and SUVs, guard 24×7."],
  ];
  for (const s of spots) {
    const [id, owner, title, address, zone, lat, lng, type, size, road, covered, amen, price, from, to, mode, status, reason, paused, desc] = s;
    insSpot.run(id, owner, title, address, zone, lat, lng, type, size, road, covered, JSON.stringify(amen), price, from, to, mode, status, reason, paused, desc, t - 20 * DAY + id * HOUR);
  }

  const insDoc = d.prepare("INSERT INTO documents (spot_id, kind, file_name, created_at) VALUES (?,?,?,?)");
  for (const s of spots) {
    const [id, owner] = s;
    const ownerName = users.find((u) => u[0] === owner)![1].split(" ")[0].toLowerCase();
    if (id === 7) {
      insDoc.run(id, "ownership", "sale_deed_27th_main.pdf", t - 3 * DAY);
      insDoc.run(id, "id", `aadhaar_${ownerName}.jpg`, t - 3 * DAY);
    } else if (id === 6) {
      insDoc.run(id, "ownership", "sale_deed_27th_main.pdf", t - 2 * HOUR);
      insDoc.run(id, "id", `aadhaar_${ownerName}.jpg`, t - 2 * HOUR);
    } else {
      insDoc.run(id, "ownership", `property_tax_receipt_${id}.pdf`, t - 20 * DAY);
      insDoc.run(id, "id", `pan_${ownerName}.jpg`, t - 20 * DAY);
    }
  }

  const price = (id: number) => spots.find((s) => s[0] === id)![12];
  const owner = (id: number) => spots.find((s) => s[0] === id)![1];
  let codeN = 100;
  const insB = d.prepare(`INSERT INTO bookings (spot_id, driver_id, vehicle_id, start_at, end_at, base, surge, fee, total, commission_pct,
    code, status, checked_in_at, checked_out_at, overtime_min, overtime_amount, refund_amount, owner_payout, cancelled_by, created_at)
    VALUES (?,?,?,?,?,?,1,?,?,10,?,?,?,?,?,?,?,?,?,?)`);

  type Opt = { status: string; inAt?: number; outAt?: number; cancelledBy?: string; created?: number };
  const vehicleOf: Record<number, number> = { 1: 1, 2: 3, 3: 4 };
  const book = (spot: number, driver: number, start: number, hours: number, o: Opt) => {
    start = at(start);
    const end = start + hours * HOUR;
    const base = Math.round(hours * price(spot));
    const total = base + FEE;
    const created = at(o.created ?? start - 6 * HOUR);
    const ot = o.outAt ? overtime(price(spot), end, o.outAt) : { minutes: 0, amount: 0 };
    const id = Number(
      insB.run(spot, driver, vehicleOf[driver], start, end, base, FEE, total, `SP-${String.fromCharCode(65 + (codeN % 26))}${codeN++}Q7`,
        o.status, o.inAt ? at(o.inAt) : null, o.outAt ? at(o.outAt) : null, ot.minutes, ot.amount, 0, 0, o.cancelledBy ?? null, created).lastInsertRowid
    );
    transfer(d, driver, PLATFORM_ID, total, "booking_hold", id, `Booking #${id} paid from wallet`, created);
    const own = owner(spot);
    let payout = 0;
    let refund = 0;
    if (o.status === "completed") {
      payout += payOwner(d, id, own, base, 10, `Payout for booking #${id}`, o.outAt!);
      if (ot.amount > 0) {
        transfer(d, driver, PLATFORM_ID, ot.amount, "overtime", id, `Overtime ${ot.minutes} min auto-charged`, o.outAt!);
        payout += payOwner(d, id, own, ot.amount, 10, `Overtime payout for booking #${id}`, o.outAt!);
      }
    } else if (o.status === "cancelled") {
      const late = o.cancelledBy === "driver-late";
      if (late) {
        refund = Math.round(base / 2);
        transfer(d, PLATFORM_ID, driver, refund, "refund", id, "50% refund — cancelled less than 1 hr before start", created + 10 * MIN);
        payout += payOwner(d, id, own, base - refund, 10, `Late-cancellation compensation #${id}`, created + 10 * MIN);
      } else {
        refund = total;
        transfer(d, PLATFORM_ID, driver, refund, "refund", id, "Full refund — cancelled 1 hr+ before start", created + 10 * MIN);
      }
    } else if (o.status === "no_show") {
      payout += payOwner(d, id, own, Math.round(base / 2), 10, `No-show compensation #${id}`, start + 30 * MIN);
    }
    d.prepare("UPDATE bookings SET owner_payout = ?, refund_amount = ?, cancelled_by = ? WHERE id = ?").run(
      payout, refund, o.cancelledBy ? (o.cancelledBy.startsWith("driver") ? "driver" : o.cancelledBy) : null, id
    );
    return id;
  };

  // Past, completed
  const bA = book(2, 1, t - 1 * DAY - 5 * HOUR, 2, { status: "completed", inAt: t - DAY - 5 * HOUR, outAt: t - DAY - 3 * HOUR - 5 * MIN });
  const bB = book(4, 2, t - 1 * DAY - 9 * HOUR, 3, { status: "completed", inAt: t - DAY - 9 * HOUR, outAt: t - DAY - 6 * HOUR + 40 * MIN });
  const bC = book(12, 1, t - 3 * DAY - 4 * HOUR, 2, { status: "completed", inAt: t - 3 * DAY - 4 * HOUR, outAt: t - 3 * DAY - 2 * HOUR });
  const bD = book(4, 2, t - 2 * DAY - 3 * HOUR, 2, { status: "completed", inAt: t - 2 * DAY - 3 * HOUR, outAt: t - 2 * DAY - HOUR });
  book(3, 1, t - 4 * DAY - 6 * HOUR, 3, { status: "completed", inAt: t - 4 * DAY - 6 * HOUR, outAt: t - 4 * DAY - 3 * HOUR });
  book(1, 2, t - 5 * DAY - 8 * HOUR, 4, { status: "completed", inAt: t - 5 * DAY - 8 * HOUR, outAt: t - 5 * DAY - 4 * HOUR });
  const bG = book(2, 3, t - 6 * DAY - 7 * HOUR, 2, { status: "completed", inAt: t - 6 * DAY - 7 * HOUR, outAt: t - 6 * DAY - 5 * HOUR + 25 * MIN });
  book(8, 1, t - 1 * DAY - 2 * HOUR, 1, { status: "completed", inAt: t - DAY - 2 * HOUR, outAt: t - DAY - HOUR });
  book(10, 3, t - 2 * DAY - 10 * HOUR, 2, { status: "completed", inAt: t - 2 * DAY - 10 * HOUR, outAt: t - 2 * DAY - 8 * HOUR });
  book(1, 3, t - 3 * DAY - 2 * HOUR, 2, { status: "completed", inAt: t - 3 * DAY - 2 * HOUR, outAt: t - 3 * DAY + 20 * MIN });

  // Cancelled + no-show
  book(10, 1, t + 2 * DAY, 2, { status: "cancelled", cancelledBy: "driver", created: t - 2 * DAY });
  book(1, 3, t - 1 * DAY + 2 * HOUR, 2, { status: "cancelled", cancelledBy: "driver-late", created: t - DAY + 2 * HOUR - 30 * MIN });
  book(11, 3, t - 1 * DAY - 13 * HOUR, 1, { status: "cancelled", cancelledBy: "driver-late", created: t - DAY - 13 * HOUR - 20 * MIN });
  book(12, 3, t - 2 * DAY - 5 * HOUR, 2, { status: "no_show" });

  // Happening now
  book(11, 2, t - 1 * HOUR, 2, { status: "live", inAt: t - 58 * MIN });
  book(1, 1, t - 3 * HOUR, 2.5, { status: "live", inAt: t - 3 * HOUR + 4 * MIN }); // overstaying ~30 min
  book(8, 1, t + 3 * HOUR, 2, { status: "confirmed", created: t - HOUR });
  book(4, 2, t + 20 * MIN, 1, { status: "confirmed", created: t - 2 * HOUR });
  book(5, 3, t + 4 * HOUR, 2, { status: "requested", created: t - 3 * MIN });

  // Reviews (driver -> spot/owner, owner -> driver)
  const insR = d.prepare("INSERT INTO reviews (booking_id, from_user, to_user, spot_id, stars, text, hidden, created_at) VALUES (?,?,?,?,?,?,0,?)");
  insR.run(bA, 1, 4, 2, 5, "Spacious bay and the guard helped me reverse in. Charger worked great.", t - DAY);
  insR.run(bB, 2, 7, 4, 4, "Covered and safe. Lane is narrow but fine for a bike.", t - DAY);
  insR.run(bD, 2, 7, 4, 3, "Entry was blocked by a cart for a few minutes.", t - 2 * DAY);
  insR.run(bG, 3, 4, 2, 1, "Owner is a total SCAM!!! worst people ever, call 98xxxxxx for real parking", t - 6 * DAY);
  insR.run(bC, 1, 4, 12, 4, "Huge yard, easy for my SUV.", t - 3 * DAY);
  insR.run(bA, 4, 1, null, 5, "Punctual and careful driver.", t - DAY);
  insR.run(bB, 7, 2, null, 4, "Left 40 min late but paid overtime automatically.", t - DAY);
  d.prepare("UPDATE bookings SET driver_reviewed = 1 WHERE id IN (?,?,?,?,?)").run(bA, bB, bD, bG, bC);
  d.prepare("UPDATE bookings SET owner_rated = 1 WHERE id IN (?,?)").run(bA, bB);
  for (const u of [1, 2, 4, 7]) {
    const r = d.prepare("SELECT AVG(stars) a, COUNT(*) n FROM reviews WHERE to_user = ? AND hidden = 0").get(u) as { a: number; n: number };
    d.prepare("UPDATE users SET rating = ?, rating_count = ? WHERE id = ?").run(r.a ?? 0, r.n, u);
  }

  d.prepare("INSERT INTO disputes (booking_id, raised_by, reason, status, created_at) VALUES (?,?,?,?,?)").run(
    bC, 1, "Gate was locked for 20 minutes when I arrived. Please refund part of the booking.", "open", t - 3 * DAY + HOUR
  );
  d.prepare("UPDATE users SET fraud_score = 2 WHERE id = 3").run();
  d.prepare("UPDATE users SET fraud_score = 1 WHERE id = 6").run();

  d.prepare("INSERT INTO favourites (user_id, spot_id) VALUES (1,2),(1,10),(2,4),(3,8)").run();

  const n = (u: number, text: string, kind: string, link: string | null, ago: number) => notify(d, u, text, kind, link, t - ago);
  n(1, "Welcome to Summit Parking! Your wallet has demo money to try bookings.", "info", "/wallet", 7 * DAY);
  n(1, "You're 20+ min past your booking at Sunny Driveway — overtime is being charged.", "warning", "/driver/bookings", 5 * MIN);
  n(4, "Riya is overstaying at Sunny Driveway. Overtime will be auto-charged at checkout.", "warning", "/owner", 5 * MIN);
  n(7, "New booking request from Sana for HSR Sector 2 Garage.", "booking", "/owner", 3 * MIN);
  n(7, "27th Main Corner Plot submitted for verification.", "info", "/owner/listings", 2 * HOUR);
  n(6, "Your listing Old Airport Road Lane was rejected. Tap to see why.", "error", "/owner/listings", 2 * DAY);
  n(8, "1 listing is waiting for verification.", "info", "/admin/verify", 2 * HOUR);
  n(8, "New dispute raised by Riya on booking at Sony Signal Van Yard.", "warning", "/admin/disputes", 3 * DAY);
  n(5, "Welcome, Kiran! List your first spot to start earning.", "info", "/owner/new", HOUR);

  // Opening balances: top up so each wallet lands on a friendly demo number, then rebuild running balances.
  const target: Record<number, number> = { 1: 150, 2: 800, 3: 500, 4: 0, 5: 0, 6: 0, 7: 0, 8: 5000 };
  for (const [id, want] of Object.entries(target)) {
    const { wallet } = d.prepare("SELECT wallet FROM users WHERE id = ?").get(Number(id)) as { wallet: number };
    const role = users.find((u) => u[0] === Number(id))![2];
    const delta = role === "owner" ? 0 : want - wallet;
    if (delta !== 0) credit(d, Number(id), delta, "topup", null, "Opening demo balance", t - 8 * DAY);
  }
  const txs = d.prepare("SELECT id, user_id, amount FROM transactions ORDER BY created_at, id").all() as { id: number; user_id: number; amount: number }[];
  const run: Record<number, number> = {};
  const upd = d.prepare("UPDATE transactions SET balance_after = ? WHERE id = ?");
  for (const tx of txs) {
    run[tx.user_id] = (run[tx.user_id] ?? 0) + tx.amount;
    upd.run(run[tx.user_id], tx.id);
  }
}
