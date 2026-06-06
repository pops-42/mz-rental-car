import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import emailjs from '@emailjs/browser'

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]
const EMAILJS_SERVICE_ID = 'service_ty3lrmi'
const EMAILJS_TEMPLATE_ID = 'template_9so1k6e'
const EMAILJS_PUBLIC_KEY = 'pwy2A9hxaNwhnGZEy'
export default function Reservation({ onBack }) {
  const [cars, setCars] = useState([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedStart, setSelectedStart] = useState(null)
  const [selectedEnd, setSelectedEnd] = useState(null)
  const [blockedDates, setBlockedDates] = useState([])
  const [exchangeRate, setExchangeRate] = useState(278)
  const [rentalOffer, setRentalOffer] = useState('illimite')

 const [form, setForm] = useState({
  name: '',
  phone: '',
  email: '',
  message: ''
  
})

  useEffect(() => {
    loadCars()
     getSettings()
  }, [])

  useEffect(() => {
    if (selectedCarId) {
      loadBlockedDates()
      setSelectedStart(null)
      setSelectedEnd(null)
    }
  }, [selectedCarId])

  async function loadCars() {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) {
      setCars(data)
      if (data.length > 0) {
        setSelectedCarId(data[0].id)
      }
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

  async function loadBlockedDates() {
    const { data, error } = await supabase
      .from('blocked_dates')
      .select('date')
      .eq('car_id', selectedCarId)

    if (!error) {
      setBlockedDates(data.map((item) => item.date))
    }
  }

  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function displayDate(dateString) {
    const parts = dateString.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  function selectedCar() {
    return cars.find((car) => car.id === selectedCarId)
  }

  function isUnavailable(dateString) {
    const today = formatDate(new Date())

    if (dateString < today) {
      return true
    }

    return blockedDates.includes(dateString)
  }

  function hasUnavailableInRange(start, end) {
    let current = new Date(start)
    const last = new Date(end)

    while (current <= last) {
      if (isUnavailable(formatDate(current))) {
        return true
      }

      current.setDate(current.getDate() + 1)
    }

    return false
  }

  function selectDate(dateString) {
    if (isUnavailable(dateString)) return

    if (!selectedStart || selectedEnd) {
      setSelectedStart(dateString)
      setSelectedEnd(null)
    } else {
      let start = selectedStart
      let end = dateString

      if (dateString < selectedStart) {
        start = dateString
        end = selectedStart
      }

      if (hasUnavailableInRange(start, end)) {
        alert('Cette période contient une date indisponible. Veuillez choisir une autre période.')
        setSelectedStart(null)
        setSelectedEnd(null)
        return
      }

      setSelectedStart(start)
      setSelectedEnd(end)
    }
  }

  function calculateDays() {
    if (!selectedStart || !selectedEnd) return 0

    const start = new Date(selectedStart)
    const end = new Date(selectedEnd)
    const difference = end - start

    return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1
  }

  function getCalendarDays() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startDay = firstDay.getDay()
    startDay = startDay === 0 ? 7 : startDay

    const days = []

    for (let i = 1; i < startDay; i++) {
      days.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

 async function sendReservation() {
  const car = selectedCar()
  

  if (!form.name || !form.phone || !form.email || !selectedStart || !selectedEnd || !car) {
    alert('Veuillez remplir votre nom, téléphone, email et choisir les dates.')
    return
  }

  const days = calculateDays()
const pricePerDay =
  rentalOffer === 'limite'
    ? car.price_eur - 5
    : car.price_eur

const total = days * pricePerDay
const totalDa = total * exchangeRate

  const { error } = await supabase.from('reservations').insert({
    car_id: car.id,
    start_date: selectedStart,
    end_date: selectedEnd,
    customer_name: form.name,
    customer_phone: form.phone,
    customer_email: form.email,
    customer_message: form.message,
    rental_offer: rentalOffer,
  })

  if (error) {
    alert('Erreur lors de la réservation.')
    console.log(error)
    return
  }

  const datesToBlock = []
  let current = new Date(selectedStart)
  const end = new Date(selectedEnd)

  while (current <= end) {
    datesToBlock.push({
      car_id: car.id,
      date: formatDate(current)
    })

    current.setDate(current.getDate() + 1)
  }

  const { error: blockError } = await supabase
    .from('blocked_dates')
    .insert(datesToBlock)

  if (blockError) {
    console.log(blockError)
  }

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      customer_name: form.name,
      customer_email: form.email,
      car_name: car.name,
      start_date: displayDate(selectedStart),
      end_date: displayDate(selectedEnd),
      customer_phone: form.phone,
      customer_message: form.message || 'Aucun message',
      rental_offer:
  rentalOffer === 'limite'
    ? '200 km / jour inclus'
    : 'Kilométrage illimité',
      total_price: total,
      total_da: totalDa.toLocaleString('fr-FR')
    },
    EMAILJS_PUBLIC_KEY
  )

  alert('Réservation enregistrée avec succès.')

  setForm({
    name: '',
    phone: '',
    email: '',
    message: ''
  })

  setSelectedStart(null)
  setSelectedEnd(null)
  loadBlockedDates()
}

 const car = selectedCar()
const days = calculateDays()

const pricePerDay = car
  ? rentalOffer === 'limite'
    ? car.price_eur - 5
    : car.price_eur
  : 0

const total = car ? days * pricePerDay : 0
const totalDa = total * exchangeRate

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
          href="https://wa.me/213659210893?text=Bonjour%2C%20je%20souhaite%20vous%20contacter%20pour%20une%20location."
          target="_blank"
        >
          Contact
        </a>
      </nav>

      <main className="page">
        <section className="intro">
          <h2>Réserver une voiture</h2>
          <p>Choisissez votre voiture, sélectionnez vos dates disponibles, puis validez votre réservation.</p>
        </section>

        <section className="reservation-box">
          <div className="card">
            <h3>1. Choisir la voiture</h3>

            {car && (
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <img
                  src={car.image_url}
                  alt={car.name}
                  style={{
                    width: '100%',
                    maxHeight: '180px',
                    objectFit: 'contain',
                    borderRadius: '10px',
                    background: '#f3eadb',
                    padding: '10px'
                  }}
                />
              </div>
            )}

            <label>Voiture</label>
<select
  value={selectedCarId}
  onChange={(e) => setSelectedCarId(e.target.value)}
>
  {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} - {car.price_eur}€/jour
                </option>
              ))}
            </select>
            <label>Offre de location</label>

