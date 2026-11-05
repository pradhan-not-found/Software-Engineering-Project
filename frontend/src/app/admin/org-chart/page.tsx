"use client";

import OrgChart from "@/components/org/OrgChart";
import { PageHeader } from "@/components/ui";

export default function AdminOrgChartPage() {
  return (
    <>
      <PageHeader title="Org Chart" subtitle="Reporting hierarchy across the organization. Click anyone to open their record." />
      <OrgChart variant="admin" />
    </>
  );
}
