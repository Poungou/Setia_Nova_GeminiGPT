import { motion, useReducedMotion } from 'framer-motion'
import aetherData from '../../data/aether.json'
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
  const reduce = useReducedMotion()
  const motionProps = reduce ? {} : { variants: container, initial: 'hidden', animate: 'show' }
  const itemMotion = reduce ? {} : { variants: item }

  const enabled = config?.enabled === 'true'
  const avatarSrc = imgSrc(config?.avatar)

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
          <motion.p className="aether-hero__sub" {...itemMotion}>
            Personnages, histoires, relations ou simple envie de trouver un RP qui te plaît :
            je peux t&rsquo;orienter.
          </motion.p>
        </motion.div>
      </section>

      <div className="container aether-chat-wrap">
        {enabled ? (
          <ChatWidget
            title={config?.name || 'Aether'}
            avatarSrc={avatarSrc}
            avatarFocus={imgFocus(config?.avatar)}
            greeting={config?.greeting}
            sendMessage={(messages) => sendAetherMessage(messages)}
            variant="page"
          />
        ) : (
          <div className="aether-disabled">
            <p>Aether n&rsquo;est pas encore activé sur ce site.</p>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
