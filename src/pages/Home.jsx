import { useSeo } from '../hooks/useSeo'
import { classesEnabled } from '../config/site'
import Hero from '../components/home/Hero'
import { BestSellers, CategoryTiles, ClassesTeaser, ComboTeaser, InstagramBand, Reviews, StoryTeaser, TalkBand, TubSpotlight } from '../components/home/HomeSections'

// Order from the brief: hero (the pre-booking strip sits under the header on every
// page) → categories → best sellers → tub spotlight → combo → classes → story →
// reviews (only when real ones exist) → call band → Instagram → footer. The classes section
// shows only while site.classes.enabled is true.
// Each section has its own shape; cream and champagne alternate, black bands stand alone.
export default function Home() {
  useSeo('home')
  return (
    <>
      <Hero />
      <CategoryTiles />
      <hr className="rule-gold" />
      <BestSellers />
      <TubSpotlight />
      <ComboTeaser />
      <hr className="rule-gold" />
      {classesEnabled() && (
        <>
          <ClassesTeaser />
          <hr className="rule-gold" />
        </>
      )}
      <StoryTeaser />
      <Reviews />
      <TalkBand />
      <InstagramBand />
    </>
  )
}
