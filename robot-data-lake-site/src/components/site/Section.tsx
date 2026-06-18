export default function Section({
  id,
  index,
  eyebrow,
  title,
  dark,
  children,
}: {
  id?: string;
  index: string;
  eyebrow?: string;
  title: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={dark ? "on-navy bg-navy text-white/85" : "bg-surface text-ink"}>
      <div className="container-x py-16 md:py-24">
        <header className={`mb-10 border-b pb-5 ${dark ? "border-white/15" : "border-line"}`}>
          <div className="eyebrow">{index}{eyebrow ? ` · ${eyebrow}` : ""}</div>
          <h2 className="mt-2 text-3xl md:text-4xl text-balance">{title}</h2>
        </header>
        {children}
      </div>
    </section>
  );
}
