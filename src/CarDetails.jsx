import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function CarDetails({ car, onBack, onReserve }) {
  const [gallery, setGallery] = useState([])
  const [mainImage, setMainImage] = useState(car?.image_url)
  const [exchangeRate, setExchangeRate] = useState(278)

  useEffect(() => {
    if (car) {
      setMainImage(car.image_url)
      loadGallery()
      getSettings()
    }
  }, [car])

async function loadGallery() {
  const { data, error } = await supabase
    .from('car_images')
    .select('*')
    .eq('car_id', car.id)

  if (error) {
    console.log(error)
    return
  }

  setGallery(data)
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

  function getSubtitle() {
    if (car.name.includes('Geely')) {
      return 'Un SUV moderne qui allie puissance, élégance et confort pour vos déplacements à Alger et dans toute l’Algérie.'
    }

    if (car.name.includes('Kia')) {
      return 'Un SUV compact haut de gamme avec un confort exceptionnel, idéal pour vos déplacements en ville comme sur route.'
    }

    return 'Un véhicule confortable et fiable pour vos déplacements.'
  }

  function getOptions() {
    if (car.name.includes('Geely')) {
      return ['⚙ Boîte automatique', '🌞 Toit ouvrant', '📷 Caméra de recul', '📱 Écran tactile']
    }

    if (car.name.includes('Kia')) {
      return ['🌞 Toit panoramique', '⚙ Boîte automatique', '🛣 Régulateur de vitesse', '✨ Confort premium']
    }

    return []
  }

  return (
    <div>
      <header className="header">
        <img
          className="flag"
          src="https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg"
          alt="Drapeau Algérie"
        />
        <h1>MZ Rental Car Alger</h1>
      </header>

      <nav className="nav">
        <a href="#" onClick={onBack}>Accueil</a>
        <a
          href="https://wa.me/33686272778?text=Bonjour%2C%20je%20souhaite%20avoir%20des%20informations%20pour%20une%20location%20de%20voiture."
          target="_blank"
        >
          Contact
        </a>
      </nav>

      <main className="page">
        <button className="btn" onClick={onBack} style={{ marginBottom: '20px' }}>
          ← Retour à l’accueil
        </button>

        <section className="car-detail">
          <div className="car-photo">
            <img src={mainImage} alt={car.name} />
          </div>

          <div className="car-info">
            <h2>{car.name}</h2>
           <p className="subtitle">
  {car.description || getSubtitle()}
</p>

            <div className="detail-price">
              <strong>{car.price_eur} € / jour</strong>
              <span>≈ {(car.price_eur * exchangeRate).toLocaleString('fr-FR')} DA / jour</span>
            </div>
            <div className="section" style={{ marginTop: '15px', marginBottom: '25px' }}>
  <h3>Offres de location</h3>

 <div className="conditions">
  <div className="condition">
    ✅ Kilométrage illimité<br />
    <strong>{car.price_eur} € / jour</strong>
  </div>

  <div
  style={{
  margin: '10px 0',
  fontSize: '16px'
}}
>
  OU
</div>

  <div className="condition">
    📍 200 km / jour inclus<br />
    <strong>{car.price_eur - 5} € / jour</strong><br />
    <small>+ 0,10 € / km supplémentaire</small>
  </div>
</div>
</div>
           <div className="options">
  {(car.features ? car.features.split('\n') : getOptions())
    .filter((option) => option.trim() !== '')
    .map((option, index) => (
      <div className="option" key={index}>
        {option}
      </div>
    ))}
</div>

            <button className="btn" onClick={() => onReserve(car)}>
              Réserver cette voiture
            </button>
          </div>
        </section>

        <section className="section">
          <h3>Galerie photos du véhicule</h3>
          <p>Découvrez le véhicule en détail : extérieur, intérieur et options.</p>

          <div className="gallery">
            <img
              src={car.image_url}
              alt="Photo principale"
              onClick={() => setMainImage(car.image_url)}
              className={mainImage === car.image_url ? 'gallery-active' : ''}
            />

            {gallery.map((image) => (
              <img
                key={image.id}
                src={image.image_url}
                alt="Photo véhicule"
                onClick={() => setMainImage(image.image_url)}
                className={mainImage === image.image_url ? 'gallery-active' : ''}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <h3>Services inclus</h3>
          <div className="conditions">
            <div className="condition">🎁 Livraison gratuite dans tout Alger</div>
            <div className="condition">⚡ Prise en charge immédiate 7j/7 - 24h/24</div>
            <div className="condition">💵 Paiement en DA accepté</div>
            <div className="condition">✅ Véhicule propre et contrôlé avant chaque location</div>
          </div>
        </section>

        <section className="section">
          <h3>Conditions de location</h3>
          <div className="conditions">
            <div className="condition">🪪 Permis de conduire obligatoire</div>
            <div className="condition">🆔 Pièce d’identité obligatoire</div>
            <div className="condition">
  💰 Caution : 500 € 
  (≈ {(500 * exchangeRate).toLocaleString('fr-FR')} DA)
</div>
            <div className="condition">📅 Location possible courte ou longue durée</div>
          </div>
        </section>
      </main>

      <section className="whatsapp-section">
        <h3>Une question sur cette voiture ?</h3>
        <p>Contact disponible sur WhatsApp 24h/24</p>
        <a
          className="whatsapp-btn"
          href="https://wa.me/33686272778?text=Bonjour%2C%20je%20souhaite%20avoir%20des%20informations%20pour%20une%20location%20de%20voiture."
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