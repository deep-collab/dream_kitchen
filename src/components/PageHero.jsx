import Container from './ui/Container'

// Page title band on champagne with a gold rule beneath. No eyebrow label.
export default function PageHero({ title, subtitle, children }) {
  return (
    <>
      <section className="bg-champagne py-10 lg:py-14">
        <Container>
          <div className="max-w-[44rem]">
            <h1 className="t-h1">{title}</h1>
            {subtitle && <p className="t-lead mt-3 text-brown-2">{subtitle}</p>}
            {children}
          </div>
        </Container>
      </section>
      <hr className="rule-gold" />
    </>
  )
}
