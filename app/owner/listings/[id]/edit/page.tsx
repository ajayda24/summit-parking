"use client";

import { useParams } from "next/navigation";
import { RoleGate } from "@/components/AppShell";
import { ListingWizard } from "@/components/ListingWizard";
import { PageTitle, Skeleton, useLoader } from "@/components/ui";
import { api } from "@/lib/client";

function Edit() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useLoader<any>(() => api(`owner/spots/${id}`), [id]);
  if (error) return <div className="rounded-3xl bg-rose p-6 font-bold text-coral-deep">{error}</div>;
  if (!data) return <Skeleton className="h-96" />;
  const { documents, status, reject_reason, ...rest } = data;
  return (
    <>
      <PageTitle kicker="Edit listing" title={data.title} />
      <ListingWizard initial={{ ...rest, covered: !!rest.covered }} spotId={data.id} status={status} rejectReason={status === "rejected" ? reject_reason : null} />
    </>
  );
}

export default function Page() {
  return (
    <RoleGate role="owner">
      <Edit />
    </RoleGate>
  );
}
