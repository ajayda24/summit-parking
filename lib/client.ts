"use client";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, data.error || "Request failed");
  return data as T;
}

export const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const fmtDateTime = (ms: number) => `${fmtDate(ms)}, ${fmtTime(ms)}`;

export function ago(ms: number, now: number) {
  const s = Math.round((now - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function duration(ms: number) {
  const neg = ms < 0;
  ms = Math.abs(ms);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const str = h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  return neg ? `-${str}` : str;
}

export function fileToDataUrl(file: File, maxBytes = 1_200_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes * 4) return reject(new Error("File is too large (max ~5 MB)"));
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (!file.type.startsWith("image/") || file.size <= maxBytes) return resolve(url);
      // Downscale large images so they fit comfortably in SQLite.
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
