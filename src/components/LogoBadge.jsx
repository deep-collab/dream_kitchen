import { useI18n } from '../i18n/I18nProvider'

const sizes = {
  sm: ['h-12 w-12 rounded-2xl p-1', 'rounded-xl'],
  md: ['h-20 w-20 rounded-3xl p-1.5', 'rounded-2xl'],
  lg: ['h-36 w-36 rounded-[2rem] p-2 sm:h-44 sm:w-44', 'rounded-[1.6rem]'],
}

// The cropped sticker logo, shown on a dark-brown rounded badge
export default function LogoBadge({ size = 'sm', className = '' }) {
  const { t } = useI18n()
  const [outer, inner] = sizes[size]
  const large = size === 'lg'
  return (
    <span className={`inline-block shrink-0 bg-dark shadow-soft ring-1 ring-gold/40 ${outer} ${className}`}>
      <img
        src={large ? '/logo.png' : '/logo-sm.png'}
        alt={t('brand.logoAlt')}
        width={large ? 720 : 256}
        height={large ? 720 : 256}
        className={`h-full w-full object-cover ${inner}`}
        decoding="async"
      />
    </span>
  )
}
