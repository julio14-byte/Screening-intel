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

  if (link.href.startsWith("#")) {
    return (
      <a href={link.href} className={className}>
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8 shrink-0" />
              <span className="text-base font-bold text-white sm:text-lg">
                {config.brand.logoText}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-violet-300">
              {tagline}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="min-w-0">
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 sm:flex-col sm:gap-y-2">
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

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-violet-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>
            © {new Date().getFullYear()} {config.brand.logoText}
          </span>
          <span>Screening Intelligence MVP</span>
        </div>
      </div>
    </footer>
  );
}
