import { useParams, Navigate } from 'react-router-dom'
import { usePublicPost, usePublicPosts } from '../../lib/publicData.js'
import { getCharacterById } from '../../data/characters.js'
import { getLocationById } from '../../data/locations.js'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import GazetteArticle from './GazetteArticle.jsx'

export default function PostDetail() {
  const { id } = useParams()
  const { post, loading } = usePublicPost(id)
  const posts = usePublicPosts()
  if (loading) return <div className="container">Chargement...</div>
  if (!post || post.visibility === 'draft') return <Navigate to="/journal" replace />

  const characters = (post.characters || []).map(getCharacterById).filter(Boolean)
  const locations = (post.locations || []).map(getLocationById).filter(Boolean)
  const related = posts.find((entry) => entry.id !== post.id && entry.visibility !== 'draft' && entry.category === post.category)
  return <PageTransition><GazetteArticle post={post} related={related} characters={characters} locations={locations} /></PageTransition>
}
