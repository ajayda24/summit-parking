"use client";

import { motion } from "framer-motion";

const ROAD_PATH = "M -40 250 C 160 250, 220 120, 420 130 S 700 260, 900 200 S 1180 90, 1300 120";

function Tree({ x, y, s = 1, c = "#BDEBD6" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="0" width="6" height="18" rx="3" fill="#d9b99b" />
      <circle cx="0" cy="-8" r="18" fill={c} />
      <circle cx="-9" cy="-2" r="11" fill={c} opacity=".85" />
    </g>
  );
}

function House({ x, y, c, roof }: { x: number; y: number; c: string; roof: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="70" height="52" rx="6" fill={c} />
      <path d="M -6 4 L 35 -30 L 76 4 Z" fill={roof} />
      <rect x="10" y="14" width="16" height="14" rx="3" fill="#fff" />
      <rect x="44" y="24" width="16" height="28" rx="3" fill="#fff" opacity=".85" />
    </g>
  );
}

export function CarSide({ color = "#FF7A6B", className = "" }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 56" className={className}>
      <path d="M10 36 C10 26 18 22 28 21 L40 9 C43 6 47 5 51 5 L78 5 C83 5 87 7 90 11 L100 22 C108 23 114 28 114 36 L114 40 C114 43 112 45 109 45 L14 45 C11 45 10 43 10 40 Z" fill={color} />
      <path d="M45 11 L52 10 L60 10 L60 22 L36 22 Z M66 10 L78 10 C81 10 83 11 85 13 L93 22 L66 22 Z" fill="#fff" opacity=".9" />
      <circle cx="33" cy="45" r="9" fill="#2B2D42" />
      <circle cx="33" cy="45" r="4" fill="#E6E8EF" />
      <circle cx="92" cy="45" r="9" fill="#2B2D42" />
      <circle cx="92" cy="45" r="4" fill="#E6E8EF" />
      <rect x="106" y="28" width="7" height="4" rx="2" fill="#FFF1B8" />
    </svg>
  );
}

/** Big landing illustration: winding pastel road, driving car, trees, houses and a P sign. */
export function RoadHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1260 340" className={className} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#CDE7FF" />
          <stop offset="1" stopColor="#FFF9F2" />
        </linearGradient>
      </defs>
      <rect width="1260" height="340" fill="url(#sky)" />
      <g className="cloud" style={{ animationDuration: "55s" }}>
        <ellipse cx="120" cy="60" rx="50" ry="16" fill="#fff" />
        <ellipse cx="150" cy="50" rx="30" ry="16" fill="#fff" />
      </g>
      <g className="cloud" style={{ animationDuration: "70s", animationDelay: "-30s" }}>
        <ellipse cx="200" cy="100" rx="40" ry="12" fill="#fff" opacity=".8" />
      </g>
      <circle cx="1120" cy="70" r="34" fill="#FFF1B8" />
      <path d="M0 230 Q 200 170 420 210 T 860 190 T 1260 200 L1260 340 L0 340 Z" fill="#DDF3E8" />
      <path d="M0 280 Q 300 240 600 285 T 1260 270 L1260 340 L0 340 Z" fill="#C9ECD9" />
      <House x={560} y={40} c="#FFD6BF" roof="#FF7A6B" />
      <House x={660} y={58} c="#D9D2FF" roof="#6F5FD6" />
      <House x={980} y={30} c="#FFF1B8" roof="#E0864F" />
      <Tree x={80} y={190} />
      <Tree x={130} y={200} s={0.8} c="#A7E0C4" />
      <Tree x={520} y={210} s={0.9} />
      <Tree x={880} y={130} s={0.8} c="#A7E0C4" />
      <Tree x={1180} y={210} />
      {/* road */}
      <path d={ROAD_PATH} stroke="#C9CCD8" strokeWidth="64" fill="none" strokeLinecap="round" />
      <path d={ROAD_PATH} stroke="#E6E8EF" strokeWidth="56" fill="none" strokeLinecap="round" />
      <path d={ROAD_PATH} stroke="#fff" strokeWidth="4" fill="none" className="lane-dash" />
      {/* parking sign + bays */}
      <g transform="translate(760 250)">
        <rect x="-2" y="-40" width="5" height="46" rx="2" fill="#6b6f86" />
        <rect x="-18" y="-72" width="36" height="36" rx="9" fill="#3A86D1" />
        <text x="0" y="-45" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">P</text>
      </g>
      <g transform="translate(790 262)">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 46} y="0" width="42" height="56" rx="4" fill={["#BDEBD6", "#FFD6BF", "#BDEBD6", "#D9D2FF"][i]} stroke="#fff" strokeWidth="3" />
        ))}
      </g>
      {/* moving car */}
      <g>
        <g transform="translate(-30 -16)">
          <CarSvgTop />
        </g>
        <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" path={ROAD_PATH} />
      </g>
      <g>
        <g transform="translate(-30 -16)">
          <CarSvgTop color="#3A86D1" />
        </g>
        <animateMotion dur="13s" begin="-5s" repeatCount="indefinite" rotate="auto" path={ROAD_PATH} />
      </g>
    </svg>
  );
}

