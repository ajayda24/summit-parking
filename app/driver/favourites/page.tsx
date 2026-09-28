"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { RoleGate } from "@/components/AppShell";
import { EmptyRoad } from "@/components/illustrations";
import { SpotCard, type SpotLite } from "@/components/SpotCard";
import { Button, PageTitle, Skeleton, useLoader } from "@/components/ui";
import { api } from "@/lib/client";
import type { VehicleType } from "@/lib/shared";

function Favs() {
  const { me, toast } = useApp();
  const { data, setData } = useLoader<SpotLite[]>(() => api("spots"), [me?.user.id]);
  const vehicle = me?.vehicles.find((v) => v.active)?.type as VehicleType | undefined;
  const favs = (data ?? []).filter((s) => s.fav);
  return (
    <div>
      <PageTitle kicker="Saved" title="Favourite spots" />
      {!data && <Skeleton className="h-64" />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {favs.map((s, i) => (
            <SpotCard
              key={s.id}
              index={i}
              spot={s}
              vehicle={vehicle}
              onFav={async () => {
                await api(`favourites/${s.id}`, {});
                setData((d) => d && d.map((x) => (x.id === s.id ? { ...x, fav: false } : x)));
                toast("Removed from favourites", "info");
              }}
            />
          ))}
        </AnimatePresence>
      </div>
      {data && favs.length === 0 && (
        <EmptyRoad title="No favourites yet" text="Tap the heart on any spot to keep it handy for next time.">
          <Link href="/driver">
            <Button>Browse spots</Button>
          </Link>
        </EmptyRoad>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RoleGate role="driver">
      <Favs />
    </RoleGate>
  );
}
