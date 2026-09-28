import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { seed } from "./seed";

const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "parking.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, tagline TEXT,
  avatar_color TEXT, wallet REAL NOT NULL DEFAULT 0, rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0, suspended INTEGER NOT NULL DEFAULT 0,
  fraud_score INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, label TEXT NOT NULL, plate TEXT,
  type TEXT NOT NULL, fuel TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL, title TEXT NOT NULL, address TEXT NOT NULL,
  zone TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, photo TEXT, photo_hidden INTEGER NOT NULL DEFAULT 0,
  spot_type TEXT NOT NULL, size TEXT NOT NULL, road_width TEXT NOT NULL, covered INTEGER NOT NULL DEFAULT 0,
  amenities TEXT NOT NULL DEFAULT '[]', price REAL NOT NULL, open_from INTEGER NOT NULL DEFAULT 0,
  open_to INTEGER NOT NULL DEFAULT 24, open_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  blocked_dates TEXT NOT NULL DEFAULT '[]', mode TEXT NOT NULL DEFAULT 'instant',
  status TEXT NOT NULL DEFAULT 'pending', reject_reason TEXT, paused INTEGER NOT NULL DEFAULT 0,
  description TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY, spot_id INTEGER NOT NULL, kind TEXT NOT NULL, file_name TEXT NOT NULL,
  data_url TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, spot_id INTEGER NOT NULL, driver_id INTEGER NOT NULL, vehicle_id INTEGER,
  start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, base REAL NOT NULL, surge REAL NOT NULL DEFAULT 1,
  fee REAL NOT NULL DEFAULT 0, total REAL NOT NULL, commission_pct REAL NOT NULL, code TEXT NOT NULL,
  status TEXT NOT NULL, checked_in_at INTEGER, checked_out_at INTEGER, extended_min INTEGER NOT NULL DEFAULT 0,
  overtime_min INTEGER NOT NULL DEFAULT 0, overtime_amount REAL NOT NULL DEFAULT 0,
  refund_amount REAL NOT NULL DEFAULT 0, owner_payout REAL NOT NULL DEFAULT 0, cancelled_by TEXT,
  driver_reviewed INTEGER NOT NULL DEFAULT 0, owner_rated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, booking_id INTEGER, type TEXT NOT NULL,
  amount REAL NOT NULL, balance_after REAL NOT NULL, note TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL, from_user INTEGER NOT NULL, to_user INTEGER NOT NULL,
  spot_id INTEGER, stars INTEGER NOT NULL, text TEXT, hidden INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS favourites (user_id INTEGER NOT NULL, spot_id INTEGER NOT NULL, PRIMARY KEY (user_id, spot_id));
CREATE TABLE IF NOT EXISTS disputes (
  id INTEGER PRIMARY KEY, booking_id INTEGER NOT NULL, raised_by INTEGER NOT NULL, reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', resolution TEXT, refund REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'info',
  link TEXT, read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

type G = typeof globalThis & { __parkingDb?: Database.Database };
const g = globalThis as G;

export function db(): Database.Database {
  if (!g.__parkingDb) {
    fs.mkdirSync(DIR, { recursive: true });
    const d = new Database(FILE);
    d.pragma("journal_mode = WAL");
    d.exec(SCHEMA);
    const { n } = d.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    if (n === 0) d.transaction(() => seed(d))();
    g.__parkingDb = d;
  }
  return g.__parkingDb;
}

export function resetDb() {
  g.__parkingDb?.close();
  g.__parkingDb = undefined;
  for (const f of [FILE, FILE + "-wal", FILE + "-shm"]) fs.rmSync(f, { force: true });
  db();
}
