// Page header band: faint doodles behind a solid cream card
export default function PageHero({ eyebrow, title, subtitle, children }) {
  return (
    <section className="doodle-bg border-b border-tint py-8 sm:py-12">
      <div className="container-dk">
        <div className="card-cream mx-auto max-w-3xl px-5 py-7 text-center sm:px-10 sm:py-10">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl font-bold sm:text-5xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-3 max-w-xl text-lg text-brown">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
