import { Link } from 'react-router-dom'
import { telLink, waLink } from '../../config/site'
import { PhoneIcon, WhatsAppIcon } from '../icons'

/**
 * Button styles live in index.css (.btn-*) so links and buttons look identical.
 *   variant: primary | secondary | call | whatsapp
 *   tone:    'dark' when sitting on black (or wrap the area in .on-dark)
 *   size:    md | lg
 * Renders <Link> for `to`, <a> for `href`, otherwise <button>.
 * `call` defaults to the tel: link from config and `whatsapp` to a plain chat (Contact only), unless
 * the button submits a form or has an onClick.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  tone,
  fullWidth = false,
  to,
  href,
  icon,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  const cls = ['btn', `btn-${variant}`, size === 'lg' && 'btn-lg', fullWidth && 'btn-block', tone === 'dark' && 'btn-on-dark', className]
    .filter(Boolean)
    .join(' ')

  let Icon = icon
  if (Icon === undefined && variant === 'call') Icon = PhoneIcon
  if (Icon === undefined && variant === 'whatsapp') Icon = WhatsAppIcon
  const content = (
    <>
      {Icon && <Icon />}
      <span>{children}</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {content}
      </Link>
    )
  }

  // call / whatsapp default to their links only when the button has no other job
  // (a submit button or one with onClick stays a <button>)
  let link = href
  const plain = type === 'button' && !props.onClick
  if (!link && plain && variant === 'call') link = telLink
  if (!link && plain && variant === 'whatsapp') link = waLink()
  if (link) {
    const external = /^https?:/.test(link)
    return (
      <a href={link} className={cls} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} className={cls} {...props}>
      {content}
    </button>
  )
}
