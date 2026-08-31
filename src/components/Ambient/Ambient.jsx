import { useEffect, useState } from 'react'
import './Ambient.css'

const DARK_BACKGROUND_IMAGE = '/media/fond_sombre.jfif'
const DARK_BACKGROUND_VIDEO = '/media/fond_sombre_anime.mp4'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DESKTOP_VIDEO_QUERY = '(min-width: 769px)'

function readAmbientMediaState() {
  if (typeof window === 'undefined') {
    return { isDark: false, useVideo: false }
  }

  const isDark = document.documentElement.dataset.theme === 'dark'
  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
  const desktop = window.matchMedia(DESKTOP_VIDEO_QUERY).matches

  return {
    isDark,
    useVideo: isDark && desktop && !reduceMotion,
  }
}

function onMediaQueryChange(query, callback) {
  const mediaQuery = window.matchMedia(query)
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', callback)
    return () => mediaQuery.removeEventListener('change', callback)
  }

  mediaQuery.addListener(callback)
  return () => mediaQuery.removeListener(callback)
}

export default function Ambient() {
  const [mediaState, setMediaState] = useState(readAmbientMediaState)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    const updateMediaState = () => setMediaState(readAmbientMediaState())
    const observer = new MutationObserver(updateMediaState)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const cleanupMotion = onMediaQueryChange(REDUCED_MOTION_QUERY, updateMediaState)
    const cleanupDesktop = onMediaQueryChange(DESKTOP_VIDEO_QUERY, updateMediaState)

    updateMediaState()

    return () => {
      observer.disconnect()
      cleanupMotion()
      cleanupDesktop()
    }
  }, [])

  const showVideo = mediaState.useVideo && !videoError

  return (
    <div className={`ambient${mediaState.isDark ? ' ambient--dark-media' : ''}`} aria-hidden="true">
      <div className="ambient__dark-fallback" />
      {showVideo && (
        <video
          className="ambient__dark-video"
          autoPlay
          muted
          loop
          playsInline
          poster={DARK_BACKGROUND_IMAGE}
          preload="metadata"
          onError={() => setVideoError(true)}
        >
          <source src={DARK_BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      )}
      <div className="ambient__dark-veil" />
      <span className="ambient__blob ambient__blob--wine" />
      <span className="ambient__blob ambient__blob--midnight" />
      <span className="ambient__blob ambient__blob--violet" />
      <div className="ambient__dust" />
    </div>
  )
}
