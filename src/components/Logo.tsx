import config from "@/config";
import { cn } from "@/lib/utils";

const MARK_SRC = "/brand/crisvia-mark.svg";

type LogoProps = {
  className?: string;
  /** Vacío cuando el nombre Crisvia ya está al lado. */
  alt?: string;
};

export function Logo({ className, alt = "" }: LogoProps) {
  return (
    // SVG estático en /public: no hace falta next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={config.brand.logoSrc || MARK_SRC}
      alt={alt}
      className={cn("inline-block h-8 w-8 shrink-0 rounded-[22%]", className)}
    />
  );
}
