import { useEffect, useState } from 'react'
import { cultureApi } from '../../lib/cultureApi.js'
import { getSession } from '../../lib/authApi.js'

export function useCulture(id) {
  const key = id || 'list'
  const [state, setState] = useState({ key: null, loading: true, posts: [], tags: [], user: null, post: null, error: '' })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let alive = true
    setState(s => ({ ...s, loading: true, error: '' }))
    Promise.all([cultureApi(id ? `posts/${encodeURIComponent(id)}` : 'posts'), cultureApi('tags'), getSession().catch(() => ({ user: null }))])
      .then(([data, tags, session]) => { if (alive) setState({ key, loading: false, posts: id ? [] : data, post: id ? data : null, tags, user: session.user, error: '' }) })
      .catch(error => { if (alive) setState(s => ({ ...s, key, loading: false, error: error.message })) })
    return () => { alive = false }
  }, [id, key, version])
  return { ...state, loading: state.loading || state.key !== key, reload: () => setVersion(v => v + 1) }
}
