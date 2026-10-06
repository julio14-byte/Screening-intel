import { redirect } from "next/navigation";

/** Telemetría ESP32 no es producto. No mostrar datos simulados. */
export default function DevicesPage() {
  redirect("/dashboard");
}
