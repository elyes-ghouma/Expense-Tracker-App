import React from "react";
import { Redirect } from "expo-router";
import { useSettings } from "@/hooks/useAppData";
export default function Index() {
  const q = useSettings();
  if (q.isPending) return null;
  return (
    <Redirect
      href={q.data?.onboarding_done === "1" ? "/(tabs)" : "/onboarding"}
    />
  );
}
