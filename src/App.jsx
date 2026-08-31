import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import Ambient from './components/Ambient/Ambient.jsx'
import AmbientAudio from './components/AmbientAudio/AmbientAudio.jsx'
import Home from './pages/Home/Home.jsx'
import Journal from './pages/Journal/Journal.jsx'
import PostDetail from './pages/Journal/PostDetail.jsx'
import Gallery from './pages/Gallery/Gallery.jsx'
import Tag from './pages/Tag/Tag.jsx'
import Characters from './pages/Characters/Characters.jsx'
import CharacterDetail from './pages/CharacterDetail/CharacterDetail.jsx'
import Universe from './pages/Universe/Universe.jsx'
import Clans from './pages/Clans/Clans.jsx'
import ClanDetail from './pages/ClanDetail/ClanDetail.jsx'
import Locations from './pages/Locations/Locations.jsx'
import LocationDetail from './pages/LocationDetail/LocationDetail.jsx'
import Chronology from './pages/Chronology/Chronology.jsx'
import Archives from './pages/Archives/Archives.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'

// L'admin est chargé à la demande : son code n'alourdit pas le site public.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const AccountApp = lazy(() => import('./account/AccountApp.jsx'))

function SiteShell() {
  return (
    <div className="page">
      <Ambient />
      <AmbientAudio />
      <Header />
      <main className="page-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:id" element={<PostDetail />} />
          <Route path="/galerie" element={<Gallery />} />
          <Route path="/tag/:tag" element={<Tag />} />
          <Route path="/personnages" element={<Characters />} />
          <Route path="/personnages/:id" element={<CharacterDetail />} />
          <Route path="/univers" element={<Universe />} />
          <Route path="/clans" element={<Clans />} />
          <Route path="/clans/:id" element={<ClanDetail />} />
          <Route path="/lieux" element={<Locations />} />
          <Route path="/lieux/:id" element={<LocationDetail />} />
          <Route path="/chronologie" element={<Chronology />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="adm-loading">Chargement de l’administration…</div>}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route
        path="/compte/*"
        element={
          <Suspense fallback={<div className="adm-loading">Chargement de l’espace compte…</div>}>
            <AccountApp />
          </Suspense>
        }
      />
      <Route path="*" element={<SiteShell />} />
    </Routes>
  )
}
