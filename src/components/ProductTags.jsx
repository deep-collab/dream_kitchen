import { useI18n } from '../i18n/I18nProvider'

export default function ProductTags({ product, className = '' }) {
  const { t } = useI18n()
  if (!product.tags.length && !product.soldOut) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {product.soldOut && <span className="tag tag-soldout">{t('common.soldOut')}</span>}
      {product.tags.map((tag) => (
        <span key={tag} className={`tag tag-${tag}`}>
          {t(`tags.${tag}`)}
        </span>
      ))}
    </div>
  )
}
