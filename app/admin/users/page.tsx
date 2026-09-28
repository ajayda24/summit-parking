"use client";

import { motion } from "framer-motion";
import { Ban, LogIn, RotateCcw, Star } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { Avatar, Badge, Button, Chip, PageTitle, Skeleton, useLoader } from "@/components/ui";
import { api } from "@/lib/client";
import { inr } from "@/lib/shared";

type U = { id: number; name: string; role: string; tagline: string; avatar_color: string; wallet: number; rating: number; rating_count: number; suspended: number; fraud_score: number; bookings: number; spots: number };

function UsersPage() {
  const { me, switchTo, toast, refresh } = useApp();
  const { data, reload } = useLoader<U[]>(() => api("admin/users"), [me?.user.id]);
  const [role, setRole] = useState<"all" | "driver" | "owner" | "admin">("all");
  const [q, setQ] = useState("");
  const list = (data ?? []).filter((u) => (role === "all" || u.role === role) && u.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle kicker="People" title="Users" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "driver", "owner", "admin"] as const).map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>
            <span className="capitalize">{r === "all" ? "Everyone" : `${r}s`}</span>
          </Chip>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name…" className="ml-auto rounded-full bg-white px-4 py-2 text-sm ring-1 ring-road-dark/60" />
      </div>
      {!data && <Skeleton className="h-64" />}
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-widest text-muted">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Activity</th>
                <th className="p-4">Rating</th>
                <th className="p-4 text-right">Wallet</th>
                <th className="p-4">Risk</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={`border-t border-road ${u.suspended ? "bg-rose/30" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatar_color} size={34} />
                      <div>
                        <div className="font-bold">{u.name} {u.suspended ? <Badge color="rose">Suspended</Badge> : null}</div>
                        <div className="text-xs text-muted">{u.tagline}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><Badge color={u.role === "driver" ? "sky" : u.role === "owner" ? "lavender" : "butter"}>{u.role}</Badge></td>
                  <td className="p-4 text-xs">{u.role === "driver" ? `${u.bookings} bookings` : u.role === "owner" ? `${u.spots} spots` : "—"}</td>
                  <td className="p-4 text-xs">{u.rating_count ? <span className="flex items-center gap-1 font-bold"><Star className="h-3 w-3 fill-butter-deep text-butter-deep" />{u.rating.toFixed(1)} ({u.rating_count})</span> : "—"}</td>
                  <td className={`p-4 text-right font-bold ${u.wallet < 0 ? "text-coral-deep" : ""}`}>{inr(u.wallet)}</td>
                  <td className="p-4">{u.fraud_score > 0 ? <Badge color={u.fraud_score > 1 ? "rose" : "butter"}>⚑ {u.fraud_score}</Badge> : <span className="text-xs text-muted">—</span>}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      {u.id !== me?.user.id && (
                        <Button size="sm" variant="soft" onClick={() => switchTo(u.id)} title="Log in as this user">
                          <LogIn className="h-3.5 w-3.5" /> Log in as
                        </Button>
                      )}
                      {u.role !== "admin" && (
                        <Button
                          size="sm"
                          variant={u.suspended ? "soft" : "danger"}
                          onClick={async () => {
                            const r = await api(`admin/users/${u.id}/suspend`, {});
                            toast(r.suspended ? `${u.name} suspended` : `${u.name} restored`, r.suspended ? "warning" : "success");
                            reload();
                            refresh();
                          }}
                        >
                          {u.suspended ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />} {u.suspended ? "Restore" : "Suspend"}
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="admin">
      <UsersPage />
    </RoleGate>
  );
}
