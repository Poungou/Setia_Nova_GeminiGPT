import { useState } from 'react'
import './SafeImage.css'

export default function SafeImage({ src, alt = '', fallback = 'Illustration indisponible', className = '', style, onError, ...props }) {
  const [failed, setFailed] = useState(null)
  if (!src || failed === src) return <span className={`image-fallback ${className}`} style={style} role="img" aria-label={alt || (typeof fallback === 'string' ? fallback : 'Illustration indisponible')}>{fallback}</span>
  return <img {...props} src={src} alt={alt} className={className} style={style} onError={event => { setFailed(src); onError?.(event) }} />
}
