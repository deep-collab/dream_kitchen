import { useId } from 'react'

/*
  Placeholder illustrations until Hema uploads photos (Stage B): gold line art on a
  black tile, in the engraved spirit of her symbol. One drawing per product type;
  `variant` moves the small sparkles so neighbouring cards never look identical.
  Pure inline SVG, no requests.
*/

const S = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

// Scalloped (fluted) ellipse edge for the cookie pie tin, generated once
function scallop(cx, cy, rx, ry, bumps, depth) {
  const pts = []
  for (let i = 0; i <= bumps * 2; i++) {
    const a = (i / (bumps * 2)) * Math.PI * 2
    const r = i % 2 ? 1 : 1 - depth
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r])
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i += 2) {
    const [qx, qy] = pts[i]
    const [x, y] = pts[i + 1] || pts[0]
    d += ` Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + 'Z'
}
const PIE_EDGE = scallop(80, 86, 54, 32, 22, 0.06)

const ART = {
  tub: (
    <>
      <path d="M40 62 L46 118 Q80 130 114 118 L120 62" />
      <ellipse cx="80" cy="62" rx="40" ry="10" />
      <path d="M43.5 86 Q80 97 116.5 86" opacity=".7" />
      <path d="M45 102 Q80 113 115 102" opacity=".7" />
      <rect x="62" y="48" width="13" height="10" rx="3" transform="rotate(-10 68 53)" />
      <rect x="69" y="41" width="16" height="14" rx="3" transform="rotate(6 77 48)" />
      <circle cx="98" cy="50" r="8.5" />
      <path d="M92.5 46.5 l10 6 M91.5 51.5 l9 5 M95 44 l9 5" opacity=".75" />
      <path d="M48 60 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0" opacity=".85" />
      <path d="M54 40 L32 14" />
      <ellipse cx="57.5" cy="44" rx="7" ry="4.2" transform="rotate(50 57.5 44)" />
    </>
  ),
  'delight-box': (
    <>
      <rect x="36" y="38" width="88" height="12" rx="3.5" />
      <rect x="41" y="50" width="78" height="72" rx="4" />
      <path d="M41 72 q9.75 -6 19.5 0 t19.5 0 t19.5 0 t19.5 0" />
      <path d="M41 92 q9.75 5 19.5 0 t19.5 0 t19.5 0 t19.5 0" />
      <path d="M41 108 H119" opacity=".55" />
      <path d="M52 62 l5 -3 M64 64 l4 -4 M77 61 l6 -1 M90 64 l4 -4 M103 62 l5 -2" />
      <circle cx="58" cy="83" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="80" cy="81" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="101" cy="84" r="1.6" fill="currentColor" stroke="none" />
      <path d="M124 44 q14 2 12 20" opacity=".8" />
      <rect x="128" y="64" width="13" height="16" rx="2.5" transform="rotate(12 134 72)" />
    </>
  ),
  'cookie-dip-tin': (
    <>
      <path d="M22 98 V106 Q68 138 114 106 V98" />
      <ellipse cx="68" cy="98" rx="46" ry="26" />
      <ellipse cx="68" cy="96" rx="40" ry="21" opacity=".6" />
      <circle cx="52" cy="94" r="13" />
      <circle cx="78" cy="86" r="12" />
      <circle cx="82" cy="106" r="10.5" />
      <path d="M48 90 h.1 M56 97 h.1 M51 101 h.1 M75 83 h.1 M82 89 h.1 M79 104 h.1 M86 108 h.1" strokeWidth="3.2" />
      <path d="M102 44 L104.5 58 Q115 62 125.5 58 L128 44" />
      <ellipse cx="115" cy="44" rx="13" ry="5" />
      <path d="M107 44 q4 6 8 1 q4 6 8 0" opacity=".8" />
      <path d="M126 62 L128.5 74 Q137 78 145.5 74 L148 62" />
      <ellipse cx="137" cy="62" rx="11" ry="4.5" />
      <path d="M130 62 q3.5 5 7 1 q3.5 5 7 0" opacity=".8" />
    </>
  ),
  'cookie-pie-tin': (
    <>
      <path d={PIE_EDGE} />
      <path d="M26 86 V94 Q80 136 134 94 V86" />
      <ellipse cx="80" cy="86" rx="44" ry="25" opacity=".55" />
      <path d="M80 86 L123 80 M80 86 L112 104" opacity=".8" />
      <rect x="54" y="74" width="7" height="6" rx="1.5" transform="rotate(-15 57 77)" />
      <rect x="70" y="94" width="7" height="6" rx="1.5" transform="rotate(20 73 97)" />
      <rect x="92" y="70" width="6" height="5" rx="1.5" transform="rotate(10 95 72)" />
      <rect x="50" y="92" width="6" height="5" rx="1.5" />
      <path d="M96 52 L134 46 Q140 58 128 68 Z" />
      <path d="M104 54 h.1 M118 52 h.1 M124 60 h.1" strokeWidth="3.2" />
    </>
  ),
  'cookie-pie-box': (
    <>
      <path d="M44 72 H112 V122 H44 Z" />
      <path d="M44 72 L60 58 H128 L112 72" />
      <path d="M128 58 V108 L112 122" />
      <path d="M60 58 L54 30 H122 L128 58" opacity=".85" />
      <path d="M66 70 L100 62 Q104 54 96 50 Q80 50 66 70 Z" />
      <path d="M76 63 h.1 M88 58 h.1 M93 61 h.1" strokeWidth="3.2" />
      <circle cx="78" cy="97" r="11" opacity=".8" />
      <path d="M74 100 q4 -10 9 -8 q-1 7 -9 8 Z M78 97 q-6 -7 -2 -10 q4 3 2 10" opacity=".9" />
    </>
  ),
  bar: (
    <g transform="rotate(-12 80 80)">
      <rect x="40" y="30" width="80" height="96" rx="4" />
      <path d="M66.7 30 V80 M93.3 30 V80 M40 55 H120 M40 80 H120" />
      <rect x="45" y="35" width="16.7" height="15" rx="2" opacity=".5" />
      <rect x="71.7" y="35" width="16.7" height="15" rx="2" opacity=".5" />
      <rect x="45" y="60" width="16.7" height="15" rx="2" opacity=".5" />
      <rect x="71.7" y="60" width="16.7" height="15" rx="2" opacity=".5" />
      <rect x="98.3" y="60" width="16.7" height="15" rx="2" opacity=".5" />
      <path d="M36 82 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 V130 H36 Z" />
      <path d="M36 98 H124 M36 112 H124" opacity=".6" />
      <path d="M98.3 30 H116 Q120 30 120 34 V50 L112 46 L106 52 L98.3 46 Z" opacity=".35" />
      <path d="M128 18 l10 4 l-4 9 l-9 -3 Z" />
    </g>
  ),
  'colour-blast': (
    <g transform="rotate(-8 80 80)">
      <rect x="30" y="46" width="100" height="68" rx="6" />
      <rect x="35" y="51" width="90" height="58" rx="4" opacity=".45" />
      <path d="M38 96 C54 70 66 104 82 80 S112 70 122 58" />
      <path d="M38 108 C58 86 70 112 90 92 S116 88 124 76" opacity=".7" />
      <path d="M46 62 h.1 M60 58 h.1 M100 100 h.1 M112 96 h.1 M70 104 h.1 M96 62 h.1" strokeWidth="3.4" />
      <path d="M78 58 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" opacity=".9" />
      <path d="M104 80 l3 -3 M52 80 l-3 3 M114 66 l3 1" />
    </g>
  ),
  assortment: (
    <>
      <rect x="28" y="30" width="104" height="100" rx="7" />
      <rect x="34" y="36" width="92" height="88" rx="4" opacity=".55" />
      <circle cx="51" cy="54" r="10" />
      <path d="M45 54 q6 -7 12 0 q-6 7 -12 0" opacity=".8" />
      <rect x="70" y="44" width="20" height="20" rx="4" />
      <path d="M72 62 L88 46 M72 54 L80 46 M80 62 L88 54" opacity=".7" />
      <path d="M109 62 q-11 -6 -10 -13 q1 -5 6 -4 q3 1 4 4 q1 -3 4 -4 q5 -1 6 4 q1 7 -10 13 Z" />
      <circle cx="51" cy="80" r="10" />
      <circle cx="51" cy="80" r="3" fill="currentColor" stroke="none" opacity=".8" />
      <circle cx="80" cy="80" r="10" />
      <path d="M72 76 q8 4 16 0 M72 82 q8 4 16 0" opacity=".75" />
      <rect x="99" y="70" width="20" height="20" rx="10" />
      <path d="M104 80 h10" opacity=".75" />
      <rect x="41" y="96" width="20" height="20" rx="4" />
      <path d="M45 106 l6 -6 l6 6 l-6 6 Z" opacity=".8" />
      <circle cx="80" cy="106" r="10" />
      <path d="M74 103 q3 -4 6 0 t6 0 M74 109 q3 -4 6 0 t6 0" opacity=".75" />
      <circle cx="109" cy="106" r="10" />
      <path d="M109 98 v16 M101 106 h16" opacity=".6" />
    </>
  ),
}

const SPARKLE_SPOTS = [
  [[24, 26], [138, 132]],
  [[136, 24], [26, 128]],
  [[22, 74], [140, 40]],
  [[132, 136], [30, 30]],
]

function Sparkle({ x, y, s = 1 }) {
  return (
    <path
      d={`M${x} ${y - 5 * s} q${0.6 * s} ${4.4 * s} ${5 * s} ${5 * s} q${-4.4 * s} ${0.6 * s} ${-5 * s} ${5 * s} q${-0.6 * s} ${-4.4 * s} ${-5 * s} ${-5 * s} q${4.4 * s} ${-0.6 * s} ${5 * s} ${-5 * s}Z`}
      fill="currentColor"
      stroke="none"
      opacity=".7"
    />
  )
}

export const ART_KINDS = Object.keys(ART)

/**
 * kind: tub | delight-box | cookie-dip-tin | cookie-pie-tin | cookie-pie-box | bar | colour-blast | assortment
 * label: pass a description when the image is meaningful on its own; omit when the
 *        product name sits right beside it (then the tile is decorative).
 */
export default function ProductArt({ kind, variant = 0, label, rounded = 'rounded-control', className = '' }) {
  const uid = useId().replace(/:/g, '')
  const art = ART[kind] || ART.assortment
  const [[x1, y1], [x2, y2]] = SPARKLE_SPOTS[variant % SPARKLE_SPOTS.length]
  return (
    <svg
      viewBox="0 0 160 160"
      className={`block bg-ink text-gold-mid ${rounded} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}g`} x1="20" y1="16" x2="140" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EBD27A" />
          <stop offset=".55" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#B8901E" />
        </linearGradient>
        <radialGradient id={`${uid}r`} cx=".5" cy=".55" r=".55">
          <stop offset="0" stopColor="#C9A227" stopOpacity=".16" />
          <stop offset="1" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="160" height="160" fill={`url(#${uid}r)`} />
      <g stroke={`url(#${uid}g)`} strokeWidth="2.1" {...S}>
        {art}
      </g>
      <Sparkle x={x1} y={y1} s={0.9} />
      <Sparkle x={x2} y={y2} s={0.6} />
    </svg>
  )
}
