// Section title with an optional plain-language lead line below it.
// Deliberately no eyebrow label above: headings stand on their own (DESIGN.md §6).
export default function SectionHeading({ title, lead, id, as: H = 'h2', align = 'start', className = '' }) {
  const center = align === 'center'
  return (
    <div className={`mb-8 max-w-[40rem] lg:mb-10 ${center ? 'mx-auto text-center' : ''} ${className}`}>
      <H id={id} className={H === 'h1' ? 't-h1' : 't-h2'}>
        {title}
      </H>
      {lead && <p className="t-lead mt-3 text-brown-2">{lead}</p>}
    </div>
  )
}
