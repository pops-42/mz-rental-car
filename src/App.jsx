import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Reservation from './Reservation'
import Admin from './Admin'
import CarDetails from './CarDetails'
import logo from './assets/logo.png'
export default function App() {
  const [cars, setCars] = useState([])
  const [exchangeRate, setExchangeRate] = useState(278)
const [page, setPage] = useState('home')
useEffect(() => {
  if (window.location.pathname === '/admin') {
    setPage('admin')
  }
}, [])
const [selectedCar, setSelectedCar] = useState(null)
  useEffect(() => {
    getCars()
    getSettings()
  }, [])

  async function getCars() {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.log(error)
    } else {
      setCars(data)
    }
  }
  async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()

  if (!error && data) {
    setExchangeRate(data.euro_to_dzd)
  }
}

  function getCarInfos(carName) {
    if (carName.includes('Geely')) {
      return ['⚙ Boîte auto', '🌞 Toit ouvrant', '📷 Caméra recul', '📱 Écran tactile']
    }

    if (carName.includes('Kia')) {
      return ['🌞 Toit panoramique', '🔥 Sièges chauffants', '🛣 Régulateur', '✨ Confort premium']
    }

   return []
}

if (page === 'reservation') {
  return (
    <Reservation
      selectedCar={selectedCar}
      onBack={() => setPage('details')}
    />
  )
}
if (page === 'admin') {
  return <Admin onBack={() => setPage('home')} />
}
if (page === 'details' && selectedCar) {
  return (
    <CarDetails
      car={selectedCar}
      onBack={() => setPage('home')}
      onReserve={(car) => {
        setSelectedCar(car)
        setPage('reservation')
      }}
    />
  )
}
return (
  
    <div>
  <header className="header">
    <img
      src={logo}
      alt="MZ Rental Car Alger"
      className="site-logo"
    />
  </header>

      <nav className="nav">
        <a
  className="active"
  href="#"
  onClick={() => setPage('home')}
>
  Accueil
</a>
        <a
  href="https://wa.me/213659210893?text=Bonjour%2C%20je%20souhaite%20vous%20contacter%20pour%20une%20location."
  target="_blank"
>
  Contact
</a>


      </nav>

      <section className="hero">
        <div className="hero-content">
          <h2>Explorer l’Algérie<br />en toute liberté</h2>
          <p>
            Des voitures fiables, un service de qualité<br />
            et la liberté d’aller où vous voulez.
          </p>
        </div>
      </section>

      <section className="services">
        <h2>🎁 Livraison gratuite dans tout Alger</h2>
        <p>Offert par MZ Rental Car</p>

        <div className="services-grid">
          <div>⚡ Prise en charge immédiate<br />7j/7 - 24h/24</div>
          <div>💵 Paiement en DA accepté</div>
        </div>
      </section>

      <section className="cars-section" id="voitures">
        <h2 className="section-title">Nos voitures disponibles</h2>
        <div className="decor">🚗</div>

        <div className="cars">
          {cars.map((car) => (
            <div className="car" key={car.id}>
              <img src={car.image_url} alt={car.name} />

              <h3>{car.name}</h3>

              <div className="infos">
  {(car.features ? car.features.split('\n') : getCarInfos(car.name))
    .filter((feature) => feature.trim() !== '')
    .map((feature, index) => (
      <span key={index}>{feature}</span>
    ))}
</div>

              <p className="price">
                {car.price_eur} € / jour<br />
                <span>
  (≈ {(car.price_eur * exchangeRate).toLocaleString('fr-FR')} DA)
</span>
              </p>

              <button
  className="btn"
  onClick={() => {
    setSelectedCar(car)
    setPage('details')
  }}
>
  Réserver
</button>
            </div>
          ))}
        </div>
      </section>

      <section className="whatsapp-section">
        <h3>Une question ?</h3>
        <p>Réservation disponible sur WhatsApp 24h/24</p>
        <a
          className="whatsapp-btn"
          href="https://wa.me/213659210893?text=Bonjour%2C%20je%20souhaite%20avoir%20des%20informations%20pour%20une%20location%20de%20voiture."
          target="_blank"
        >
          💬 Contacter sur WhatsApp
        </a>
      </section>

      <footer>
        © 2026 MZ Rental Car Alger — Location de voitures à Alger
      </footer>
    </div>
  )
}