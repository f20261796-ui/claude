export default function Marquee({
  items,
  className = "",
  itemClassName = "",
  duration = 28,
  reverse = false,
  separator = "✦",
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
  duration?: number;
  reverse?: boolean;
  separator?: string;
}) {
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {items.map((t, i) => (
        <span key={i} className={`flex items-center whitespace-nowrap ${itemClassName}`}>
          {t}
          <span className="mx-[0.5em] text-[0.5em] text-blood">{separator}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <span className="sr-only">{items.join(" ")}</span>
      <div
        className={`marquee-track ${reverse ? "reverse" : ""}`}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {row}
        {row}
      </div>
    </div>
  );
}
