import { useId } from 'react'

/*
  Placeholder illustrations until Hema uploads photos (Stage B): gold line art on a
  black tile, in the engraved spirit of her symbol. One drawing per product type;
  `variant` moves the small sparkles so neighbouring cards never look identical.
  Pure inline SVG, no requests.
*/

const S = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

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
  // Brownies: an open box seen from above, five fudgy squares (two over three) with a crackled top
  'brownie-box': (
    <>
      <path d="M30 50 L48 34 H112 L130 50" opacity=".7" />
      <rect x="30" y="50" width="100" height="72" rx="4" />
      <rect x="40" y="58" width="37" height="26" rx="3" />
      <rect x="83" y="58" width="37" height="26" rx="3" />
      <rect x="40" y="90" width="24" height="24" rx="3" />
      <rect x="68" y="90" width="24" height="24" rx="3" />
      <rect x="96" y="90" width="24" height="24" rx="3" />
      <path d="M46 66 l7 4 l6 -3 M90 68 l6 -3 l8 4 M46 98 l5 4 M74 100 l6 -3 M101 98 l6 4" opacity=".6" />
      <circle cx="66" cy="75" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="108" cy="76" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Drawing Chocolate Bar: a smooth bar with a little heart drawn on it, and a fine brush
  'drawing-bar': (
    <>
      <g transform="rotate(-10 80 82)">
        <rect x="32" y="46" width="96" height="66" rx="6" />
        <rect x="38" y="52" width="84" height="54" rx="4" opacity=".5" />
        <path d="M80 94 C66 84 62 76 68 70 C72 66 78 68 80 73 C82 68 88 66 92 70 C98 76 94 84 80 94 Z" />
        <path d="M50 62 q4 -4 8 0 M104 98 q4 -4 8 0" opacity=".6" />
      </g>
      <path d="M118 30 L136 18" />
      <path d="M114 33 l4 -3 l3 4 l-4 3 Z" />
      <path d="M114 36 q-6 6 -10 10 q4 1 9 -4 q3 -3 1 -6" />
    </>
  ),
  // Cookie Tins: a round tin, its lid lifted and tilted, cookies with chocolate chips inside
  'cookie-tin': (
    <>
      <ellipse cx="78" cy="76" rx="44" ry="11" />
      <path d="M34 76 V116 Q78 136 122 116 V76" />
      <path d="M34 96 Q78 113 122 96" opacity=".7" />
      <path d="M34 104 Q78 121 122 104" opacity=".7" />
      <path d="M46 104 l6 -4 l6 4 l-6 4Z M70 108 l6 -4 l6 4 l-6 4Z M94 107 l6 -4 l6 4 l-6 4Z" opacity=".65" />
      <ellipse cx="58" cy="71" rx="13" ry="5.5" transform="rotate(-10 58 71)" />
      <ellipse cx="80" cy="68" rx="13" ry="5.5" transform="rotate(6 80 68)" />
      <ellipse cx="101" cy="72" rx="12" ry="5" transform="rotate(-4 101 72)" />
      <circle cx="55" cy="70" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="62" cy="72" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="78" cy="67" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="85" cy="69" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="99" cy="71" r="1.5" fill="currentColor" stroke="none" />
      <ellipse cx="88" cy="40" rx="46" ry="11" transform="rotate(-9 88 40)" />
      <path d="M42.5 47 l1 7 Q90 64 134.5 41 l-1.5 -7" transform="rotate(-1 88 50)" opacity=".85" />
      <path d="M78 33 q10 -6 20 -1" opacity=".7" />
    </>
  ),
  // Chocolate classes: a mixing bowl of melted chocolate, a whisk, and a mould tray in front
  class: (
    <>
      <ellipse cx="74" cy="64" rx="42" ry="10.5" />
      <path d="M32 64 Q35 108 74 111 Q113 108 116 64" />
      <path d="M41 67 q8.25 5 16.5 0 t16.5 0 t16.5 0 t16.5 0" opacity=".85" />
      <path d="M50 72 v7 q2 4 4 0 v-5 M86 72 v10 q2 4 4 0 v-8" opacity=".7" />
      <path d="M58 111 L54 119 H94 L90 111" opacity=".75" />
      <path d="M100 60 L127 22" />
      <rect x="123" y="9" width="9" height="20" rx="4.5" transform="rotate(35 127.5 19)" />
      <path d="M100 60 q-19 7 -12 22 q11 2 12 -22" />
      <path d="M100 60 q-9 11 -2 23 q9 -5 2 -23" opacity=".8" />
      <rect x="34" y="124" width="92" height="20" rx="5" />
      <circle cx="52" cy="134" r="5.5" />
      <path d="M74.5 130.5 q2.5 -3 5 0 q2.5 -3 5 0 q0 4 -5 8 q-5 -4 -5 -8Z" />
      <rect x="102.5" y="128.5" width="11" height="11" rx="2.5" />
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
 * kind: tub | delight-box | brownie-box | bar | drawing-bar | cookie-tin | assortment | class
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