<select
  value={rentalOffer}
  onChange={(e) => setRentalOffer(e.target.value)}
>
  <option value="illimite">
    Kilométrage illimité
  </option>

  <option value="limite">
    200 km / jour inclus (-5 € / jour)
  </option>
</select>

            <h3 style={{ marginTop: '25px' }}>2. Vos informations</h3>

            <label>Nom complet</label>
            <input
              type="text"
              placeholder="Ex : Mohamed Benali"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <label>Téléphone</label>
            <input
              type="tel"
              placeholder="Ex : 0550 00 00 00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <label>Email</label>

<input
  type="email"
  placeholder="Ex : client@email.com"
  value={form.email}
  onChange={(e) => setForm({ ...form, email: e.target.value })}
 />

            <label>Message optionnel</label>
            <textarea
              placeholder="Ex : livraison à Alger centre, heure souhaitée..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />

            <div className="summary">
              {!selectedStart && !selectedEnd && (
                <span>Sélectionnez une date de début et une date de fin.</span>
              )}

              {selectedStart && !selectedEnd && (
                <span>
                  Voiture : {car?.name}<br />
                  Date de début : {displayDate(selectedStart)}<br />
                  Sélectionnez maintenant la date de fin.
                </span>
              )}

              {selectedStart && selectedEnd && (
                <>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>🚗 <strong>{car?.name}</strong></div>
                  <div>📅 Du {displayDate(selectedStart)} au {displayDate(selectedEnd)}</div>
                  <div>⏱ Durée : <strong>{days} jour(s)</strong></div>
                  <hr />
                  <div>
  📌 Offre : <strong>
    {rentalOffer === 'limite'
      ? '200 km / jour inclus'
      : 'Kilométrage illimité'}
  </strong>
</div>

{rentalOffer === 'limite' && (
  <div>
    ➕ Kilomètre supplémentaire : <strong>0,10 € / km</strong> (≈ 27 DA)
  </div>
)}

<div>💶 Prix : <strong>{pricePerDay} € / jour</strong></div>
                  <div style={{ fontSize: '22px', marginTop: '8px' }}>Total : <strong>{total} €</strong></div>
                  <div>≈ <strong>{totalDa.toLocaleString('fr-FR')} DA</strong></div>
                  <hr />
                  <div>💰 Caution : <strong>500 €</strong> 
(≈ <strong>{(500 * exchangeRate).toLocaleString('fr-FR')} DA</strong>)</div>
                </>
              )}
            </div>

            <button className="btn" onClick={sendReservation}>
              Réserver maintenant
            </button>
          </div>

          <div className="card">
            <h3>3. Choisir les dates</h3>

            <div className="calendar-header">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                ←
              </button>

              <div className="calendar-title">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>

              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                →
              </button>
            </div>

            <div className="weekdays">
              <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
            </div>

            <div className="calendar">
              {getCalendarDays().map((date, index) => {
                if (!date) {
                  return <div key={index} className="day empty"></div>
                }

                const dateString = formatDate(date)
                const unavailable = isUnavailable(dateString)
                const selected = selectedStart === dateString || selectedEnd === dateString
                const inRange =
                  selectedStart &&
                  selectedEnd &&
                  dateString > selectedStart &&
                  dateString < selectedEnd

                return (
                  <div
                    key={dateString}
                    className={
                      `day ${unavailable ? 'unavailable' : 'available'} ${selected ? 'selected' : ''} ${inRange ? 'range' : ''}`
                    }
                    onClick={() => selectDate(dateString)}
                  >
                    {date.getDate()}
                  </div>
                )
              })}
            </div>

            <div className="legend">
              <span><i className="square green"></i> Disponible</span>
              <span><i className="square red"></i> Indisponible</span>
              <span><i className="square gold"></i> Sélectionné</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        © 2026 MZ Rental Car Alger — Location de voitures à Alger
      </footer>
    </div>
  )
}