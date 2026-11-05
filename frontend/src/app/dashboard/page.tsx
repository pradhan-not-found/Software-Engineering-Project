"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { isAdminRole } from "@/lib/utils";
import { FullPageLoader } from "@/components/ui";

/** Role dispatcher: sends the signed-in user to the right workspace. */
export default function DashboardRedirect() {
  const { ready, user } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(isAdminRole(user.role) ? "/admin" : "/employee");
  }, [ready, user, router]);
  return <FullPageLoader />;
}
