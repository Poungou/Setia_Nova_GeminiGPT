import { useEffect, useState } from 'react'
import { cultureApi } from '../../lib/cultureApi.js'
import { getSession } from '../../lib/authApi.js'

export function useCulture(id) {
  const [state, setState] = useState({ loading: true, posts: [], tags: [], user: null, post: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let alive = true
    setState(s => ({ ...s, loading: true, error: '' }))
    Promise.all([cultureApi(id ? `posts/${encodeURIComponent(id)}` : 'posts'), cultureApi('tags'), getSession().catch(() => ({ user: null }))])
      .then(([data, tags, session]) => { if (alive) setState({ loading: false, posts: id ? [] : data, post: id ? data : null, tags, user: session.user, error: '' }) })
      .catch(error => { if (alive) setState(s => ({ ...s, loading: false, error: error.message })) })
    return () => { alive = false }
  }, [id, version])
  return { ...state, reload: () => setVersion(v => v + 1) }
}
