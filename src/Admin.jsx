import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const ADMIN_PASSWORD = 'Mehdiloc42_monfrero'

export default function Admin({ onBack }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [cars, setCars] = useState([])
  const [reservations, setReservations] = useState([])
  const [saved, setSaved] = useState(false)
const [galleryImages, setGalleryImages] = useState([])
const [blockedDates, setBlockedDates] = useState([])
const [selectedBlockCar, setSelectedBlockCar] = useState('')
const [selectedBlockDate, setSelectedBlockDate] = useState('')
const [exchangeRate, setExchangeRate] = useState(278)
const [newCar, setNewCar] = useState({
  name: '',
  price_eur: '',
  description: '',
  image_url: '',
  features: ''
})
  useEffect(() => {
    if (loggedIn) {
      loadCars()
      loadReservations()
      loadGalleryImages()
      loadBlockedDates()
      loadSettings()
    }
  }, [loggedIn])

  function login() {
    if (password === ADMIN_PASSWORD) {
      setLoggedIn(true)
    } else {
      alert('Mot de passe incorrect.')
    }
  }
async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()

  if (!error && data) {
    setExchangeRate(data.euro_to_dzd)
  }
}

async function saveSettings() {
  const { error } = await supabase
    .from('settings')
    .update({
      euro_to_dzd: exchangeRate
    })
    .eq('id', 1)

  if (error) {
    console.log(error)
    alert('Erreur sauvegarde taux')
    return
  }

  alert('Taux de change sauvegardé.')
}
  async function loadCars() {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) {
      setCars(data)
    }
  }

  async function loadReservations() {
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        cars (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (!error) {
      setReservations(data)
    } else {
      console.log(error)
    }
  }

  function updateCarField(id, field, value) {
    setCars((previousCars) =>
      previousCars.map((car) =>
        car.id === id ? { ...car, [field]: value } : car
      )
    )
  }


  

 async function uploadImage(event, carId) {
  const file = event.target.files[0]

  if (!file) return

  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('car-photos')
    .upload(fileName, file)

  if (error) {
    alert('Erreur upload image')
    console.log(error)
    return
  }

  const { data } = supabase.storage
    .from('car-photos')
    .getPublicUrl(fileName)

  updateCarField(carId, 'image_url', data.publicUrl)
}

async function uploadGalleryImage(event, carId) {
  const file = event.target.files[0]

  if (!file) return

  const fileName = `${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('car-photos')
    .upload(fileName, file)

  if (error) {
    alert('Erreur upload galerie')
    console.log(error)
    return
  }

  const { data } = supabase.storage
    .from('car-photos')
    .getPublicUrl(fileName)

  const { error: insertError } = await supabase
    .from('car_images')
    .insert({
      car_id: carId,
      image_url: data.publicUrl
    })

  if (insertError) {
    console.log(insertError)
    alert('Erreur insertion galerie')
    return
  }

  alert('Photo galerie ajoutée.')
}
async function loadGalleryImages() {
  const { data, error } = await supabase
    .from('car_images')
    .select('*')

  if (!error) {
    setGalleryImages(data)
  }
}

async function deleteGalleryImage(image) {
  const confirmed = window.confirm('Supprimer cette image ?')

  if (!confirmed) return

  const imagePath = image.image_url.split('/car-photos/')[1]

  const { error: storageError } = await supabase.storage
    .from('car-photos')
    .remove([imagePath])

  if (storageError) {
    console.log(storageError)
    alert('Erreur suppression storage')
    return
  }

  const { error } = await supabase
    .from('car_images')
    .delete()
    .eq('id', image.id)

  if (error) {
    console.log(error)
    alert('Erreur suppression SQL')
    return
  }

  setGalleryImages((previous) =>
    previous.filter((item) => item.id !== image.id)
  )

  alert('Image supprimée complètement.')
}
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
async function deleteReservation(reservation) {
  const confirmed = window.confirm('Supprimer cette réservation et débloquer les dates ?')

  if (!confirmed) return

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservation.id)

  if (error) {
    console.log(error)
    alert('Erreur suppression réservation')
    return
  }

  const datesToDelete = []
  let current = new Date(reservation.start_date)
  const end = new Date(reservation.end_date)

  while (current <= end) {
    datesToDelete.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  const { error: blockedError } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('car_id', reservation.car_id)
    .in('date', datesToDelete)

  if (blockedError) {
    console.log(blockedError)
    alert('Réservation supprimée, mais erreur lors du déblocage des dates.')
  }

  setReservations((previous) =>
    previous.filter((item) => item.id !== reservation.id)
  )

  loadBlockedDates()

  alert('Réservation supprimée et dates débloquées.')
}
async function loadBlockedDates() {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')

  if (!error) {
    setBlockedDates(data)
  }
}

async function addBlockedDate() {
  if (!selectedBlockCar || !selectedBlockDate) {
    alert('Choisissez une voiture et une date.')
    return
  }

  const { error } = await supabase
    .from('blocked_dates')
    .insert({
      car_id: selectedBlockCar,
      date: selectedBlockDate
    })

  if (error) {
    console.log(error)
    alert('Erreur ajout date bloquée')
    return
  }

  loadBlockedDates()

  setSelectedBlockDate('')

  alert('Date bloquée ajoutée.')
}

async function deleteBlockedDate(id) {
  const confirmed = window.confirm('Supprimer cette date bloquée ?')

  if (!confirmed) return

  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id)

  if (error) {
    console.log(error)
    alert('Erreur suppression date')
    return
  }

  setBlockedDates((previous) =>
    previous.filter((item) => item.id !== id)
  )

  alert('Date supprimée.')
}
async function addCar() {
  if (!newCar.name || !newCar.price_eur) {
    alert('Ajoutez au minimum le nom et le prix en euros.')
    return
  }

  const { error } = await supabase
    .from('cars')
    .insert({
      name: newCar.name,
      price_eur: Number(newCar.price_eur),
      price_da: Number(newCar.price_eur) * Number(exchangeRate),
      description: newCar.description,
      image_url: newCar.image_url,
      features: newCar.features
    })

  if (error) {
    console.log(error)
    alert('Erreur lors de l’ajout de la voiture.')
    return
  }

  alert('Voiture ajoutée avec succès.')

  setNewCar({
    name: '',
    price_eur: '',
    description: '',
    image_url: ''
  })

  loadCars()
}
async function deleteCar(car) {
  const confirmed = window.confirm(
    'Supprimer cette voiture ?'
  )

  if (!confirmed) return

  const { error } = await supabase
    .from('cars')
    .delete()
    .eq('id', car.id)

  if (error) {
    console.log(error)
    alert('Erreur suppression voiture.')
    return
  }

  setCars((previous) =>
    previous.filter((item) => item.id !== car.id)
  )

  alert('Voiture supprimée.')
}
  async function saveCars() {
    for (const car of cars) {
      const { error } = await supabase
        .from('cars')
        .update({
  price_eur: Number(car.price_eur),
  price_da: Number(car.price_da),
  image_url: car.image_url,
  description: car.description,
  features: car.features
})
        .eq('id', car.id)

      if (error) {
        alert('Erreur lors de la sauvegarde.')
        console.log(error)
        return
      }
    }

    setSaved(true)

    setTimeout(() => {
      setSaved(false)
    }, 2500)
  }

  if (!loggedIn) {
    return (
      <div>
        <header className="admin-header">
          <h1>Admin - MZ Rental Car Alger</h1>
        </header>

        <main className="admin-container">
          <div className="admin-box">
            <h2>Connexion admin</h2>
            <p>Entrez le mot de passe pour accéder à la gestion du site.</p>

            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="Mot de passe admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={login}>Se connecter</button>

            <p className="small-text">Mot de passe actuel pour test : admin123</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      <header className="admin-header">
        <h1>Admin - MZ Rental Car Alger</h1>
      </header>

      <main className="admin-container">
        <button onClick={onBack}>← Retour au site</button>
        <div className="admin-box">
  <h2>Taux de change</h2>

  <label>1 € = ? DA</label>

  <input
    type="number"
    value={exchangeRate}
    onChange={(e) => setExchangeRate(e.target.value)}
  />

  <button onClick={saveSettings}>
  Sauvegarder le taux
</button>
</div>

<div className="admin-box">
  <h2>Ajouter une voiture</h2>

  <label>Nom du véhicule</label>
  <input
    type="text"
    value={newCar.name}
    onChange={(e) =>
      setNewCar({ ...newCar, name: e.target.value })
    }
  />

  <label>Prix en € / jour</label>
  <input
    type="number"
    value={newCar.price_eur}
    onChange={(e) =>
      setNewCar({ ...newCar, price_eur: e.target.value })
    }
  />

  <label>Description</label>
  <textarea
    value={newCar.description}
    onChange={(e) =>
      setNewCar({ ...newCar, description: e.target.value })
    }
  />
  <label>Options / équipements</label>
<textarea
  placeholder={`⚙ Boîte auto
❄️ Climatisation
📷 Caméra recul`}
  value={newCar.features || ''}
  onChange={(e) =>
    setNewCar({ ...newCar, features: e.target.value })
  }
/>

  <label>Photo principale (URL)</label>
  <input
    type="text"
    value={newCar.image_url}
    onChange={(e) =>
      setNewCar({ ...newCar, image_url: e.target.value })
    }
  />

  <button onClick={addCar}>
    Ajouter la voiture
  </button>
</div>
        <div className="admin-box">
          <h2>Gestion des voitures</h2>
          <p>Modifiez les prix et les photos principales.</p>

          <div className="admin-car-grid">
            {cars.map((car) => (
              <div className="admin-box" key={car.id}>
                <h3>{car.name}</h3>
                <button
  className="delete-btn"
  onClick={() => deleteCar(car)}
>
  Supprimer cette voiture
</button>

                <label>Prix en € / jour</label>
                <input
                  type="number"
                  value={car.price_eur}
                  onChange={(e) => updateCarField(car.id, 'price_eur', e.target.value)}
                />

                <label>Prix en DA / jour</label>
                <input
                  type="number"
                  value={car.price_da}
                  onChange={(e) => updateCarField(car.id, 'price_da', e.target.value)}
                />
<label>Upload photo</label>

<input
  type="file"
  onChange={(e) => uploadImage(e, car.id)}
/>
                <label>Lien photo principale</label>
                <input
                  type="text"
                  value={car.image_url || ''}
                  onChange={(e) => updateCarField(car.id, 'image_url', e.target.value)}
                />
 <label>Description</label>
<textarea
  value={car.description || ''}
  onChange={(e) => updateCarField(car.id, 'description', e.target.value)}
/> 
<label>Options / équipements</label>
<textarea
  value={car.features || ''}
  onChange={(e) => updateCarField(car.id, 'features', e.target.value)}
/>              
<label>Ajouter une photo galerie</label>

<input
  type="file"
  onChange={(e) => uploadGalleryImage(e, car.id)}
/><div className="gallery-admin">
  {galleryImages
    .filter((image) => image.car_id === car.id)
    .map((image) => (
      <div key={image.id} className="gallery-admin-item">
        <img src={image.image_url} alt="Galerie" />

        <button
          className="delete-btn"
          onClick={() => deleteGalleryImage(image)}
        >
          Supprimer
        </button>
      </div>
    ))}
</div>
                {car.image_url && (
                  <img
                    className="preview-img"
                    src={car.image_url}
                    alt={car.name}
                  />
                )}
              </div>
            ))}
          </div>

          <button onClick={saveCars}>Sauvegarder les voitures</button>

          {saved && (
            <div className="success-message">
              Voitures sauvegardées avec succès.
            </div>
          )}
        </div>

        <div className="admin-box">
          <h2>Réservations reçues</h2>

          {reservations.length === 0 && (
            <div className="reservation-item">
              Aucune réservation enregistrée pour le moment.
            </div>
          )}

          {reservations.map((reservation) => (
            <div className="reservation-item" key={reservation.id}>
              <strong>Voiture :</strong> {reservation.cars?.name}<br />
              <strong>Nom :</strong> {reservation.customer_name}<br />
              <strong>Téléphone :</strong> {reservation.customer_phone}<br />
              <strong>Email :</strong> {reservation.customer_email || 'Non renseigné'}<br />
              <strong>Offre :</strong>{' '}
{reservation.rental_offer === 'limite'
  ? '200 km / jour inclus'
  : 'Kilométrage illimité'}
<br />
              <strong>Message :</strong> {reservation.customer_message || 'Aucun message'}<br />
              <strong>Dates :</strong> du {reservation.start_date} au {reservation.end_date}<br />
              <strong>Reçue le :</strong> {new Date(reservation.created_at).toLocaleString('fr-FR')}
              <br />

<button
  className="delete-btn"
  onClick={() => deleteReservation(reservation)}
>
  Supprimer
</button>

</div>
        
          ))}
        </div>
      </main>
    </div>
  )
}