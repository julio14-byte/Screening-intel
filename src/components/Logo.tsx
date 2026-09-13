import { cn } from "@/lib/utils";

/** Isotipo: pulso clínico que se abre en dos vías (matching + re-match). */
export function CrisviaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4.5 25.5h8.4l2.4-3 4.6-10.2 4.4 18.4 3.2-8.2H31"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 25.5c5.4 0 8.6-8.4 12.4-13.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M31 25.5c5.4 0 8.6 8.4 12.4 13.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-md shadow-violet-500/25",
        className
      )}
    >
      <CrisviaMark className="h-[62%] w-[62%]" />
    </span>
  );
}
