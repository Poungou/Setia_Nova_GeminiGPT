import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function RouteScroll() {
  const { pathname, hash } = useLocation()
  const navigation = useNavigationType()
  const previousPath = useRef(pathname)
  useLayoutEffect(() => {
    const changedPage = previousPath.current !== pathname
    previousPath.current = pathname
    // Preserve native history restoration and in-page anchors. Query-only
    // filters should not move the reader back to the top either.
    if (changedPage && navigation !== 'POP' && !hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, navigation])
  return null
}
