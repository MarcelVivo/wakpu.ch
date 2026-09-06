export function ProductVisual({ index = 0, compact = false }: { index?: number; compact?: boolean }) {
  return <div className={`product-visual product-visual-${index % 3}${compact ? " compact" : ""}`} aria-hidden="true">
    <div className="wax-ball wax-ball-main"><svg viewBox="0 0 200 200"><path d="M51 10L68 39L60 54L89 77L72 107L99 135L87 155L105 194M89 77L120 65L132 33M72 107L42 111L20 139M99 135L141 125L167 151M141 125L152 92L183 81" /></svg></div>
    {index > 0 && <><div className="wax-ball wax-ball-secondary"><svg viewBox="0 0 200 200"><path d="M97 2L80 41L95 79L79 111L93 147L84 190M95 79L133 78L151 49M79 111L41 109L16 141" /></svg></div><div className="wax-ball wax-ball-third" /></>}
    {index > 1 && <><div className="wax-ball wax-ball-fourth" /><div className="wax-ball wax-ball-fifth" /><div className="wax-ball wax-ball-sixth" /></>}
  </div>;
}
