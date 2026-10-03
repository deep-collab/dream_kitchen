import { CalendarIcon } from '../icons'

// Calm information box on light pages (rules such as pre-booking). Brown on champagne.
export default function Notice({ icon: Icon = CalendarIcon, children, className = '' }) {
  return (
    <div role="note" className={`flex gap-3 rounded-card border border-line bg-champagne p-4 sm:p-5 ${className}`}>
      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
