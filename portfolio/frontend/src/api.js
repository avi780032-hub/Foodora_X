import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 12000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodorax-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
}

export default api
