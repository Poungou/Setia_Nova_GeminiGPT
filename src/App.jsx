import { Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import Home from './pages/Home/Home.jsx'
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

export default function App() {
  return (
    <div className="page">
      <Header />
      <main className="page-main">
        <Routes>
          <Route path="/" element={<Home />} />
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
