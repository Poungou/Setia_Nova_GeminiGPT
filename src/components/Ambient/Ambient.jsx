import { useEffect, useState } from 'react'
import homeData from '../../data/home.json'
import './Ambient.css'

const DARK_BACKGROUND_IMAGE = '/media/fond_sombre.jfif'
const DARK_BACKGROUND_VIDEO = '/media/fond_sombre_anime.mp4'
const homeConfig = homeData[0] || {}
const LIGHT_BACKGROUND_IMAGE = homeConfig.lightBackgroundFallback || '/media/fond_clair_statique.webp'
const LIGHT_BACKGROUND_VIDEO = homeConfig.lightBackgroundVideo || '/media/fond_clair_anime.mp4'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DESKTOP_VIDEO_QUERY = '(min-width: 769px)'

function readAmbientMediaState() {
  if (typeof window === 'undefined') {
    return { theme: 'dark', useVideo: false }
  }

  const theme = document.documentElement.dataset.theme || 'dark'
  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
  const desktop = window.matchMedia(DESKTOP_VIDEO_QUERY).matches
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const saveData = Boolean(connection?.saveData)
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2
  const motionSafe = !reduceMotion && !saveData && !lowMemory

  return {
    theme,
    useVideo: (theme === 'dark' && desktop && motionSafe) || (theme === 'light' && motionSafe),
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

  useEffect(() => {
    setVideoError(false)
  }, [mediaState.theme])

  const isDark = mediaState.theme === 'dark'
  const isLight = mediaState.theme === 'light'
  const showVideo = mediaState.useVideo && !videoError && (isDark || isLight)
  const videoSrc = isLight ? LIGHT_BACKGROUND_VIDEO : DARK_BACKGROUND_VIDEO
  const posterSrc = isLight ? LIGHT_BACKGROUND_IMAGE : DARK_BACKGROUND_IMAGE

  return (
    <div
      className={[
        'ambient',
        isDark ? 'ambient--dark-media' : '',
        isLight ? 'ambient--light-media' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <div className="ambient__media-fallback" style={{ '--ambient-fallback': `url("${posterSrc}")` }} />
      {showVideo && (
        <video
          className="ambient__video"
          autoPlay
          muted
          loop
          playsInline
          poster={posterSrc}
          preload="metadata"
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="ambient__media-veil" />
      <span className="ambient__blob ambient__blob--wine" />
      <span className="ambient__blob ambient__blob--midnight" />
      <span className="ambient__blob ambient__blob--violet" />
      <div className="ambient__dust" />
    </div>
  )
}
