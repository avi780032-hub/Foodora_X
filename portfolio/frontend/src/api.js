import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL?.trim()
const api = axios.create({
  baseURL: apiUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : undefined),
  timeout: 12000,
})

api.interceptors.request.use((config) => {
  if (import.meta.env.PROD && !apiUrl) {
    throw new Error('The API is not configured. Set VITE_API_URL in the Vercel project settings and redeploy.')
  }
  const token = localStorage.getItem('foodorax-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function getErrorMessage(error) {
  if (error.code === 'ERR_NETWORK') {
    return 'Cannot connect to FoodoraX API. Check that VITE_API_URL points to your deployed backend and that its CLIENT_URL allows this Vercel domain.'
  }
  return error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
}

export default api
