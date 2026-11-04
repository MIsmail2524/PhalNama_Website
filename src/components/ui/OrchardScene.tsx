/**
 * Illustrated orchard used wherever a real photograph has not been uploaded yet.
 * It is clearly an illustration — it never pretends to be a photo of our farms.
 */
type Props = { className?: string; variant?: "dawn" | "day" | "dusk"; label?: string; seed?: number };

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const PALETTES = {
  dawn: { sky1: "#F8F5EC", sky2: "#F2D3B0", sun: "#D98232", far: "#8FA898", mid: "#4A7362", near: "#173E30", ground: "#EDE5D6" },
  day: { sky1: "#F8F5EC", sky2: "#EDE5D6", sun: "#E7B26F", far: "#A9BBAF", mid: "#4A7362", near: "#21503F", ground: "#DCD1BD" },
  dusk: { sky1: "#21503F", sky2: "#D98232", sun: "#F2D3B0", far: "#2c5444", mid: "#173E30", near: "#0B1F17", ground: "#10291F" },
};

export function OrchardScene({ className, variant = "dawn", label, seed = 7 }: Props) {
  const p = PALETTES[variant];
  const r = rand(seed);
  const rows = [
    { y: 330, scale: 0.45, color: p.far, count: 22, fruit: 0.15 },
    { y: 400, scale: 0.7, color: p.mid, count: 15, fruit: 0.45 },
    { y: 520, scale: 0.95, color: p.near, count: 11, fruit: 0.7 },
  ];
  const id = `sky-${variant}-${seed}`;
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={label ?? "Illustration of a citrus orchard"}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky1} />
          <stop offset="1" stopColor={p.sky2} />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill={`url(#${id})`} />
      <circle cx="860" cy="250" r="70" fill={p.sun} opacity="0.85" />
      <path d="M0 340 C 200 310, 420 320, 600 335 S 1000 315, 1200 330 V600 H0Z" fill={p.ground} opacity="0.6" />
      {rows.map((row, ri) => {
        const gap = 1200 / (row.count - 1);
        return (
          <g key={ri}>
            {Array.from({ length: row.count }).map((_, i) => {
              const x = i * gap + (r() - 0.5) * gap * 0.3;
              const s = row.scale * (0.85 + r() * 0.3);
              const cw = 46 * s;
              const ch = 40 * s;
              const top = row.y - 60 * s;
              const fruits = Array.from({ length: Math.round(6 * row.fruit) }).map(() => ({
                fx: x + (r() - 0.5) * cw * 1.4,
                fy: top + (r() - 0.3) * ch * 1.1,
              }));
              return (
                <g key={i}>
                  <rect x={x - 2.5 * s} y={top + ch * 0.6} width={5 * s} height={60 * s - ch * 0.6} fill={row.color} />
                  <ellipse cx={x} cy={top} rx={cw} ry={ch} fill={row.color} />
                  <ellipse cx={x - cw * 0.45} cy={top + ch * 0.25} rx={cw * 0.6} ry={ch * 0.7} fill={row.color} />
                  <ellipse cx={x + cw * 0.5} cy={top + ch * 0.2} rx={cw * 0.55} ry={ch * 0.65} fill={row.color} />
                  {fruits.map((f, k) => (
                    <circle key={k} cx={f.fx} cy={f.fy} r={3.6 * s} fill="#D98232" opacity={0.9} />
                  ))}
                </g>
              );
            })}
          </g>
        );
      })}
      <path d="M0 520 C 300 500, 900 505, 1200 520 V600 H0Z" fill={p.near} />
    </svg>
  );
}
