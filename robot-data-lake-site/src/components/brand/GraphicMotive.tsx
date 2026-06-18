export default function GraphicMotive({
  className = "",
  tone = "navy",
}: {
  className?: string;
  tone?: "navy" | "light";
}) {
  const bars = [{w:120,o:0.9},{w:64,o:0.55},{w:150,o:0.75},{w:40,o:0.4},{w:96,o:0.6},{w:132,o:0.85},{w:56,o:0.5},{w:108,o:0.7}];
  const base = tone === "navy" ? "#6f8fd0" : "#ffffff";
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      {bars.map((b,i)=>(<rect key={i} x={160-b.w} y={i*15+2} width={b.w} height={9} rx={1.5} fill={base} opacity={b.o} />))}
    </svg>
  );
}
