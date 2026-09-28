"use client";

import { Bar, BarChart as RBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr } from "@/lib/shared";

/** Single-series bar chart: one hue, thin rounded bars, recessive grid, hover tooltip. */
export function BarChart<T extends Record<string, unknown>>({ data, x, y, color = "#4263D6", money = true, label }: { data: T[]; x: keyof T; y: keyof T; color?: string; money?: boolean; label: string }) {
  const fmt = (v: number) => (money ? inr(v) : String(v));
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer>
        <RBarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEEEE9" />
          <XAxis dataKey={x as string} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B6F86", fontWeight: 700 }} />
          <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11, fill: "#6B6F86" }} tickFormatter={(v) => fmt(Number(v))} />
          <Tooltip
            cursor={{ fill: "rgba(43,45,66,0.05)", radius: 8 }}
            contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 10px 30px -12px rgba(43,45,66,.3)", fontWeight: 700, fontSize: 12 }}
            formatter={(v) => [fmt(Number(v)), label]}
          />
          <Bar dataKey={y as string} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} animationDuration={900} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
