import Link from "next/link";
import config from "@/config";
import { Logo } from "@/components/Logo";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

function FooterLinkItem({
  link,
  className,
}: {
  link: FooterLink;
  className?: string;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function MarketingFooter() {
  const { tagline, columns } = config.landing.footer;

  return (
    <footer className="border-t border-white/10 bg-indigo-950/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-bold text-white">
                {config.brand.logoText}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-violet-300">{tagline}</p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem
                      link={link}
                      className="text-sm text-violet-400 transition-colors hover:text-violet-200"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-violet-500 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} {config.brand.logoText}
          </span>
          <span>Patrón VibeFast · Screening Intelligence MVP</span>
        </div>
      </div>
    </footer>
  );
}
