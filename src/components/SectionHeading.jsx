export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', as: H = 'h2', id }) {
  const center = align === 'center'
  return (
    <div className={`mb-8 sm:mb-10 ${center ? 'mx-auto max-w-2xl text-center' : ''}`}>
      {eyebrow && (
        <p className="eyebrow">
          <span aria-hidden="true" className="text-gold">✦</span>
          {eyebrow}
          <span aria-hidden="true" className="text-gold">✦</span>
        </p>
      )}
      <H id={id} className="mt-2 text-3xl font-bold sm:text-4xl">
        {title}
      </H>
      {subtitle && <p className="mt-3 text-lg text-brown">{subtitle}</p>}
    </div>
  )
}
