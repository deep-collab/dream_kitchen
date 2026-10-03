import { useI18n } from '../i18n/I18nProvider'
import Badge from './ui/Badge'

// Legacy sample-product tags (Step 2 switches to her real badges: Signature, Top selling)
export default function ProductTags({ product, className = '' }) {
  const { t } = useI18n()
  const tags = product.tags.filter((tag) => tag === 'bestseller')
  if (!tags.length && !product.soldOut) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {product.soldOut && <Badge tone="dark">{t('common.soldOut')}</Badge>}
      {tags.map((tag) => (
        <Badge key={tag}>{t(`tags.${tag}`)}</Badge>
      ))}
    </div>
  )
}
