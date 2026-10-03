import { HeartIcon } from './Icons'

// Friendly info box (used for the 6-piece / 2-day rule)
export default function Notice({ children, className = '' }) {
  return (
    <div role="status" className={`flex gap-3 rounded-2xl border-2 border-gold/60 bg-[#FBF0D6] p-4 text-deep ${className}`}>
      <HeartIcon className="mt-0.5 h-6 w-6 shrink-0 text-brown" />
      <p className="text-[0.98rem] leading-relaxed">{children}</p>
    </div>
  )
}
