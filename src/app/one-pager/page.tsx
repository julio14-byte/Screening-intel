import type { Metadata } from "next";
import { OnePagerDocument } from "@/components/one-pager/OnePagerDocument";
import { OnePagerPrintBar } from "@/components/one-pager/OnePagerPrintBar";
import {
  onePagerCopy,
  parseOnePagerLang,
} from "@/config/onePager";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const copy = onePagerCopy[parseOnePagerLang(sp.lang)];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function OnePagerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const lang = parseOnePagerLang(sp.lang);
  const copy = onePagerCopy[lang];

  return (
    <div className="px-3 py-6 print:p-0 sm:px-6 sm:py-8">
      <OnePagerPrintBar lang={lang} copy={copy} />
      <OnePagerDocument copy={copy} />
    </div>
  );
}
