import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// useSeo('home') reads seo.home.title / seo.home.desc; or pass {title, desc} directly
export function useSeo(page, override) {
  const { t } = useI18n()
  const title = override?.title || t(`seo.${page}.title`)
  const desc = override?.desc || t(`seo.${page}.desc`)
  useEffect(() => {
    document.title = title
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', window.location.href)
  }, [title, desc])
}
