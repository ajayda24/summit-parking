"use client";

import { RoleGate } from "@/components/AppShell";
import { ListingWizard } from "@/components/ListingWizard";
import { PageTitle } from "@/components/ui";

export default function NewListing() {
  return (
    <RoleGate role="owner">
      <PageTitle kicker="Earn from unused space" title="List your parking spot" />
      <ListingWizard />
    </RoleGate>
  );
}
