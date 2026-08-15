import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import config from "@/config";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${config.app.name} · Pre-screening para research sites`,
  description: config.app.description,
};

export default async function HomePage() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
