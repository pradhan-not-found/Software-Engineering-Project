"use client";

import OrgChart from "@/components/org/OrgChart";
import { PageHeader } from "@/components/ui";

export default function EmployeeOrgChartPage() {
  return (
    <>
      <PageHeader title="Org Chart" subtitle="See who reports to whom and where you fit in." />
      <OrgChart variant="employee" />
    </>
  );
}
