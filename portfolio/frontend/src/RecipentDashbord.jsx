import { useEffect, useState } from 'react'
import axios from 'axios'
import api, { getErrorMessage } from './api'

export default function RecipientDashboard({ user, logout }) {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [requestingId, setRequestingId] = useState(null)

  const fetchFoods = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('foodorax-token') || localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      // Try via configured api helper first, fallback to axios
      let res
      try {
        res = await api.get('/food/available')
      } catch (e) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        res = await axios.get(`${baseURL}/food/available`, { headers })
      }

      const list = Array.isArray(res.data) ? res.data : (res.data?.foods || [])
      setFoods(list)
    } catch (err) {
      setError(getErrorMessage?.(err) || err.response?.data?.message || err.message || 'Failed to load available food.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  const handleRequestFood = async (foodId) => {
    setRequestingId(foodId)
    setError('')
    setSuccessMessage('')
    try {
      const token = localStorage.getItem('foodorax-token') || localStorage.getItem('token')
      if (!token) {
        setError('Please log in as a recipient (NGO) to request food.')
        return
      }

      const res = await api.post(`/food/${foodId}/accept`)
      const code = res.data?.donation?.verificationCode
      setSuccessMessage(
        res.data?.message || `Food requested successfully! ${code ? `Your pickup verification code is: ${code}` : ''}`
      )
      // Refresh available food list after requesting
      await fetchFoods()
    } catch (err) {
      setError(getErrorMessage?.(err) || err.response?.data?.message || err.message || 'Could not request this food item.')
    } finally {
      setRequestingId(null)
    }
  }

  return (
    <div className="recipient-dashboard-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 6px 0', color: '#111827' }}>Available food</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
            All available surplus food listings ready for recipient claim and pickup.
          </p>
        </div>
        <button
          onClick={fetchFoods}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.9rem',
          }}
        >
          {loading ? 'Refreshing…' : '↻ Refresh food'}
        </button>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>✓ Success: </strong>{successMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Notice: </strong>{error}
        </div>
      )}

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading all available food listings…
        </div>
      )}

      {!loading && foods.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No available food right now</h3>
          <p style={{ margin: 0, color: '#6b7280' }}>When donors list surplus food, it will appear here instantly.</p>
        </div>
      )}

      {!loading && foods.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {foods.map((f) => (
            <div
              key={f._id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {f.image && (
                <img
                  src={f.image}
                  alt={f.title || f.name}
                  style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                />
              )}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '600', color: '#111827' }}>
                    {f.title || f.name}
                  </h3>
                  {f.category && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.category}
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontSize: '0.9rem', fontWeight: '500' }}>
                  {f.quantity} {f.quantityUnit || 'meals'} • {f.location || f.address || f.city || 'Local area'}
                </p>

                {f.description && (
                  <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '0.85rem', flex: 1, lineClamp: 2 }}>
                    {f.description}
                  </p>
                )}

                {f.donor?.name && (
                  <small style={{ color: '#9ca3af', marginBottom: '12px', display: 'block' }}>
                    Donor: {f.donor.name}
                  </small>
                )}

                <button
                  onClick={() => handleRequestFood(f._id)}
                  disabled={requestingId === f._id || f.status !== 'listed'}
                  style={{
                    marginTop: 'auto',
                    padding: '10px 16px',
                    backgroundColor: f.status === 'listed' ? '#111827' : '#9ca3af',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: f.status === 'listed' ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {requestingId === f._id ? 'Requesting…' : f.status === 'listed' ? 'Request food' : 'Claimed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}