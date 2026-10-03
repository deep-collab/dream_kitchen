// Page-width wrapper: 1200px content, gutters 16 / 24 / 32px, safe-area aware.
export default function Container({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`dk-container ${className}`} {...props}>
      {children}
    </Tag>
  )
}
