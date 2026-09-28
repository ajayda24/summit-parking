// Pure constants + rules shared by server and client.

export type Role = "driver" | "owner" | "admin";
export type VehicleType = "bike" | "hatchback" | "sedan" | "suv" | "van";
export type Fuel = "petrol" | "diesel" | "cng" | "ev";
export type Size = "S" | "M" | "L" | "XL";
export type RoadWidth = "narrow" | "normal" | "wide";
export type BookingStatus =
  | "requested"
  | "confirmed"
  | "live"
  | "completed"
  | "cancelled"
  | "declined"
  | "no_show";

export const MIN = 60_000;
export const HOUR = 60 * MIN;

export const VEHICLES: { type: VehicleType; label: string; needs: Size }[] = [
  { type: "bike", label: "Bike", needs: "S" },
  { type: "hatchback", label: "Hatchback", needs: "M" },
  { type: "sedan", label: "Sedan", needs: "M" },
  { type: "suv", label: "SUV", needs: "L" },
  { type: "van", label: "Van", needs: "XL" },
];

export const FUELS: { type: Fuel; label: string }[] = [
  { type: "petrol", label: "Petrol" },
  { type: "diesel", label: "Diesel" },
  { type: "cng", label: "CNG" },
  { type: "ev", label: "Electric" },
];

export const SIZES: { size: Size; label: string; hint: string }[] = [
  { size: "S", label: "Small", hint: "2-wheelers" },
  { size: "M", label: "Medium", hint: "Hatchback / sedan" },
  { size: "L", label: "Large", hint: "SUV" },
  { size: "XL", label: "Extra large", hint: "Van / tempo" },
];

export const SPOT_TYPES = ["driveway", "plot", "basement", "shopfront"] as const;
export const AMENITIES = ["ev_charger", "cctv", "guard", "24x7", "wash"] as const;
export const AMENITY_LABEL: Record<string, string> = {
  ev_charger: "EV charger",
  cctv: "CCTV",
  guard: "Security guard",
  "24x7": "24×7 access",
  wash: "Car wash",
};

export const ZONES: Record<string, { lat: number; lng: number }> = {
  Koramangala: { lat: 12.9352, lng: 77.6245 },
  Indiranagar: { lat: 12.9719, lng: 77.6412 },
  HSR: { lat: 12.9116, lng: 77.6474 },
};

/** Mock "you are here" for the driver. */
export const HERE = { lat: 12.9345, lng: 77.6268 };

const SIZE_RANK: Record<Size, number> = { S: 0, M: 1, L: 2, XL: 3 };

export function vehicleNeeds(type: VehicleType): Size {
  return VEHICLES.find((v) => v.type === type)?.needs ?? "M";
}

export function fits(vehicle: VehicleType, spotSize: Size) {
  return SIZE_RANK[spotSize] >= SIZE_RANK[vehicleNeeds(vehicle)];
}

export function narrowWarning(vehicle: VehicleType, road: RoadWidth) {
  return road === "narrow" && (vehicle === "suv" || vehicle === "van");
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type SurgeRule = { zone: string; from: number; to: number; mult: number };

export function surgeFor(rules: SurgeRule[], zone: string, startAt: number) {
  const h = new Date(startAt).getHours();
  const r = rules.find((r) => r.zone === zone && h >= r.from && h < r.to);
  return r ? r.mult : 1;
}

export const FEE = 5;
export const GRACE_MIN = 10;
export const OVERTIME_BLOCK_MIN = 15;
export const OVERTIME_MULT = 1.5;

export function quote(pricePerHour: number, startAt: number, endAt: number, surge: number) {
  const hours = Math.max(0, (endAt - startAt) / HOUR);
  const base = Math.round(hours * pricePerHour * surge);
  return { hours, base, fee: FEE, total: base + FEE };
}

/** Overtime charge for a checkout at `at` for a booking ending at `endAt`. */
export function overtime(pricePerHour: number, endAt: number, at: number) {
  const over = Math.max(0, at - endAt);
  const minutes = Math.floor(over / MIN);
  if (minutes <= GRACE_MIN) return { minutes, blocks: 0, amount: 0 };
  const blocks = Math.ceil(minutes / OVERTIME_BLOCK_MIN);
  const amount = Math.round(blocks * (OVERTIME_BLOCK_MIN / 60) * pricePerHour * OVERTIME_MULT);
  return { minutes, blocks, amount };
}

/** Driver-initiated cancellation refund policy. */
export function refundPolicy(status: BookingStatus, startAt: number, at: number, base: number, total: number) {
  if (status === "requested") return { refund: total, owner: 0, label: "Full refund (request not accepted yet)" };
  const lead = startAt - at;
  if (lead >= HOUR) return { refund: total, owner: 0, label: "Full refund (1 hr+ before start)" };
  if (lead > 0) {
    const half = Math.round(base / 2);
    return { refund: half, owner: base - half, label: "50% refund (less than 1 hr before start)" };
  }
  return { refund: 0, owner: Math.round(base / 2), label: "No refund (booking already started)" };
}

export function inr(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}
