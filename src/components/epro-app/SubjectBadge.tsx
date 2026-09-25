export function SubjectBadge({ code }: { code: string }) {
  return (
    <p className="rounded-full bg-violet-100 px-3 py-1 text-center text-sm font-semibold tracking-wide text-indigo-950">
      Sujeto {code}
    </p>
  );
}
