import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-md shadow-violet-500/25",
        className
      )}
    >
      <Activity className="h-[55%] w-[55%]" aria-hidden />
    </span>
  );
}
