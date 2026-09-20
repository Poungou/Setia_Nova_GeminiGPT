import AetherAbout from '../../components/AetherAbout/AetherAbout.jsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import aetherData from '../../data/aether.json'
import { getSession } from '../../lib/authApi.js'
import { imgSrc, imgFocus } from '../../lib/image.js'
import { sendAetherMessage } from '../../lib/aetherApi.js'
import ChatWidget from '../../components/ChatWidget/ChatWidget.jsx'
import PageTransition from '../../components/PageTransition/PageTransition.jsx'
import './Aether.css'

const EASE = [0.22, 1, 0.36, 1]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const config = aetherData[0] || null

export default function Aether() {
  const [session, setSession] = useState({ checking: true, user: null })
  const reduce = useReducedMotion()
  const motionProps = reduce ? {} : { variants: container, initial: 'hidden', animate: 'show' }
  const itemMotion = reduce ? {} : { variants: item }

  const enabled = config?.enabled === 'true'
  const avatarSrc = imgSrc(config?.avatar)

  useEffect(() => {
    let alive = true
    getSession()
      .then((body) => {
        if (alive) setSession({ checking: false, user: body.user || null })
      })
      .catch(() => {
        if (alive) setSession({ checking: false, user: null })
      })
    return () => { alive = false }
  }, [])

  return (
    <PageTransition>
      <section className="aether-hero">
        <motion.div className="container aether-hero__inner" {...motionProps}>
          <motion.div className="aether-hero__avatar" {...itemMotion} aria-hidden="true">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" style={{ objectPosition: imgFocus(config?.avatar) }} />
            ) : (
              <span>A</span>
            )}
          </motion.div>
          <motion.span className="eyebrow aether-hero__eyebrow" {...itemMotion}>
            Woltar Nova · vitrine RP
          </motion.span>
          <motion.h1 className="aether-hero__title" {...itemMotion}>
            Aether
          </motion.h1>
          <motion.p className="aether-hero__lead" {...itemMotion}>
            Suis ton cœur. Pour le reste, demande-moi.
          </motion.p>
        </motion.div>
      </section>

      <div className="container aether-chat-wrap">
        {enabled && !session.checking && session.user ? (
          <ChatWidget
            title={config?.name || 'Aether'}
            avatarSrc={avatarSrc}
            avatarFocus={imgFocus(config?.avatar)}
            greeting={config?.greeting}
            sendMessage={(messages) => sendAetherMessage(messages)}
            variant="page"
          />
        ) : !session.checking && !session.user ? (
          <div className="aether-disabled">
            <p>Connecte-toi pour parler à Aether.</p>
          </div>
        ) : (
          <div className="aether-disabled">
            <p>Aether n&rsquo;est pas encore activé sur ce site.</p>
          </div>
        )}
        <AetherAbout />
      </div>
    </PageTransition>
  )
}
