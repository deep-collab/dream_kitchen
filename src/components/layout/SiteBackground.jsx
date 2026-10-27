import { useRajyotsava, useSiteConfig } from '../../context/MenuProvider'
import { festivalBackground } from '../../lib/siteConfig'
import ThemeLayer from '../background/ThemeLayer'

/**
 * The festival background behind the cream pages (developer options -> Site background), on its
 * dates only (Indian time), and the Karnataka flag while the Rajyotsava offer is live; afterwards
 * the site goes back to the default by itself. The default is
 * the faint logo in the home hero (components/home/Hero.jsx), so here it draws nothing.
 * Fixed to the screen, behind all the content (Layout makes #dk-app its own layer for this).
 */
export default function SiteBackground() {
  const { config, today } = useSiteConfig()
  const bg = festivalBackground(config.background, today, Boolean(useRajyotsava()))
  if (bg.id === 'default') return null
  return <ThemeLayer bg={bg} className="fixed inset-0 -z-10 h-dvh w-full" />
}
