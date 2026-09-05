import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Predict from './pages/Predict'
import About from './pages/About'
import HowItWorks from './pages/HowItWorks'
import Symptoms from './pages/Symptoms'
import Help from './pages/Help'

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content main-wide">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/symptoms" element={<Symptoms />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