function CarSvgTop({ color = "#FF7A6B" }: { color?: string }) {
  return (
    <g>
      <rect x="0" y="4" width="60" height="26" rx="10" fill={color} />
      <rect x="14" y="7" width="12" height="20" rx="4" fill="#fff" opacity=".85" />
      <rect x="36" y="7" width="10" height="20" rx="4" fill="#fff" opacity=".7" />
      <rect x="55" y="7" width="4" height="6" rx="2" fill="#FFF1B8" />
      <rect x="55" y="21" width="4" height="6" rx="2" fill="#FFF1B8" />
    </g>
  );
}

/** Step indicator drawn as a road; the car drives to the current step. */
export function RoadProgress({ steps, current }: { steps: string[]; current: number }) {
  const pct = steps.length > 1 ? current / (steps.length - 1) : 0;
  return (
    <div className="relative mb-8 pt-2">
      <div className="road-strip relative h-10 rounded-full">
        <motion.div className="absolute top-1/2 w-16 -translate-y-1/2" animate={{ left: `calc(${pct * 100}% - ${pct * 64}px)` }} transition={{ type: "spring", damping: 18, stiffness: 120 }}>
          <CarSide className="w-16 drop-shadow" />
        </motion.div>
      </div>
      <div className="mt-2 flex justify-between">
        {steps.map((s, i) => (
          <div key={s} className={`text-[11px] font-bold ${i <= current ? "text-ink" : "text-ink/35"}`}>
            <span className={`mr-1 inline-grid h-5 w-5 place-items-center rounded-full text-[10px] ${i < current ? "bg-mint-deep text-white" : i === current ? "bg-coral text-white" : "bg-road"}`}>{i + 1}</span>
            <span className="hidden sm:inline">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyRoad({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <svg viewBox="0 0 260 110" className="w-64">
        <rect x="0" y="50" width="260" height="44" rx="12" fill="#E6E8EF" />
        <path d="M10 72 H250" stroke="#fff" strokeWidth="3" className="lane-dash" />
        <g className="floaty">
          <path d="M120 60 L130 22 L140 60 Z" fill="#FF7A6B" />
          <rect x="124" y="36" width="12" height="5" fill="#fff" />
          <rect x="114" y="58" width="32" height="6" rx="3" fill="#E8574A" />
        </g>
        <Tree x={30} y={30} s={0.7} />
        <Tree x={225} y={32} s={0.6} c="#A7E0C4" />
      </svg>
      <div className="mt-2 text-lg font-extrabold">{title}</div>
      {text && <div className="mt-1 max-w-sm text-sm text-muted">{text}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** Flat pastel vehicle illustrations for the picker. */
export function VehicleArt({ type, className = "" }: { type: string; className?: string }) {
  const c = { bike: "#6F5FD6", hatchback: "#3FAE83", sedan: "#3A86D1", suv: "#FF7A6B", van: "#E0864F" }[type] ?? "#FF7A6B";
  if (type === "bike")
    return (
      <svg viewBox="0 0 120 70" className={className}>
        <circle cx="28" cy="50" r="15" fill="none" stroke="#2B2D42" strokeWidth="6" />
        <circle cx="92" cy="50" r="15" fill="none" stroke="#2B2D42" strokeWidth="6" />
        <path d="M28 50 L50 28 L78 28 L92 50" stroke={c} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M42 30 C50 18 72 18 80 30 Z" fill={c} />
        <path d="M78 28 L84 14 L94 14" stroke="#2B2D42" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (type === "van")
    return (
      <svg viewBox="0 0 120 70" className={className}>
        <path d="M8 20 C8 14 12 10 18 10 L80 10 C86 10 90 12 94 17 L108 34 C111 37 112 41 112 45 L112 52 C112 55 110 57 107 57 L13 57 C10 57 8 55 8 52 Z" fill={c} />
        <rect x="16" y="18" width="20" height="14" rx="3" fill="#fff" opacity=".9" />
        <rect x="42" y="18" width="20" height="14" rx="3" fill="#fff" opacity=".9" />
        <path d="M70 18 L84 18 L96 33 L70 33 Z" fill="#fff" opacity=".9" />
        <circle cx="30" cy="57" r="9" fill="#2B2D42" />
        <circle cx="90" cy="57" r="9" fill="#2B2D42" />
      </svg>
    );
  const body =
    type === "suv"
      ? "M8 40 C8 32 14 28 22 27 L34 12 C36 10 40 9 43 9 L84 9 C88 9 91 11 93 14 L104 28 C110 29 114 33 114 40 L114 48 C114 51 112 53 109 53 L13 53 C10 53 8 51 8 48 Z"
      : type === "sedan"
        ? "M6 42 C6 35 12 31 20 30 L36 18 C39 16 43 15 47 15 L76 15 C80 15 84 17 87 20 L98 30 C108 31 114 35 114 42 L114 48 C114 51 112 53 109 53 L11 53 C8 53 6 51 6 48 Z"
        : "M14 42 C14 34 20 30 28 29 L40 15 C42 13 46 12 49 12 L78 12 C83 12 86 14 89 18 L100 30 C106 31 110 36 110 42 L110 48 C110 51 108 53 105 53 L19 53 C16 53 14 51 14 48 Z";
  return (
    <svg viewBox="0 0 120 70" className={className}>
      <path d={body} fill={c} />
      <path d={type === "suv" ? "M40 15 L60 15 L60 27 L30 27 Z M66 15 L86 15 L96 27 L66 27 Z" : "M46 19 L60 19 L60 29 L36 29 Z M66 19 L80 19 L90 29 L66 29 Z"} fill="#fff" opacity=".9" />
      <circle cx="34" cy="53" r="9" fill="#2B2D42" />
      <circle cx="34" cy="53" r="3.5" fill="#E6E8EF" />
      <circle cx="88" cy="53" r="9" fill="#2B2D42" />
      <circle cx="88" cy="53" r="3.5" fill="#E6E8EF" />
    </svg>
  );
}

const SPOT_BG: Record<string, [string, string]> = {
  driveway: ["#FFD6BF", "#FF7A6B"],
  plot: ["#BDEBD6", "#3FAE83"],
  basement: ["#D9D2FF", "#6F5FD6"],
  shopfront: ["#FFF1B8", "#E0864F"],
};

/** Illustrated placeholder "photo" for a spot (used when no photo is uploaded). */
export function SpotArt({ type, seed = 1, className = "" }: { type: string; seed?: number; className?: string }) {
  const [bg, accent] = SPOT_BG[type] ?? SPOT_BG.driveway;
  const carColors = ["#3A86D1", "#FF7A6B", "#6F5FD6", "#3FAE83"];
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className={className}>
      <rect width="320" height="180" fill={bg} />
      {type === "basement" ? (
        <>
          <rect x="0" y="0" width="320" height="40" fill={accent} opacity=".25" />
          {[40, 140, 240].map((x) => (
            <rect key={x} x={x} y="0" width="16" height="120" fill="#fff" opacity=".5" />
          ))}
          <circle cx="100" cy="20" r="6" fill="#FFF1B8" />
          <circle cx="220" cy="20" r="6" fill="#FFF1B8" />
        </>
      ) : type === "shopfront" ? (
        <>
          <rect x="30" y="20" width="260" height="80" rx="8" fill="#fff" opacity=".8" />
          <path d="M30 20 h260 v18 h-260z" fill={accent} />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <rect key={i} x={30 + i * 20} y="38" width="10" height="8" fill={accent} opacity=".6" />
          ))}
        </>
      ) : type === "plot" ? (
        <>
          <Tree x={40} y={60} />
          <Tree x={280} y={55} s={1.2} c="#A7E0C4" />
          <Tree x={250} y={70} s={0.8} />
        </>
      ) : (
        <House x={200} y={30} c="#fff" roof={accent} />
      )}
      <rect x="0" y="112" width="320" height="68" fill="#E6E8EF" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={20 + i * 64} y="118" width="4" height="56" fill="#fff" />
      ))}
      <g transform={`translate(${34 + (seed % 3) * 64} 128)`}>
        <rect x="0" y="0" width="44" height="40" rx="8" fill={carColors[seed % 4]} />
        <rect x="6" y="8" width="32" height="10" rx="3" fill="#fff" opacity=".85" />
      </g>
      <g transform="translate(168 70)">
        <rect x="-2" y="0" width="4" height="42" fill="#6b6f86" />
        <rect x="-14" y="-26" width="28" height="28" rx="7" fill="#3A86D1" />
        <text x="0" y="-5" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">P</text>
      </g>
    </svg>
  );
}

export function SpotImage({ spot, className = "" }: { spot: { id: number; photo?: string | null; spot_type: string }; className?: string }) {
  if (spot.photo) return <img src={spot.photo} alt="" className={`object-cover ${className}`} />;
  return <SpotArt type={spot.spot_type} seed={spot.id} className={className} />;
}

export function DocArt({ kind, name }: { kind: string; name: string }) {
  const isId = kind === "id";
  return (
    <div className={`flex h-28 w-full flex-col justify-between rounded-2xl p-3 ${isId ? "bg-sky" : "bg-butter"}`}>
      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-ink/60">
        <span>{isId ? "Government ID" : "Ownership proof"}</span>
        <span>{name.split(".").pop()}</span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 w-3/4 rounded bg-white/80" />
        <div className="h-2 w-1/2 rounded bg-white/80" />
        <div className="h-2 w-2/3 rounded bg-white/60" />
      </div>
      <div className="truncate text-[11px] font-bold">{name}</div>
    </div>
  );
}
