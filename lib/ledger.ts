import type { DB } from "./sqlite";

type D = DB;

export const PLATFORM_ID = 8; // Ops Admin holds the platform / escrow wallet

export type TxType =
  | "topup"
  | "withdraw"
  | "booking_hold"
  | "extension"
  | "overtime"
  | "payout"
  | "commission"
  | "refund"
  | "compensation"
  | "dispute_refund";

export function credit(d: D, userId: number, amount: number, type: TxType, bookingId: number | null, note: string, at: number) {
  d.prepare("UPDATE users SET wallet = wallet + ? WHERE id = ?").run(amount, userId);
  const { wallet } = d.prepare("SELECT wallet FROM users WHERE id = ?").get(userId) as { wallet: number };
  d.prepare(
    "INSERT INTO transactions (user_id, booking_id, type, amount, balance_after, note, created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(userId, bookingId, type, amount, wallet, note, at);
}

/** Moves money between two wallets, writing one ledger row on each side. */
export function transfer(d: D, from: number, to: number, amount: number, type: TxType, bookingId: number | null, note: string, at: number) {
  if (amount <= 0) return;
  credit(d, from, -amount, type, bookingId, note, at);
  credit(d, to, amount, type, bookingId, note, at);
}

export function notify(d: D, userId: number, text: string, kind: string, link: string | null, at: number) {
  d.prepare("INSERT INTO notifications (user_id, text, kind, link, created_at) VALUES (?,?,?,?,?)").run(userId, text, kind, link, at);
}

export function getSetting<T>(d: D, key: string, fallback: T): T {
  const row = d.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export function setSetting(d: D, key: string, value: unknown) {
  d.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
}

/** Settles a completed booking: owner gets base minus commission, platform keeps commission + fee. */
export function payOwner(d: D, bookingId: number, ownerId: number, gross: number, commissionPct: number, label: string, at: number) {
  if (gross <= 0) return 0;
  const commission = Math.round((gross * commissionPct) / 100);
  const net = gross - commission;
  transfer(d, PLATFORM_ID, ownerId, net, "payout", bookingId, `${label} (after ${commissionPct}% commission)`, at);
  return net;
}

export function bookingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "SP-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
