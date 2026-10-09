import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, Polyline, TileLayer } from 'react-leaflet'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Compass, CookingPot, Gift, HandHeart, Heart, Leaf, LogOut,
  MapPin, Menu, PackageCheck, Plus, Search, ShieldCheck, Sparkles, Users, Utensils,
  X, Zap, Star, Navigation, Languages, Eye, EyeOff,
} from 'lucide-react'
import api, { getErrorMessage } from './api'
import RecipientDashboard from './RecipentDashbord'

const foodPhotos = {
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
  meals: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
  rice: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
}
const t = (english, hindi) => localStorage.getItem('foodorax-language') === 'hi' ? hindi : english
const localDateTimeValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}
const foodPinIcon = divIcon({
  className: 'food-pin-icon',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
})

function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('foodorax-token')))
  useEffect(() => {
    if (!localStorage.getItem('foodorax-token')) return setLoading(false)
    api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => {
      localStorage.removeItem('foodorax-token')
    }).finally(() => setLoading(false))
  }, [])
  const logout = () => {
    localStorage.removeItem('foodorax-token')
    setUser(null)
  }
  return { user, setUser, loading, logout }
}

function Brand({ light = false }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><Leaf size={20} fill="currentColor" /></span><span>foodora<span>X</span></span></Link>
}

function Header({ user, logout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [language, setLanguage] = useState(localStorage.getItem('foodorax-language') || 'en')
  const navigate = useNavigate()
  const links = [[t('How it works', 'यह कैसे काम करता है'), '/#how'], [t('Find food', 'भोजन खोजें'), '/#available-food'], [t('Our impact', 'हमारा प्रभाव'), '/#available-food']]
  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en'
    localStorage.setItem('foodorax-language', next)
    setLanguage(next)
  }
  return <header className="site-header"><div className="nav-shell">
    <Brand />
    <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>{links.map(([label, to]) => <Link to={to} key={label} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav>
    <div className="nav-actions">
      <button className="language-toggle" type="button" onClick={toggleLanguage}>{language === 'en' ? 'हिन्दी' : 'English'}</button>
      {user ? <><button className="avatar" aria-label={t('Open my profile', 'मेरी प्रोफ़ाइल खोलें')} title={t('My profile', 'मेरी प्रोफ़ाइल')} onClick={() => navigate('/profile')}>{user.name?.[0]?.toUpperCase()}</button><button className="text-button logout-button" onClick={logout}><LogOut size={16} /> {t('Log out', 'लॉग आउट')}</button></>
        : <><Link className="nav-login" to="/login">{t('Log in', 'लॉग इन')}</Link><Link className="button button-dark button-small" to="/register">{t('Join the movement', 'हमसे जुड़ें')} <ArrowRight size={15} /></Link></>}
      <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>
}

function Footer() {
  return <footer className="footer"><div className="footer-inner"><div><Brand light /><p>Good food deserves a second chance.<br />Together, we can make every meal count.</p></div><div className="footer-links"><a href="/#how">How it works</a><Link to="/#available-food">Find food</Link><Link to="/register">Become a partner</Link><a href="mailto:hello@foodorax.org">Contact us</a></div><div className="footer-note">Made with <Heart size={14} fill="currentColor" /> for a better tomorrow.</div></div><div className="footer-bottom">© 2025 FoodoraX · Turning surplus into smiles.</div></footer>
}

function foodLocationLabel(food) {
  return [food.city, food.state].filter(Boolean).join(', ') || 'Community listing'
}

function AvailableFoodSection() {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/food/available').then(({ data }) => setFoods(data.foods))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])
  return <section className="section page-width" id="available-food"><div className="section-heading"><div className="eyebrow">AVAILABLE FOR FREE</div><h2>Food shared by our community.</h2><p>See currently listed food and its pickup window. Sign in as a verified NGO partner to claim a listing at no cost.</p></div>
    {error ? <div className="inline-error">{error}</div> : loading ? <div className="dashboard-loading"><span className="spinner" />Loading available food…</div> : foods.length ? <div className="food-grid">{foods.map((food) => <article className="food-card" key={food._id}><div className="food-image-wrap"><img src={food.image || foodPhotos.meals} alt={food.name} /><span className="food-fresh"><i />{food.demoOnly ? 'Demo sample · not claimable' : 'Available now'}</span></div><div className="food-card-body"><div className="food-card-top"><span className="food-category">{food.category}</span><span className="food-distance">{foodLocationLabel(food)}</span></div><h2>{food.name}</h2><p className="food-description">{food.description || 'Fresh surplus food shared for free with the community.'}</p><div className="food-details"><span><Utensils size={14} /><b>{food.quantity} {food.quantityUnit || 'meals'}</b></span><span><Clock3 size={14} />Pickup {new Date(food.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div><div className="food-card-actions">{food.demoOnly ? <span className="map-link">Sample data only</span> : <Link className="button button-dark button-small" to="/discover">Sign in to find and claim <ArrowRight size={14} /></Link>}</div></div></article>)}</div> : <div className="empty-state"><span><Utensils size={22} /></span><b>No food listings right now</b><p>Newly published food will appear here as soon as a donor shares it.</p><Link to="/register?role=donor" className="button button-outline">Share food with your community</Link></div>}
    <div className="section-heading"><Link className="button button-outline" to="/discover">Explore all available food <ArrowRight size={15} /></Link></div>
  </section>
}

function PublicDiscoverPage() {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ category: '', search: '', minQuantity: '' })
  const load = () => {
    setLoading(true)
    setError('')
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    api.get('/food/available', { params })
      .then(({ data }) => setFoods(Array.isArray(data) ? data : (data?.foods || [])))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filters.category, filters.search, filters.minQuantity])
  return <><Header user={null} /><main className="section page-width"><div className="section-heading"><div className="eyebrow">AVAILABLE FOR FREE</div><h1>Explore available food.</h1><p>Browse current listings before you sign in. Food is shared free of charge; verified NGO partners can claim it.</p></div>
    <div className="filter-bar"><label className="search-filter"><Search size={17} /><input aria-label="Search available food" placeholder="Search food or city…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label><select aria-label="Food category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((category) => <option key={category}>{category}</option>)}</select><label className="min-quantity"><span>Min. quantity</span><input aria-label="Minimum quantity" type="number" min="1" placeholder="Any" value={filters.minQuantity} onChange={(event) => setFilters({ ...filters, minQuantity: event.target.value })} /></label><button className="icon-button filter-refresh" onClick={load} aria-label="Refresh food listings"><ArrowDown size={16} /></button></div>
    {error && <div className="inline-error">{error}<button onClick={load}>Try again</button></div>}
    {loading ? <div className="dashboard-loading"><span className="spinner" />Loading available food…</div> : foods.length ? <div className="food-grid">{foods.map((food) => <article className="food-card" key={food._id}><div className="food-image-wrap"><img src={food.image || foodPhotos.meals} alt={food.name} /><span className="food-fresh"><i />{food.demoOnly ? 'Demo sample · not claimable' : 'Available now'}</span></div><div className="food-card-body"><div className="food-card-top"><span className="food-category">{food.category}</span><span className="food-distance">{foodLocationLabel(food)}</span></div><h2>{food.name}</h2><p className="food-description">{food.description || 'Fresh surplus food shared for free with the community.'}</p><div className="food-details"><span><Utensils size={14} /><b>{food.quantity} {food.quantityUnit || 'meals'}</b></span><span><Clock3 size={14} />Pickup {new Date(food.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div><div className="food-card-actions">{food.demoOnly ? <span className="map-link">Sample data only</span> : <><Link className="button button-dark button-small" to="/login">Log in to claim <ArrowRight size={14} /></Link><Link className="map-link" to="/register?role=ngo">Join as NGO</Link></>}</div></div></article>)}</div> : <div className="empty-state"><span><Utensils size={22} /></span><b>No available food matches your search</b><p>Try a different search or check back later for new listings.</p><button className="button button-outline" onClick={() => setFilters({ category: '', search: '', minQuantity: '' })}>Clear filters</button></div>}
  </main><Footer /></>
}

function Home() {
  return <><section className="hero-wrap"><div className="hero page-width">
    <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> GOOD FOOD. GOOD PEOPLE. BETTER FUTURE.</div>
      <h1>Turning surplus<br />into <span>smiles.</span></h1><p className="hero-subtitle">AI-powered food rescue that brings fresh, surplus food to the communities who need it most.</p>
      <div className="hero-actions"><Link to="/register?role=donor" className="button button-orange">Donate food <ArrowRight size={17} /></Link><Link to="/#available-food" className="button button-outline">Find food <ArrowUpRight size={16} /></Link></div>
      <div className="social-proof"><div className="avatar-stack"><span>R</span><span>A</span><span>M</span><span>+</span></div><p><b>Good things happen nearby.</b><br />Join 2,400+ local changemakers</p></div>
    </div>
    <div className="hero-visual"><img className="hero-image" src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1300&q=90" alt="Fresh healthy food ready to be shared" />
      <div className="floating-tag floating-meals"><span className="float-icon green"><HandHeart size={18} /></span><span><b>12,450+</b><small>meals rescued</small></span><ArrowUpRight size={16} /></div>
      <div className="floating-tag floating-nearby"><span className="live-dot" /><span><b>Fresh food nearby</b><small>3 new listings around you</small></span></div>
      <div className="hero-orbit"><Leaf size={22} /></div>
    </div>
  </div><div className="hero-bottom page-width"><span><ShieldCheck size={16} /> Verified community partners</span><span><Zap size={16} /> Smart local matching</span><span><MapPin size={16} /> Always close to home</span></div></section>
  <section className="impact-strip" id="impact"><div className="page-width impact-grid">
    {[['12,450+', 'Meals rescued', HandHeart], ['3,240 kg', 'Food kept in use', Leaf], ['8,700+', 'People supported', Users], ['82', 'Verified NGOs', ShieldCheck]].map(([value, label, Icon]) => <div className="impact-item" key={label}><div className="impact-icon"><Icon size={19} /></div><div><b>{value}</b><span>{label}</span></div></div>)}
  </div></section>
  <section className="section page-width problem-section"><div className="section-heading"><div className="eyebrow">A SIMPLE IDEA. A BIG DIFFERENCE.</div><h2>Too much food goes to waste.<br /><span>Too many people go without.</span></h2><p>FoodoraX connects those two realities with a little technology and a lot of community.</p></div>
    <div className="problem-cards"><article className="problem-card problem-waste"><div className="card-topline"><span>THE CHALLENGE</span><span className="round-icon orange-soft"><CookingPot size={20} /></span></div><h3>Good food, going nowhere.</h3><p>Every day, perfectly good meals from kitchens, events and markets are left behind.</p><div className="card-stat"><b>1.3B</b><span>tonnes of food wasted globally each year</span></div></article>
      <article className="problem-card problem-answer"><div className="card-topline"><span>OUR ANSWER</span><span className="round-icon green-soft"><Sparkles size={20} /></span></div><h3>A better route for every meal.</h3><p>We help local food providers and verified community partners meet at just the right time.</p><div className="card-stat"><b>1 tap</b><span>to turn surplus into something meaningful</span></div></article>
    </div>
  </section>
  <section className="feature-section page-width"><div className="feature-visual"><img src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85" alt="Community members preparing and sharing food" /><div className="feature-badge"><span><Check size={17} /></span><div><b>Every handoff matters</b><small>Verified, tracked, delivered</small></div></div></div><div className="feature-copy"><div className="eyebrow">TECH WITH A HUMAN SIDE</div><h2>Smarter matches.<br /><span>Warmer hearts.</span></h2><p>We make food rescue feel effortless with tools designed to get good food moving before time runs out.</p><ul>{[['Match by distance and need', 'Connect with the closest partner ready to collect.'], ['Know where every meal goes', 'Follow donations from listing to delivery in real time.'], ['Trust the handoff', 'Verified partners and secure pickup codes build confidence.']].map(([title, copy]) => <li key={title}><span><Check size={15} /></span><div><b>{title}</b><small>{copy}</small></div></li>)}</ul><Link to="/register" className="button button-dark">Be part of it <ArrowRight size={16} /></Link></div></section>
  <section className="testimonial-section"><div className="page-width testimonial-content"><div className="eyebrow">BETTER, TOGETHER</div><div className="quote-mark">“</div><blockquote>FoodoraX has made it so easy to share what we have with people who need it. It turns the end of every service into a new beginning.</blockquote><div className="quote-author"><div className="quote-avatar">SK</div><div><b>Sarah K.</b><span>Community kitchen partner · Bengaluru</span></div></div><div className="quote-decoration"><Leaf size={34} /><Leaf size={22} /></div></div></section>
  <AvailableFoodSection />
  <section className="cta-section page-width"><div className="cta-card"><div className="cta-deco"><Leaf /><Leaf /></div><div><span className="eyebrow">YOUR NEIGHBOURHOOD IS READY</span><h2>There’s a place for<br />everyone at this table.</h2><p>Whether you have food to share or a community to feed, we’re glad you’re here.</p></div><div className="cta-buttons"><Link to="/register?role=donor" className="button button-orange">I have food to share <ArrowRight size={16} /></Link><Link to="/register?role=ngo" className="button button-light">I’m an NGO partner <ArrowRight size={16} /></Link></div></div></section>
  <section className="how-section" id="how"><div className="page-width"><div className="section-heading center-heading"><div className="eyebrow">GOOD FOOD. THREE EASY STEPS.</div><h2>Rescue a meal.<br /><span>Spread a little joy.</span></h2></div><div className="steps-grid">
    {[[Gift, '01', 'Share your surplus', 'A restaurant, campus or local event lists food that is fresh, safe and ready to share.'], [Sparkles, '02', 'Get a smart match', 'Our matching engine finds a nearby verified partner with the right needs and pickup window.'], [PackageCheck, '03', 'Make someone’s day', 'The partner picks up, verifies the handoff and gets good food to their community.']].map(([Icon, number, title, copy]) => <article className="step-card" key={number}><div className="step-icon"><Icon size={23} /><span>{number}</span></div><h3>{title}</h3><p>{copy}</p></article>)}
  </div></div></section><Footer /></>
}

function AuthPage({ mode, setUser }) {
  const register = mode === 'register'
  const [language, setLanguage] = useState(localStorage.getItem('foodorax-language') || 'en')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', whatsappNumber: '', city: '', role: new URLSearchParams(window.location.search).get('role') || 'donor', address: '', latitude: '', longitude: '', quantityNeeded: '', preferredCategories: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [located, setLocated] = useState(false)
  const navigate = useNavigate()
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en'
    localStorage.setItem('foodorax-language', next)
    setLanguage(next)
  }
  const locateMe = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.')
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setForm((old) => ({ ...old, latitude: coords.latitude, longitude: coords.longitude }))
      setLocated(true)
    }, () => setError('Could not get your location. You can continue without it.'), { enableHighAccuracy: true, timeout: 8000 })
  }
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const endpoint = register ? '/auth/register' : '/auth/login'
      const payload = register ? { ...form, city: form.city.trim(), whatsappNumber: form.whatsappNumber.trim(), quantityNeeded: Number(form.quantityNeeded || 0), location: { type: 'Point', coordinates: form.longitude && form.latitude ? [Number(form.longitude), Number(form.latitude)] : [] } } : { email: form.email, password: form.password }
      const { data } = await api.post(endpoint, payload)
      localStorage.setItem('foodorax-token', data.token)
      setUser(data.user)
      navigate(register ? '/profile' : '/dashboard')
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }
  const createDemoAccount = async () => {
    setError('')
    setBusy(true)
    const demoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const roleName = form.role === 'ngo' ? 'Recipient' : form.role === 'volunteer' ? 'Volunteer' : 'Donor'
    try {
      const { data } = await api.post('/auth/register', {
        name: `Demo ${roleName}`,
        email: `demo-${form.role}-${demoId}@example.test`,
        password: `FoodoraX-Demo-${demoId}`,
        role: form.role,
        city: 'Bengaluru',
        address: 'FoodoraX demo location',
        quantityNeeded: form.role === 'ngo' ? 20 : 0,
        preferredCategories: form.role === 'ngo' ? ['Prepared meals'] : [],
        location: { type: 'Point', coordinates: [] },
      })
      localStorage.setItem('foodorax-token', data.token)
      setUser(data.user)
      navigate('/dashboard')
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }
  return <main className="auth-layout"><div className="auth-story"><Brand light /><div className="auth-story-content"><span className="eyebrow">{t('A LITTLE GOOD GOES A LONG WAY', 'छोटी सी मदद, बड़ा बदलाव')}</span><h1>{t('One meal can', 'एक भोजन')}<br />{t('change a day.', 'दिन बदल सकता है।')}</h1><p>{t('Join a growing community turning surplus into something wonderful.', 'अतिरिक्त भोजन को नेक काम में बदलने वाले समुदाय से जुड़ें।')}</p><div className="auth-story-stats"><span><b>12,450+</b> {t('meals rescued', 'भोजन बचाए')}</span><span><b>82</b> {t('verified partners', 'सत्यापित भागीदार')}</span></div></div><div className="auth-story-foot">FoodoraX · {t('Turning surplus into smiles.', 'अतिरिक्त भोजन से मुस्कान तक।')}</div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><div className="auth-back-row"><Link to="/" className="back-home">{t('← Back to home', '← होम पर जाएँ')}</Link><button className="language-toggle" type="button" onClick={toggleLanguage}>{language === 'en' ? 'हिन्दी' : 'English'}</button></div><div className="auth-heading"><span className="eyebrow">{register ? t('WELCOME TO THE TABLE', 'हमारे साथ जुड़ें') : t('GOOD TO HAVE YOU BACK', 'वापसी पर स्वागत है')}</span><h2>{register ? t('Let’s do some good.', 'आइए, कुछ अच्छा करें।') : t('Welcome back.', 'वापसी पर स्वागत है।')}</h2><p>{register ? t('Create your account and find your place in the movement.', 'अपना खाता बनाएँ और इस मुहिम से जुड़ें।') : t('Log in to pick up where the good left off.', 'लॉग इन करके अपना काम जारी रखें।')}</p></div>
      <form onSubmit={submit} className="auth-form">
        {register && <label>{t('Your name', 'आपका नाम')}<input name="name" placeholder={t('e.g. Priya Sharma', 'जैसे: प्रिया शर्मा')} value={form.name} onChange={update} autoComplete="name" required /></label>}
        <label>{t('Email address', 'ईमेल पता')}<input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={update} autoComplete="email" required /></label>
        {register && <label>{t("I'm joining as", 'मैं जुड़ रहा/रही हूँ')}<select name="role" value={form.role} onChange={update}><option value="donor">{t('A food donor', 'खाद्य दाता')}</option><option value="ngo">{t('An NGO / recipient', 'NGO / प्राप्तकर्ता')}</option><option value="volunteer">{t('A volunteer pickup partner', 'वॉलिंटियर पिकअप पार्टनर')}</option></select></label>}
        <label>{t('Password', 'पासवर्ड')}<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} placeholder={register ? t('At least 8 characters', 'कम से कम 8 अक्षर') : t('Enter your password', 'अपना पासवर्ड डालें')} value={form.password} onChange={update} autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required /><button className="password-toggle" type="button" aria-label={showPassword ? t('Hide password', 'पासवर्ड छिपाएँ') : t('Show password', 'पासवर्ड दिखाएँ')} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {register && <><label>{t('Phone number', 'फ़ोन नंबर')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span><input name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={update} /></label><label>{t('WhatsApp number', 'व्हाट्सऐप नंबर')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span><input name="whatsappNumber" type="tel" placeholder="+91 98765 43210" value={form.whatsappNumber} onChange={update} /></label><label>{t('City', 'शहर')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span><input name="city" placeholder={t('Bengaluru', 'बेंगलुरु')} value={form.city} onChange={update} /></label><label>{t('Organization / pickup address', 'संस्था / पिकअप पता')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span><input name="address" placeholder={t('Area, city', 'इलाका, शहर')} value={form.address} onChange={update} /></label>{form.role === 'ngo' && <><label>{t('Meals your organization can use', 'आपकी संस्था को कितने भोजन चाहिए')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span><input name="quantityNeeded" type="number" min="0" placeholder="40" value={form.quantityNeeded} onChange={update} /></label><div className="category-preferences"><span>{t('Food preferences', 'भोजन की पसंद')} <span className="optional">{t('(optional)', '(वैकल्पिक)')}</span></span><div>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((category) => <label key={category}><input type="checkbox" checked={form.preferredCategories.includes(category)} onChange={(e) => setForm((old) => ({ ...old, preferredCategories: e.target.checked ? [...old.preferredCategories, category] : old.preferredCategories.filter((item) => item !== category) }))} />{category}</label>)}</div></div></>}<button type="button" className={`location-button ${located ? 'location-found' : ''}`} onClick={locateMe}><MapPin size={16} />{located ? t('Location added — nearby matches enabled', 'लोकेशन जुड़ गई — पास के विकल्प सक्रिय') : t('Use my current location for nearby matches', 'पास के विकल्पों के लिए वर्तमान लोकेशन लें')}</button></>}
        {error && <div className="form-error">{error}</div>}
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? t('One moment…', 'एक क्षण…') : register ? t('Create my account', 'खाता बनाएँ') : t('Log in', 'लॉग इन')} <ArrowRight size={16} /></button>
        <button className="button button-outline demo-account-button" type="button" onClick={createDemoAccount} disabled={busy}>{busy ? t('Creating demo account…', 'डेमो खाता बनाया जा रहा है…') : register ? t('Create a demo account', 'डेमो खाता बनाएँ') : t('Try a demo account', 'डेमो खाते से आज़माएँ')} <Sparkles size={16} /></button>
      </form><div className="auth-switch">{register ? t('Already part of the movement?', 'पहले से हमारे साथ हैं?') : t('New to the movement?', 'हमसे पहली बार जुड़ रहे हैं?')} <Link to={register ? '/login' : '/register'}>{register ? t('Log in', 'लॉग इन') : t('Create an account', 'खाता बनाएँ')}</Link></div><div className="auth-safe"><ShieldCheck size={15} /> {t('Your details are safely encrypted.', 'आपकी जानकारी सुरक्षित रूप से एन्क्रिप्टेड है।')}</div></div></div></main>
}

function Protected({ user, loading, children }) {
  if (loading) return <div className="center-loading"><span className="spinner" />Loading your FoodoraX workspace…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function StatusPill({ status }) {
  const label = (status || 'listed').replaceAll('_', ' ')
  return <span className={`status-pill status-${status || 'listed'}`}><i />{label}</span>
}

function relativeDistance(food, user) {
  if (!food.location?.coordinates?.length || !user?.location?.coordinates?.length) return null
  const [lng1, lat1] = food.location.coordinates
  const [lng2, lat2] = user.location.coordinates
  const r = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function NotificationCenter() {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const load = () => api.get('/notifications').then(({ data }) => {
    setItems(data.notifications)
    setUnreadCount(data.unreadCount)
    setError('')
  }).catch((err) => setError(getErrorMessage(err)))
  useEffect(() => {
    load()
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('foodorax-token') } })
    socket.on('notification', load)
    return () => socket.disconnect()
  }, [])
  const markRead = async (item) => {
    if (!item.readAt) {
      try {
        await api.patch(`/notifications/${item._id}/read`)
        await load()
      } catch (err) { setError(getErrorMessage(err)) }
    }
  }
  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      await load()
    } catch (err) { setError(getErrorMessage(err)) }
  }
  return <div className="notification-center">
    <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setOpen(!open)}><Bell size={18} />{unreadCount > 0 && <i />}</button>
    {open && <div className="notification-popover"><div className="notification-heading"><b>Notifications</b><button type="button" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button></div>
      {error && <p className="inline-error">{error}</p>}
      {!items.length ? <p className="notification-empty">No notifications yet.</p> : <div className="notification-list">{items.map((item) => <button type="button" className={`notification-item ${item.readAt ? '' : 'notification-unread'}`} key={item._id} onClick={() => markRead(item)}><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}</div>}
    </div>}
  </div>
}

function DashboardLayout({ user, logout, children, active }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState(localStorage.getItem('foodorax-language') || 'en')
  const setLanguagePreference = () => {
    const next = language === 'en' ? 'hi' : 'en'
    localStorage.setItem('foodorax-language', next)
    setLanguage(next)
  }
  const items = user.role === 'admin' ? [['Overview', '/dashboard', Compass], ['Users', '/admin/users', Users], ['Donors', '/admin/donors', Gift], ['NGO verification', '/admin/ngos', ShieldCheck], ['Food listings', '/discover', Utensils], ['Audit log', '/admin/audit', ShieldCheck], ['My profile', '/profile', Users]] : user.role === 'donor' ? [['Overview', '/dashboard', Compass], ['My donations', '/dashboard?tab=donations', Gift], ['Food requests', '/requests', HandHeart], ['Add food', '/donate', Plus], ['My profile', '/profile', Users]] : [['Overview', '/dashboard', Compass], ['Available food', '/recipient', Utensils], ['Find food', '/discover', Search], ['My requests', '/requests', HandHeart], ['My pickups', '/dashboard?tab=pickups', PackageCheck], ['My profile', '/profile', Users]]
  return <div className="dashboard-shell"><aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><Brand light /><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="sidebar-caption">{t('WORKSPACE', 'कार्यस्थल')}</div><nav className="sidebar-nav">{items.map(([label, path, Icon]) => <Link key={label} to={path} onClick={() => setMobileOpen(false)} className={active === label ? 'sidebar-active' : ''}><Icon size={18} />{t(label, ({ Overview: 'डैशबोर्ड', Users: 'उपयोगकर्ता', Donors: 'दाता', 'NGO verification': 'NGO सत्यापन', 'Food listings': 'खाद्य सूची', 'Audit log': 'ऑडिट लॉग', 'My profile': 'मेरी प्रोफ़ाइल', 'My donations': 'मेरे दान', 'Add food': 'खाना जोड़ें', 'Available food': 'उपलब्ध भोजन', 'Find food': 'खाना खोजें', 'My pickups': 'मेरी पिकअप' })[label] || label)}{label === 'NGO verification' && <span className="nav-count">!</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><CircleHelp size={18} /><div><b>{t('Need a hand?', 'मदद चाहिए?')}</b><span>{t('We’re here for you', 'हम आपकी मदद के लिए हैं')}</span></div><ArrowUpRight size={14} /></div><button className="sidebar-user" onClick={() => navigate('/profile')}><span className="avatar sidebar-avatar">{user.name?.[0]?.toUpperCase()}</span><span><b>{user.name}</b><small>{user.role === 'ngo' ? t('Community partner', 'सामुदायिक भागीदार') : user.role === 'admin' ? t('Administrator', 'प्रशासक') : user.role === 'volunteer' ? t('Volunteer', 'वॉलिंटियर') : t('Food donor', 'खाद्य दाता')}</small></span><ChevronDown size={15} /></button><button className="sidebar-logout" onClick={logout}><LogOut size={15} /> {t('Log out', 'लॉग आउट')}</button></div></aside>
    <main className="dashboard-main"><header className="dashboard-topbar"><button className="icon-button dashboard-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button><span className="crumb">{t('Workspace', 'कार्यस्थल')} <span>/</span> {active}</span><div className="topbar-right"><button className="language-toggle" type="button" onClick={setLanguagePreference}><Languages size={15} />{language === 'en' ? 'हिन्दी' : 'English'}</button><NotificationCenter /><span className="topbar-date"><span className="live-dot" /> {t('All systems growing', 'सभी सिस्टम सक्रिय हैं')}</span><span className="topbar-avatar">{user.name?.[0]?.toUpperCase()}</span></div></header><div className="dashboard-content">{children}</div></main></div>
}

function ProfilePage({ user, logout }) {
  const [ratingInfo, setRatingInfo] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get(`/users/${user.id || user._id}/profile`).then(({ data }) => setRatingInfo(data)).catch((err) => setError(getErrorMessage(err)))
  }, [user.id, user._id])
  return <DashboardLayout user={user} logout={logout} active="My profile"><div className="dashboard-title-row"><div><div className="eyebrow">YOUR COMMUNITY PROFILE</div><h1>{t('Account details.', 'खाता विवरण')}</h1></div></div>
    <section className="dashboard-panel profile-details" aria-label={t('Profile details', 'प्रोफ़ाइल विवरण')}>
      <dl>
        <div><dt>{t('Name', 'नाम')}</dt><dd>{user.name || '—'}</dd></div>
        <div><dt>{t('Email', 'ईमेल')}</dt><dd>{user.email || '—'}</dd></div>
        <div><dt>{t('Phone number', 'फ़ोन नंबर')}</dt><dd>{user.phone || '—'}</dd></div>
        <div><dt>{t('Address', 'पता')}</dt><dd>{user.address || '—'}</dd></div>
      </dl>
    </section>
    {ratingInfo && <section className="dashboard-panel profile-rating"><div><span className="eyebrow">COMMUNITY FEEDBACK</span><h2><Star size={20} fill="currentColor" /> {ratingInfo.rating.averageRating ? ratingInfo.rating.averageRating.toFixed(1) : '—'} / 5</h2><p>{ratingInfo.rating.reviewCount} completed-donation reviews</p></div><div className="profile-reviews">{ratingInfo.reviews.map((review) => <article key={review._id}><b>{review.reviewer?.name}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment || 'No written comment.'}</p></article>)}</div></section>}
    {error && <div className="form-error">{error}</div>}
  </DashboardLayout>
}

function ReviewForm({ donation, user }) {
  const [review, setReview] = useState(null)
  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const load = () => api.get(`/reviews/donation/${donation._id}`).then(({ data }) => {
    setReview(data.reviews.find((item) => String(item.reviewer?._id) === String(user.id || user._id)) || false)
  }).catch((err) => { setError(getErrorMessage(err)); setReview(false) })
  useEffect(() => { load() }, [donation._id])
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('')
    try {
      const { data } = await api.post(`/reviews/donation/${donation._id}`, { rating: Number(rating), comment })
      setReview(data.review)
      setMessage(data.message)
    } catch (err) { setError(getErrorMessage(err)) }
  }
  if (review === null) return null
  return review ? <span className="review-complete"><Star size={13} fill="currentColor" /> Reviewed</span> : <form className="review-form" onSubmit={submit}>
    <select aria-label="Rating" value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? '' : 's'}</option>)}</select>
    <input aria-label="Review comment" maxLength={500} placeholder="Share feedback (optional)" value={comment} onChange={(event) => setComment(event.target.value)} />
    <button type="submit">Review</button>
    {message && <small>{message}</small>}{error && <small className="form-error">{error}</small>}
  </form>
}

function PublicProfilePage({ user, logout }) {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get(`/users/${id}/profile`).then(({ data: result }) => setData(result)).catch((err) => setError(getErrorMessage(err)))
  }, [id])
  const roleLabel = data?.profile.role === 'ngo' ? 'Community partner' : data?.profile.role === 'volunteer' ? 'Volunteer' : 'Food donor'
  return <DashboardLayout user={user} logout={logout} active="Community profile">
    <div className="dashboard-title-row"><div><div className="eyebrow">FOODORAX COMMUNITY</div><h1>{data?.profile.name || 'Community profile'}</h1><p>{data ? `${roleLabel}${data.profile.verified ? ' · Verified' : ''} · ${data.profile.city || data.profile.address || 'Local community'}` : 'Reviews are available after completed donations.'}</p></div><Link className="button button-outline" to="/discover">Back to nearby food</Link></div>
    {error && <div className="inline-error">{error}</div>}
    {data && <section className="dashboard-panel profile-rating"><div><span className="eyebrow">COMMUNITY FEEDBACK</span><h2><Star size={20} fill="currentColor" /> {data.rating.averageRating ? data.rating.averageRating.toFixed(1) : '—'} / 5</h2><p>{data.rating.reviewCount} completed-donation reviews</p></div><div className="profile-reviews">{data.reviews.map((review) => <article key={review._id}><b>{review.reviewer?.name}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment || 'No written comment.'}</p></article>)}{!data.reviews.length && <p>No reviews have been shared yet.</p>}</div></section>}
  </DashboardLayout>
}

function PickupTimeForm({ donation, onUpdated }) {
  const localValue = (date) => {
    const value = new Date(date)
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
    return value.toISOString().slice(0, 16)
  }
  const [pickupTime, setPickupTime] = useState(localValue(donation.pickupTime))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true); setError('')
    try {
      await api.patch(`/donations/${donation._id}/pickup-time`, { pickupTime: new Date(pickupTime).toISOString() })
      onUpdated()
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }
  return <div className="pickup-time-editor"><input type="datetime-local" aria-label="New pickup time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} /><button className="table-action" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Change time'}</button>{error && <small className="form-error">{error}</small>}</div>
}

function RecurringSchedulePanel({ user }) {
  const [schedules, setSchedules] = useState([])
  const [form, setForm] = useState({ name: '', category: 'Prepared meals', quantity: '', quantityUnit: 'meals', address: user.address || '', frequency: 'weekly' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = () => api.get('/recurring').then(({ data }) => setSchedules(data.schedules)).catch((err) => setError(getErrorMessage(err)))
  useEffect(() => { load() }, [])
  const save = async (event) => {
    event.preventDefault(); setError(''); setMessage('')
    try {
      const { data } = await api.post('/recurring', { ...form, quantity: Number(form.quantity) })
      setMessage(data.message)
      setForm({ ...form, name: '', quantity: '' })
      load()
    } catch (err) { setError(getErrorMessage(err)) }
  }
  const toggle = async (schedule) => {
    try {
      await api.patch(`/recurring/${schedule._id}`, { active: !schedule.active })
      load()
    } catch (err) { setError(getErrorMessage(err)) }
  }
  return <section className="dashboard-panel recurring-panel"><div className="panel-heading"><div><span className="eyebrow">REGULAR FOOD RESCUE</span><h2>Recurring donation reminders</h2></div></div><p className="muted-copy">Save a weekly or monthly listing template. We’ll remind you to confirm food safety before creating each new listing.</p>
    <form className="form-grid" onSubmit={save}><label>Food<input required minLength="2" maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((category) => <option key={category}>{category}</option>)}</select></label><label>Quantity<input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label>Unit<select value={form.quantityUnit} onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })}>{['meals', 'kg', 'boxes', 'portions'].map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Pickup address<input required minLength="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label>Reminder frequency<select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><button className="button button-dark">Save reminder</button></form>
    {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
    {schedules.map((schedule) => <div className="recurring-row" key={schedule._id}><span><b>{schedule.name}</b><small>{schedule.frequency} · {schedule.quantity} {schedule.quantityUnit}</small></span><button className="table-action" onClick={() => toggle(schedule)}>{schedule.active ? 'Pause' : 'Resume'}</button></div>)}
  </section>
}

function MetricCard({ icon: Icon, label, value, note, tone = 'green' }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><span className="metric-label">{label}</span><strong>{value ?? '—'}</strong><small>{note}</small></article>
}

function VolunteerPickupPanel({ user, donations }) {
  const [volunteers, setVolunteers] = useState([])
  const [selected, setSelected] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    try {
      const { data } = await api.get('/donations/volunteers', { params: { city: user.city || '' } })
      setVolunteers(data.volunteers)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.city])
  const assignVolunteer = async (donationId) => {
    const volunteerId = selected[donationId]
    if (!volunteerId) return
    try {
      await api.patch(`/donations/${donationId}/assign-volunteer`, { volunteerId })
      setSelected((old) => ({ ...old, [donationId]: '' }))
      setError('')
      window.location.reload()
    } catch (err) { setError(getErrorMessage(err)) }
  }
  const pending = donations.filter((item) => !['delivered', 'cancelled'].includes(item.status)).slice(0, 3)
  return <section className="dashboard-panel volunteer-panel"><div className="panel-heading"><div><span className="eyebrow">VOLUME DELIVERY</span><h2>Volunteer pickup network</h2></div></div><p className="muted-copy">Reduce pickup delays by assigning nearby volunteers to live donation routes.</p>
    {error && <p className="form-error">{error}</p>}
    {loading ? <p className="muted-copy">Loading volunteers…</p> : pending.length ? pending.map((donation) => <div className="volunteer-assignment-row" key={donation._id}><div><b>{donation.food?.name || 'Donation'}</b><small>{donation.food?.city || user.city || 'Local city'} · {new Date(donation.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div><div className="volunteer-assign"><select value={selected[donation._id] || ''} onChange={(event) => setSelected({ ...selected, [donation._id]: event.target.value })}><option value="">Select volunteer</option>{volunteers.map((volunteer) => <option key={volunteer._id} value={volunteer._id}>{volunteer.name} · {volunteer.city || 'Local city'}</option>)}</select><button className="table-action" onClick={() => assignVolunteer(donation._id)} disabled={!selected[donation._id]}>Assign</button></div></div>) : <p className="muted-copy">No active donation needs volunteer handoff right now.</p>}
  </section>
}

function Dashboard({ user, logout }) {
  const [stats, setStats] = useState(null)
  const [foods, setFoods] = useState([])
  const [donations, setDonations] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [codeInput, setCodeInput] = useState({})
  const [monthly, setMonthly] = useState([])
  const isAdmin = user.role === 'admin', isDonor = user.role === 'donor', isNgo = user.role === 'ngo'
  const currentTab = new URLSearchParams(useLocation().search).get('tab')
  const isPickupsTab = isNgo && currentTab === 'pickups'
  const activeLabel = isAdmin ? 'Overview' : currentTab ? (isDonor ? 'My donations' : 'My pickups') : 'Overview'
  const load = () => {
    setLoading(true); setError('')
    const requests = user.role === 'admin' ? [api.get('/admin/analytics'), api.get('/donations'), api.get('/food'), api.get('/admin/analytics/monthly')]
      : [isDonor ? api.get('/food', { params: { mine: 'true' } }) : api.get('/food'), api.get('/donations')]
    Promise.all(requests).then((results) => {
      if (user.role === 'admin') { setStats(results[0].data.analytics); setDonations(results[1].data.donations); setFoods(results[2].data.foods); setMonthly(results[3].data.monthly) }
      else { setFoods(Array.isArray(results[0].data) ? results[0].data : (results[0].data?.foods || [])); setDonations(results[1].data?.donations || []) }
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user.role])
  useEffect(() => {
    if (!['admin', 'volunteer'].includes(user.role)) return undefined
    const timer = window.setInterval(() => load(), 30000)
    return () => window.clearInterval(timer)
  }, [user.role, user._id])
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('foodorax-token') } })
    socket.on('notification', (item) => { setToast(item.message); load(); setTimeout(() => setToast(''), 4500) })
    socket.on('food:updated', load)
    return () => socket.disconnect()
  }, [user.role])
  const acceptFood = async (foodId) => {
    try {
      const { data } = await api.post(`/food/${foodId}/accept`)
      const code = data?.donation?.verificationCode
      setToast(data.message || `Food claimed! Verification code: ${code}`)
      load()
      setTimeout(() => setToast(''), 7000)
    } catch (err) { setToast(getErrorMessage(err)); setTimeout(() => setToast(''), 5000) }
  }
  const updateStatus = async (donationId, status, code) => {
    try {
      const endpoint = status === 'delivered' ? `/donations/${donationId}/verify` : `/donations/${donationId}/status`
      const { data } = await api.patch(endpoint, status === 'delivered' ? { code } : { status })
      setToast(data.message || 'Donation updated successfully.')
      setCodeInput((old) => ({ ...old, [donationId]: '' }))
      load()
      setTimeout(() => setToast(''), 4000)
    } catch (err) { setToast(getErrorMessage(err)); setTimeout(() => setToast(''), 5000) }
  }
  const cancelListing = async (foodId) => {
    try {
      await api.patch(`${isAdmin ? '/admin/food' : '/food'}/${foodId}/status`, { status: 'cancelled' })
      setToast('Food listing cancelled.')
      load()
      setTimeout(() => setToast(''), 4000)
    } catch (err) {
      setToast(getErrorMessage(err))
      setTimeout(() => setToast(''), 5000)
    }
  }
  const reactivateListing = async (foodId) => {
    try {
      const { data } = await api.patch(`/food/${foodId}/status`, { status: 'listed' })
      setToast(data.message || 'Food listing reactivated.')
      load()
      setTimeout(() => setToast(''), 4000)
    } catch (err) {
      setToast(getErrorMessage(err))
      setTimeout(() => setToast(''), 5000)
    }
    const downloadReport = async (type) => {
      try {
        const { data } = await api.get(`/admin/reports/${type}.csv`, { responseType: 'blob' })
        const url = URL.createObjectURL(data)
        const link = document.createElement('a')
        link.href = url
        link.download = `foodorax-${type}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } catch (err) { setToast(getErrorMessage(err)); setTimeout(() => setToast(''), 5000) }
    }
  }
  const active = donations.filter((d) => !['delivered', 'cancelled'].includes(d.status))
  const done = donations.filter((d) => d.status === 'delivered')
  const rescued = done.reduce((sum, d) => sum + Number(d.food?.quantity || 0), 0)
  const cityBreakdown = useMemo(() => {
    const counts = {}
    foods.forEach((food) => {
      if (!food.city) return
      counts[food.city] = (counts[food.city] || 0) + Number(food.quantity || 0)
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [foods])
  const displayFoods = foods
  const tableItems = isAdmin ? displayFoods : isDonor ? displayFoods : (isPickupsTab ? donations : displayFoods)
  const tableTitle = isAdmin ? 'Recent food listings' : isDonor ? 'Recent donations' : (isPickupsTab ? 'Donation tracker' : 'Available food listings')
  const tableEyebrow = isAdmin ? 'LIVE PLATFORM ACTIVITY' : isDonor ? 'YOUR FOOD, FINDING A HOME' : (isPickupsTab ? 'YOUR COMMUNITY PICKUPS' : 'COMMUNITY FOOD READY FOR RESCUE')
  return <DashboardLayout user={user} logout={logout} active={activeLabel}>
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label="Close notification"><X size={16} /></button></div>}
    <div className="dashboard-title-row"><div><div className="eyebrow">{isAdmin ? 'FOODORAX CONTROL ROOM' : `GOOD ${new Date().getHours() < 12 ? 'MORNING' : 'DAY'}, ${user.name.split(' ')[0].toUpperCase()}`}</div><h1>{isAdmin ? t('Impact at a glance.', 'आपका प्रभाव') : `${t('Let’s make today count', 'आज का दिन बेहतर बनाएं')}${user.name ? `, ${user.name.split(' ')[0]}` : ''}.`}</h1><p>{isAdmin ? t('A real-time view of your community’s food rescue.', 'आपके समुदाय के भोजन बचाव का ताज़ा दृश्य।') : isDonor ? t('Your surplus can be someone’s next warm meal.', 'आपका अतिरिक्त भोजन किसी का अगला भोजन बन सकता है।') : t('Find a fresh match for your community today.', 'आज अपने समुदाय के लिए ताज़ा भोजन खोजें।')}</p></div>{isAdmin && <div className="report-actions"><button className="button button-outline button-small" onClick={() => downloadReport('food')}>Export food CSV</button><button className="button button-outline button-small" onClick={() => downloadReport('donations')}>Export donations CSV</button><button className="button button-outline button-small" onClick={() => window.print()}>Print / Save PDF</button><Link className="button button-outline button-small" to="/admin/audit">Audit log</Link></div>}{isDonor && <Link to="/donate" className="button button-dark"><Plus size={17} /> {t('Add surplus food', 'अतिरिक्त भोजन जोड़ें')}</Link>}{user.role === 'ngo' && <div className="report-actions"><Link to="/recipient" className="button button-dark"><Utensils size={16} /> All available food</Link><Link to="/requests" className="button button-outline"><Plus size={16} /> Post food request</Link><Link to="/discover" className="button button-outline"><Search size={16} /> {t('Find nearby food', 'पास का भोजन खोजें')}</Link></div>}</div>
    {error && <div className="inline-error">{error} <button onClick={load}>Try again</button></div>}
    {loading ? <div className="dashboard-loading"><span className="spinner" />Loading your latest impact…</div> : <>
      <div className="metrics-grid">
        {isAdmin ? <><MetricCard icon={Users} label="Community members" value={stats?.users ?? 0} note="Registered on the platform" /><MetricCard icon={Gift} label="Food listings" value={stats?.totalDonations ?? 0} note={`${stats?.activeDonations ?? 0} active right now`} tone="orange" /><MetricCard icon={HandHeart} label="Meals rescued" value={stats?.mealsRescued?.toLocaleString() ?? 0} note="Quantity delivered successfully" /><MetricCard icon={ShieldCheck} label="Verified NGOs" value={stats?.verifiedNgos ?? 0} note={`${stats?.pendingNgos ?? 0} waiting for review`} tone="blue" /></>
          : isDonor ? <><MetricCard icon={Gift} label="Total donations" value={foods.length} note="Food shared with your community" /><MetricCard icon={Clock3} label="Active donations" value={foods.filter((f) => !['delivered', 'cancelled'].includes(f.status)).length} note="Making their way to a table" tone="orange" /><MetricCard icon={PackageCheck} label="Completed" value={done.length} note="Successful food handoffs" tone="blue" /><MetricCard icon={Leaf} label="Meals rescued" value={rescued.toLocaleString()} note="Thanks to your generosity" /></>
          : <><MetricCard icon={Compass} label="Available food" value={foods.length} note="Ready for pickup in your network" /><MetricCard icon={Clock3} label="Active pickups" value={active.length} note="Accepted and on the move" tone="orange" /><MetricCard icon={PackageCheck} label="Completed pickups" value={done.length} note="Community meals delivered" tone="blue" /><MetricCard icon={Sparkles} label="Match readiness" value={user.verified ? 'Verified' : 'Pending'} note={user.verified ? 'Ready to claim food' : 'Admin verification required'} /></>}
      </div>
      {isAdmin && <><section className="admin-summary-row"><div className="summary-panel"><div className="panel-heading"><div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>Partner verification</h2></div><Link to="/admin/ngos">Review NGOs <ArrowRight size={15} /></Link></div><div className="summary-highlight"><span className="summary-highlight-icon"><ShieldCheck size={20} /></span><div><b>{stats?.pendingNgos ?? 0} partners waiting</b><small>Verify trusted NGOs so they can start accepting food.</small></div><Link className="round-action" to="/admin/ngos"><ArrowRight size={17} /></Link></div></div><div className="summary-panel env-panel"><span className="eyebrow">YOUR COMMUNITY’S IMPACT</span><h2>{(stats?.estimatedKgSaved || 0).toLocaleString()} kg <span>food saved</span></h2><div className="progress-track"><i style={{ width: `${Math.min(100, (stats?.mealsRescued || 0) / 100)}%` }} /></div><div className="impact-mini-grid"><div><b>{stats?.donors ?? 0}</b><span>food donors</span></div><div><b>{stats?.completedDonations ?? 0}</b><span>completed rescues</span></div><div><b>{stats?.estimatedPeopleSupported ?? 0}</b><span>people supported</span></div></div></div></section><section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">RESCUE TRENDS</span><h2>Monthly delivered donations</h2></div></div><div className="monthly-bars">{monthly.map((month) => <div key={month._id}><span>{month.donations}</span><i style={{ height: `${Math.max(8, Math.min(100, month.donations * 8))}%` }} /><small>{month._id}</small></div>)}</div>{!monthly.length && <p className="muted-copy">Monthly rescue history will appear after completed donations.</p>}</section><section className="dashboard-panel impact-analytics-panel"><div className="panel-heading"><div><span className="eyebrow">AI IMPACT MODEL</span><h2>City impact and match confidence</h2></div></div><div className="impact-city-list">{cityBreakdown.length ? cityBreakdown.map(([city, quantity]) => <div key={city} className="impact-city-row"><span>{city}</span><div className="impact-city-bar"><i style={{ width: `${Math.max(12, (quantity / (cityBreakdown[0][1] || 1)) * 100)}%` }} /></div><b>{quantity}</b></div>) : <p className="muted-copy">No city-level impact yet. Add food listings to start tracking your network.</p>}</div>      </section>
      {(isAdmin || user.role === 'volunteer') && <VolunteerRouteMap donations={donations} user={user} />}
      </>}
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">{tableEyebrow}</span><h2>{tableTitle}</h2></div><Link to={isDonor ? '/donate' : isNgo ? '/recipient' : '/discover'}>{isDonor ? 'Add food' : isNgo ? 'View all food' : 'Explore listings'} <ArrowRight size={15} /></Link></div>
        {!tableItems.length ? <div className="empty-state"><span><Utensils size={22} /></span><b>{isNgo && !isPickupsTab ? 'No available food right now' : 'No activity just yet'}</b><p>{isNgo && !isPickupsTab ? 'Surplus food shared by donors will show up here ready to claim.' : isDonor ? 'List your first surplus meal and let a nearby community enjoy it.' : 'Your accepted donations and pickup progress will show up here.'}</p><Link to={isDonor ? '/donate' : isNgo ? '/recipient' : '/discover'} className="button button-dark">{isDonor ? 'Add your first listing' : isNgo ? 'Browse all food' : 'Discover food'} <ArrowRight size={15} /></Link></div>
          : <div className="table-wrap"><table><thead><tr><th>{isAdmin ? 'FOOD LISTING' : isPickupsTab ? 'DONATION' : 'AVAILABLE FOOD'}</th><th>{isAdmin ? 'DONOR' : isPickupsTab ? 'QUANTITY' : 'DONOR & LOCATION'}</th><th>{isAdmin ? 'CATEGORY' : isPickupsTab ? 'PICKUP WINDOW' : 'QUANTITY & CATEGORY'}</th><th>STATUS</th><th>NEXT STEP</th></tr></thead><tbody>
            {tableItems.slice(0, 10).map((item) => {
              const donation = isPickupsTab ? item : (isDonor ? donations.find((record) => record.food?._id === item._id) : null)
              const food = isPickupsTab ? (donation?.food || item) : item
              if (!food) return null
              const status = isPickupsTab ? (donation?.status || food.status) : food.status
              return <tr key={item._id}>
                <td><div className="food-name-cell"><img src={food.image || foodPhotos.meals} alt="" /><span><b>{food.name || food.title}</b><small><MapPin size={12} />{food.address || food.location?.label || food.location || 'Pickup location'}</small></span></div></td>
                <td>{isAdmin ? (food.donor?.name || '—') : isPickupsTab ? `${food.quantity} ${food.quantityUnit || 'meals'}` : (food.donor?.name || 'Community donor')}</td>
                <td>{isAdmin ? food.category : isPickupsTab ? <>{new Date(food.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{donation && status === 'accepted' && <PickupTimeForm donation={donation} onUpdated={load} />}</> : <>{food.quantity} {food.quantityUnit || 'meals'} · {food.category}</>}</td>
                <td><StatusPill status={status || 'listed'} /></td>
                <td>
                  {isAdmin && !['delivered', 'cancelled'].includes(status) && <button className="table-action cancel-listing" onClick={() => cancelListing(food._id)}>Cancel listing</button>}
                  {isDonor && !donation && status === 'listed' && <button className="table-action cancel-listing" onClick={() => cancelListing(food._id)}>Cancel listing</button>}
                  {isDonor && !donation && status === 'cancelled' && new Date(food.pickupTime) > new Date() && new Date(food.expiryTime) > new Date() && <button className="table-action" onClick={() => reactivateListing(food._id)}>Reactivate listing</button>}
                  {isNgo && !isPickupsTab && (status === 'listed' || !status) && <button className="table-action" onClick={() => acceptFood(food._id)}>Claim food <ArrowRight size={13} /></button>}
                  {isNgo && isPickupsTab && donation && status === 'accepted' && <button className="table-action" onClick={() => updateStatus(donation._id, 'pickup_started')}>Start pickup <ArrowRight size={13} /></button>}
                  {isNgo && isPickupsTab && donation && status === 'pickup_started' && <div className="verify-inline"><input aria-label="Pickup code" placeholder="Donor’s 6-digit code" maxLength={6} value={codeInput[donation._id] || ''} onChange={(e) => setCodeInput({ ...codeInput, [donation._id]: e.target.value })} /><button onClick={() => updateStatus(donation._id, 'delivered', codeInput[donation._id])}>Verify</button></div>}
                  {isDonor && donation && <span className="pickup-code">Code <b>{donation.verificationCode || '••••••'}</b></span>}
                  {donation && status === 'delivered' && <ReviewForm donation={donation} user={user} />}
                </td>
              </tr>
            })}</tbody></table></div>}
      </section>
      {!isAdmin && <VolunteerPickupPanel user={user} donations={donations} />}
      {!isAdmin && user.role === 'ngo' && <NearbyPanel user={user} foods={foods} />}
    </>}
  </DashboardLayout>
}

function NearbyPanel({ user, foods }) {
  const listed = foods.slice(0, 4)
  return <section className="dashboard-panel nearby-panel"><div className="panel-heading"><div><span className="eyebrow">FRESH FOOD, CLOSE TO HOME</span><h2>Nearby pickup spots</h2></div><Link to="/discover">See all nearby <ArrowRight size={15} /></Link></div>{listed.length ? <div className="nearby-grid">{listed.map((food) => <div className="nearby-mini" key={food._id}><img src={food.image || foodPhotos.meals} alt="" /><div><b>{food.name}</b><small><MapPin size={12} />{relativeDistance(food, user)?.toFixed(1) || '—'} km away · {food.quantity} {food.quantityUnit || 'meals'}</small></div><StatusPill status={food.status} /></div>)}</div> : <p className="muted-copy">No nearby listings at this moment. Check back soon.</p>}</section>
}

function VolunteerRouteMap({ donations, user }) {
  const routes = useMemo(() => donations.filter((donation) => {
    const isLive = donation.pickupStatus && ['assigned', 'en_route', 'pickup_started'].includes(donation.pickupStatus)
    return isLive && donation.volunteer && donation.food?.location?.coordinates?.length === 2
  }), [donations])

  if (!routes.length) return null

  const mapCenter = (() => {
    const first = routes[0]
    const coordinates = first.food?.location?.coordinates || first.volunteer?.location?.coordinates
    if (!coordinates?.length) return [28.6139, 77.2090]
    return [coordinates[1], coordinates[0]]
  })()

  return <section className="dashboard-panel volunteer-map-panel"><div className="panel-heading"><div><span className="eyebrow">LIVE VOLUNTEER NETWORK</span><h2>Route tracking map</h2></div><span className="match-powered">{routes.length} active routes</span></div><MapContainer className="leaflet-map" center={mapCenter} zoom={11} scrollWheelZoom={false}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{routes.map((donation) => {
    const pickupCoords = donation.food?.location?.coordinates
    const volunteerCoords = donation.volunteer?.location?.coordinates || donation.liveLocation || []
    const routePoints = (donation.routePoints || []).filter((point) => Array.isArray(point.coordinates) && point.coordinates.length === 2)
    const routeLatLng = routePoints.length ? routePoints.map((point) => [point.coordinates[1], point.coordinates[0]]) : []
    return <>
      {pickupCoords?.length === 2 && <Marker key={`${donation._id}-pickup`} position={[pickupCoords[1], pickupCoords[0]]} icon={foodPinIcon}><Popup><b>{donation.food?.name}</b><br />Pickup ready<br />{donation.food?.address}</Popup></Marker>}
      {volunteerCoords.length === 2 && <Marker key={`${donation._id}-volunteer`} position={[volunteerCoords[1], volunteerCoords[0]]} icon={divIcon({ className: 'food-pin-icon volunteer-pin', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 17] })}><Popup><b>{donation.volunteer?.name}</b><br />{donation.pickupStatus === 'en_route' ? 'On the way' : 'Assigned for pickup'}<br />{donation.volunteer?.city || 'Local volunteer'}</Popup></Marker>}
      {routeLatLng.length > 1 && <Polyline key={`${donation._id}-route`} positions={routeLatLng} pathOptions={{ color: '#4caf50', weight: 4, opacity: 0.9 }} />}
    </>
  })}</MapContainer><div className="route-summary-grid">{routes.map((donation) => <div key={donation._id} className="route-summary-item"><b>{donation.food?.name}</b><small>{donation.volunteer?.name} · {donation.pickupStatus}</small></div>)}</div></section>
}

function FoodRequestsPage({ user, logout }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [claimingFoodId, setClaimingFoodId] = useState('')
  const [form, setForm] = useState({ name: '', category: 'Prepared meals', quantity: '', quantityUnit: 'meals', description: '', neededBy: '', address: user.address || '' })
  const navigate = useNavigate()
  const load = () => {
    setLoading(true)
    setError('')
    api.get('/food-requests').then(({ data }) => setRequests(data.requests))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user.role])
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('foodorax-token') } })
    socket.on('food-request:updated', load)
    socket.on('food:updated', load)
    return () => socket.disconnect()
  }, [user.role, user._id])
  const setValue = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        ...(form.neededBy ? { neededBy: new Date(form.neededBy).toISOString() } : {}),
      }
      if (!form.neededBy) delete payload.neededBy
      const { data } = await api.post('/food-requests', payload)
      setMessage(data.message)
      setForm({ name: '', category: 'Prepared meals', quantity: '', quantityUnit: 'meals', description: '', neededBy: '', address: user.address || '' })
      load()
    } catch (err) {
      const validationErrors = err.response?.data?.errors
      setError(validationErrors?.length ? validationErrors.map(({ message: detail }) => detail).join(' ') : getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (requestId) => {
    try {
      const { data } = await api.patch(`/food-requests/${requestId}/cancel`)
      setMessage(data.message)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }
  const cancelOffer = async (foodId) => {
    try {
      const { data } = await api.patch(`/food/${foodId}/status`, { status: 'cancelled' })
      setMessage(data.message)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }
  const claimOffer = async (foodId) => {
    setClaimingFoodId(foodId)
    setError('')
    try {
      const { data } = await api.post(`/food/${foodId}/accept`)
      setMessage(`${data.message} Pickup code: ${data.donation.verificationCode}. Share it with the donor when you collect the food.`)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setClaimingFoodId('')
    }
  }
  const isNgo = user.role === 'ngo'
  return <DashboardLayout user={user} logout={logout} active={isNgo ? 'My requests' : 'Food requests'}>
    <div className="dashboard-title-row"><div><div className="eyebrow">COMMUNITY FOOD NEEDS</div><h1>{isNgo ? 'Request food for your community.' : 'Help fulfill a food request.'}</h1><p>{isNgo ? 'Tell local donors what your organization needs. All food is shared free of charge.' : 'Choose an open request and offer the food for free. The recipient will review and arrange pickup.'}</p></div><button className="button button-outline" onClick={load}><ArrowDown size={16} /> Refresh requests</button></div>
    {isNgo && !user.verified && <div className="inline-error">Your NGO can post requests, but must be verified before offering or claiming food.</div>}
    {message && <div className="form-success"><CheckCircle2 size={17} />{message}</div>}
    {error && <div className="inline-error">{error}<button onClick={load}>Try again</button></div>}
    {isNgo && <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">FREE COMMUNITY REQUEST</span><h2>What food do you need?</h2></div></div><form className="donation-form" onSubmit={submit}><div className="form-grid"><label>Food needed<input name="name" value={form.name} onChange={setValue} placeholder="e.g. Fresh meals for families" minLength="2" maxLength="120" required /></label><label>Food category<select name="category" value={form.category} onChange={setValue}>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((category) => <option key={category}>{category}</option>)}</select></label><label>Quantity<div className="quantity-combo"><input name="quantity" type="number" min="1" max="100000" value={form.quantity} onChange={setValue} placeholder="25" required /><select name="quantityUnit" value={form.quantityUnit} onChange={setValue}><option>meals</option><option>kg</option><option>boxes</option><option>portions</option></select></div></label><label>Pickup address <span className="optional">(optional)</span><input name="address" value={form.address} onChange={setValue} placeholder="Your organization’s address" maxLength="240" /></label><label>Needed by <span className="optional">(optional)</span><input name="neededBy" type="datetime-local" min={localDateTimeValue(new Date())} value={form.neededBy} onChange={setValue} /></label><label className="full-label">Request details <span className="optional">(optional)</span><textarea name="description" value={form.description} onChange={setValue} rows="3" maxLength="500" placeholder="Who will this food help? Any useful details for donors?" /></label></div><button className="button button-dark" disabled={busy}>{busy ? 'Posting request…' : 'Post free food request'} <ArrowRight size={16} /></button></form></section>}
    <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">{isNgo ? 'YOUR REQUESTS + OPEN NEEDS' : 'OPEN REQUESTS'}</span><h2>{isNgo ? 'Requests from your and nearby organizations' : 'Requests from local NGOs'}</h2></div></div>{loading ? <div className="dashboard-loading"><span className="spinner" />Loading food requests…</div> : requests.length ? <div className="food-grid">{requests.map((request) => { const ownRequest = String(request.requester?._id) === String(user._id || user.id); const ownOffer = String(request.fulfilledFood?.donor?._id) === String(user._id || user.id); return <article className="food-card" key={request._id}><div className="food-card-body"><div className="food-card-top"><span className="food-category">{request.category}</span><StatusPill status={request.status} /></div><h2>{request.name}</h2><p className="food-description">{request.description || 'This community partner needs help with a free food donation.'}</p><div className="food-details"><span><Utensils size={14} /><b>{request.quantity} {request.quantityUnit}</b></span>{request.neededBy && <span><Clock3 size={14} />By {new Date(request.neededBy).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}</div><div className="food-donor"><span className="donor-dot">{(request.requester?.name || 'N')[0]}</span><span><b>{request.requester?.name || 'Community partner'}</b><small><MapPin size={12} />{request.city || request.requester?.city || 'Local organization'}{request.address ? ` · ${request.address}` : ''}</small></span></div>{request.fulfilledFood && <p className="muted-copy">Food offered: <b>{request.fulfilledFood.name}</b>{request.fulfilledFood.donor?.name ? ` · by ${request.fulfilledFood.donor.name}` : ''} ({request.fulfilledFood.status.replaceAll('_', ' ')})</p>}<div className="food-card-actions">{(!isNgo || !ownRequest) && request.status === 'open' && (isNgo && !user.verified ? <span className="muted-copy">Verify your organization before offering food.</span> : <button className="button button-dark button-small" onClick={() => navigate(`/donate?request=${request._id}`)}>{isNgo ? 'Offer food to this NGO' : 'Offer this food for free'} <ArrowRight size={14} /></button>)}{isNgo && ownRequest && request.status === 'open' && <button className="table-action cancel-listing" onClick={() => cancel(request._id)}>Cancel request</button>}{isNgo && ownRequest && request.status === 'matched' && request.fulfilledFood?.status === 'listed' && (user.verified ? <button className="button button-dark button-small" disabled={claimingFoodId === request.fulfilledFood._id} onClick={() => claimOffer(request.fulfilledFood._id)}>{claimingFoodId === request.fulfilledFood._id ? 'Claiming…' : 'Claim free food'} <ArrowRight size={14} /></button> : <span className="muted-copy">Verify your organization before accepting food.</span>)}{isNgo && ownOffer && request.fulfilledFood?.status === 'listed' && <button className="table-action cancel-listing" onClick={() => cancelOffer(request.fulfilledFood._id)}>Cancel my offer</button>}</div></div></article> })}</div> : <div className="empty-state"><span><HandHeart size={22} /></span><b>{isNgo ? 'No requests yet' : 'No open food requests'}</b><p>{isNgo ? 'Post what your community needs and local donors can offer food at no cost.' : 'There are no open food requests at the moment. Check back soon.'}</p></div>}</section>
  </DashboardLayout>
}

function DonatePage({ user, logout }) {
  const location = useLocation()
  const requestId = new URLSearchParams(location.search).get('request')
  const [foodRequest, setFoodRequest] = useState(null)
  const [requestLoading, setRequestLoading] = useState(Boolean(requestId))
  const [form, setForm] = useState({ name: '', category: 'Prepared meals', quantity: '', quantityUnit: 'meals', description: '', image: '', address: user.address || '', preparedAt: '', pickupTime: '', expiryTime: '' })
  const [safety, setSafety] = useState({ edible: false, stored: false, uncontaminated: false })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()
  const setValue = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  useEffect(() => {
    if (!requestId) return
    setRequestLoading(true)
    api.get(`/food-requests/${requestId}`).then(({ data }) => {
      const request = data.request
      setFoodRequest(request)
      setForm((old) => ({
        ...old,
        name: request.name,
        category: request.category,
        quantity: String(request.quantity),
        quantityUnit: request.quantityUnit,
        description: request.description,
      }))
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setRequestLoading(false))
  }, [requestId])
  const uploadImage = async (event) => {
    const image = event.target.files?.[0]
    if (!image) return
    const data = new FormData()
    data.append('image', image)
    if (requestId) data.append('foodRequest', requestId)
    setUploading(true); setError('')
    try {
      const result = await api.post('/food/upload-image', data)
      setForm((old) => ({ ...old, image: result.data.image }))
    } catch (err) { setError(getErrorMessage(err)) } finally {
      setUploading(false)
      event.target.value = ''
    }
  }
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('')
    if (requestId && !foodRequest) return setError('This food request is unavailable. Return to Food requests and choose an open request.')
    if (!Object.values(safety).every(Boolean)) return setError('Please confirm every food safety check before publishing.')
    const preparation = new Date(form.preparedAt)
    const pickup = new Date(form.pickupTime)
    const expiry = new Date(form.expiryTime)
    const now = new Date()
    if (preparation >= now) return setError('Preparation time must be in the past.')
    if (preparation >= pickup) return setError('Preparation time must be before pickup.')
    if (pickup <= now) return setError('Pickup time must be in the future.')
    if (expiry <= pickup) return setError('The expiry time must be after the pickup time.')
    setBusy(true)
    try {
      await api.post('/food', {
        ...form,
        quantity: Number(form.quantity),
        preparedAt: new Date(form.preparedAt).toISOString(),
        pickupTime: new Date(form.pickupTime).toISOString(),
        expiryTime: new Date(form.expiryTime).toISOString(),
        location: user.location,
        ...(foodRequest ? { foodRequest: foodRequest._id } : {}),
        safetyChecklist: { ...safety, preparationTimeEntered: true, expiryTimeEntered: true },
      })
      setMessage('Your food is listed! We’ll find a nearby community partner.')
      setTimeout(() => navigate('/dashboard'), 1300)
    } catch (err) {
      const validationErrors = err.response?.data?.errors
      setError(validationErrors?.length
        ? validationErrors.map(({ message: detail }) => detail).join(' ')
        : getErrorMessage(err))
    } finally { setBusy(false) }
  }
  const createDemoFood = async () => {
    setError(''); setMessage(''); setBusy(true)
    const now = Date.now()
    try {
      await api.post('/food', {
        name: 'DEMO — Fresh vegetable biryani',
        category: 'Prepared meals',
        quantity: 25,
        quantityUnit: 'meals',
        description: 'Demo listing for presentation only. No real food is available for pickup.',
        image: '',
        address: user.address || 'FoodoraX demo location',
        preparedAt: new Date(now - 60 * 60 * 1000).toISOString(),
        pickupTime: new Date(now + 60 * 60 * 1000).toISOString(),
        expiryTime: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
        location: user.location,
        safetyChecklist: { edible: true, stored: true, uncontaminated: true, preparationTimeEntered: true, expiryTimeEntered: true },
      })
      setMessage('Demo listing created for presentation. It is not real food and is not available for pickup.')
    } catch (err) {
      const validationErrors = err.response?.data?.errors
      setError(validationErrors?.length
        ? validationErrors.map(({ message: detail }) => detail).join(' ')
        : getErrorMessage(err))
    } finally { setBusy(false) }
  }
  const now = new Date()
  const pickupMin = localDateTimeValue(new Date(Math.ceil(now.getTime() / 60_000) * 60_000))
  const preparationMax = form.pickupTime
    ? localDateTimeValue(new Date(Math.min(now.getTime(), new Date(form.pickupTime).getTime() - 60_000)))
    : localDateTimeValue(now)
  const expiryMin = form.pickupTime
    ? localDateTimeValue(new Date(new Date(form.pickupTime).getTime() + 60_000))
    : undefined
  return <DashboardLayout user={user} logout={logout} active="Add food"><div className="dashboard-title-row donate-heading"><div><div className="eyebrow">A LITTLE GOOD STARTS HERE</div><h1>{foodRequest ? 'Fulfill a free food request.' : 'Share the good stuff.'}</h1><p>{foodRequest ? 'Prepare the requested food and publish it for the community partner.' : 'Add your surplus and we’ll help it find a nearby table.'}</p></div><span className="donate-illustration"><Gift size={30} /></span></div>{foodRequest && <div className="form-success"><HandHeart size={16} /> Fulfilling {foodRequest.requester?.name}’s request for {foodRequest.quantity} {foodRequest.quantityUnit}. No payment is involved.</div>}
    <form className="donation-form" onSubmit={submit}><div className="form-section"><div className="form-section-title"><span>01</span><div><h2>Tell us about the food</h2><p>A few details help the right partner find you.</p></div></div><div className="form-grid"><label>Food name<input name="name" value={form.name} onChange={setValue} placeholder="e.g. Fresh vegetable biryani" required /></label><label>Food category<select name="category" value={form.category} onChange={setValue}>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Quantity<div className="quantity-combo"><input name="quantity" type="number" min="1" value={form.quantity} onChange={setValue} placeholder="50" required /><select name="quantityUnit" value={form.quantityUnit} onChange={setValue}><option>meals</option><option>kg</option><option>boxes</option><option>portions</option></select></div></label><label>Pickup address<input name="address" value={form.address} onChange={setValue} placeholder="Street, area, city" required /></label><label className="full-label">A little more about it<textarea name="description" value={form.description} onChange={setValue} rows="3" placeholder="What should your community partner know?" /></label>    <label className="full-label">Food photo URL <span className="optional">(optional)</span><input name="image" type="url" value={form.image} onChange={setValue} placeholder="https://…" /></label><label className="full-label">Or upload a photo <span className="optional">(JPG, PNG, WebP · max 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} />{uploading && <small>Uploading image…</small>}{form.image && <img className="upload-preview" src={form.image} alt="Food upload preview" />}</label></div></div>
      <div className="form-section"><div className="form-section-title"><span>02</span><div><h2>Set the food and pickup times</h2><p>Preparation and pickup times help partners confirm food safety.</p></div></div><div className="form-grid"><label>Prepared at<input name="preparedAt" type="datetime-local" max={preparationMax} value={form.preparedAt} onChange={setValue} required /></label><label>Ready for pickup<input name="pickupTime" type="datetime-local" min={pickupMin} value={form.pickupTime} onChange={setValue} required /></label><label>Best before / expiry<input name="expiryTime" type="datetime-local" min={expiryMin} value={form.expiryTime} onChange={setValue} required /></label></div></div>
      <div className="form-section safety-section"><div className="form-section-title"><span>03</span><div><h2>Food safety comes first</h2><p>Please confirm each of these before publishing.</p></div></div><div className="safety-list">{[['edible', 'This food is safe and edible'], ['stored', 'It has been stored at the right temperature'], ['uncontaminated', 'It is free from contamination and properly handled']].map(([key, text]) => <label className="safety-check" key={key}><input type="checkbox" checked={safety[key]} onChange={(e) => setSafety({ ...safety, [key]: e.target.checked })} /><span className="checkmark"><Check size={13} /></span>{text}</label>)}</div></div>
      {error && <div className="form-error">{error}</div>}{message && <div className="form-success"><CheckCircle2 size={17} />{message}</div>}<div className="form-submit-row"><p><ShieldCheck size={15} /> All food listings are shared with verified partners.</p><button className="button button-dark" disabled={busy || uploading || requestLoading}>{busy ? 'Publishing…' : foodRequest ? 'Fulfill request for free' : 'Publish food listing'} <ArrowRight size={16} /></button></div>{!requestId && <button type="button" className="button button-outline demo-account-button" onClick={createDemoFood} disabled={busy || uploading}>{busy ? 'Creating demo listing…' : 'Create demo food listing'} <Sparkles size={16} /></button>}
    </form><RecurringSchedulePanel user={user} /></DashboardLayout>
}

function matchScore(food, user) {
  if (Number.isFinite(food.matchScore)) return food.matchScore
  const distance = relativeDistance(food, user)
  const km = distance ?? 12
  const q = Number(food.quantity || 0)
  const timeLeft = (new Date(food.expiryTime) - Date.now()) / 36e5
  const cityAffinity = !user.city || !food.city ? 0 : user.city.toLowerCase() === food.city.toLowerCase() ? 15 : 0
  const categoryAffinity = !user.preferredCategories?.length || !food.category ? 8 : user.preferredCategories.includes(food.category) ? 18 : 0
  const donorTrust = food.donor?.verified ? 16 : 9
  const quantityScore = q >= 25 ? 22 : q >= 10 ? 14 : q > 0 ? 8 : 0
  const timeScore = timeLeft > 12 ? 18 : timeLeft > 4 ? 14 : timeLeft > 0 ? 8 : 0
  const urgencyBonus = food.priority ? Math.min(10, food.priority * 2) : 0
  const verificationBonus = user.verified ? 10 : 0
  const rawScore = 100 - Math.min(km, 35) * 1.35 + quantityScore + timeScore + cityAffinity + categoryAffinity + donorTrust + urgencyBonus + verificationBonus
  return Math.max(20, Math.min(99, Math.round(rawScore)))
}

function DiscoverPage({ user, logout }) {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ category: '', search: '', minQuantity: '' })
  const [radius, setRadius] = useState('25')
  const [sortBy, setSortBy] = useState('recommended')
  const [currentLocation, setCurrentLocation] = useState(user.location?.coordinates || [])
  const [expandedFoodId, setExpandedFoodId] = useState(null)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()
  const fetchFoods = () => {
    setLoading(true); setError('')
    const request = (user.role === 'ngo' && radius !== 'any')
      ? api.get('/food/recommendations', { params: { ...filters, maxDistanceKm: radius } })
      : api.get('/food', { params: { ...filters, status: 'listed' } })
    request.then(({ data }) => setFoods(Array.isArray(data) ? data : (data?.foods || []))).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false))
  }
  useEffect(() => { fetchFoods() }, [filters.category, filters.search, filters.minQuantity, radius, currentLocation[0], currentLocation[1]])
  const searchUser = useMemo(() => ({ ...user, location: { type: 'Point', coordinates: currentLocation } }), [user, currentLocation])
  const matches = useMemo(() => [...foods]
    .map((food) => ({ ...food, distanceKm: food.distanceKm ?? relativeDistance(food, searchUser) }))
    .filter((food) => radius === 'any' || food.distanceKm === null || food.distanceKm <= Number(radius))
    .sort((a, b) => sortBy === 'distance'
      ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
      : sortBy === 'expiry'
        ? new Date(a.expiryTime) - new Date(b.expiryTime)
        : sortBy === 'quantity'
          ? Number(b.quantity) - Number(a.quantity)
          : matchScore(b, searchUser) - matchScore(a, searchUser)), [foods, searchUser, radius, sortBy])
  const mappedFoods = matches.filter((food) => food.location?.coordinates?.length === 2)
  const firstPoint = mappedFoods[0]?.location.coordinates
  const userPoint = currentLocation
  const mapCenter = userPoint?.length === 2 ? [userPoint[1], userPoint[0]] : firstPoint ? [firstPoint[1], firstPoint[0]] : null
  const locateNearby = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const coordinates = [coords.longitude, coords.latitude]
      setError('')
      try { await api.patch('/auth/me', { location: { type: 'Point', coordinates } }); setCurrentLocation(coordinates) }
      catch (err) { setError(getErrorMessage(err)) }
    }, () => setError('Could not access your location. Check browser location permission and try again.'), { enableHighAccuracy: true, timeout: 10000 })
  }
  const accept = async (foodId) => {
    try {
      const { data } = await api.post(`/food/${foodId}/accept`)
      setToast(`You’re matched! Your pickup code is ${data.donation.verificationCode}. Share it with the donor when you collect the food.`)
      fetchFoods()
      setTimeout(() => setToast(''), 8000)
    } catch (err) { setToast(getErrorMessage(err)); setTimeout(() => setToast(''), 5000) }
  }
  const mapHref = (food) => food.location?.coordinates?.length ? `https://www.openstreetmap.org/?mlat=${food.location.coordinates[1]}&mlon=${food.location.coordinates[0]}#map=14/${food.location.coordinates[1]}/${food.location.coordinates[0]}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(food.address || '')}`
  return <DashboardLayout user={user} logout={logout} active="Find food"><div className="dashboard-title-row discover-title"><div><div className="eyebrow">{t('FRESH FROM YOUR NEIGHBOURHOOD', 'आपके पड़ोस से ताज़ा')}</div><h1>{t('Good food, close by.', 'अच्छा भोजन, पास ही।')}</h1><p>{t('Discover verified surplus food and find the right match for your community.', 'सत्यापित अतिरिक्त भोजन खोजें और अपने समुदाय के लिए सही विकल्प चुनें।')}</p></div><div className="discover-location-tools"><div className="location-chip"><MapPin size={15} />{currentLocation.length ? t('Nearby location active', 'आस-पास की लोकेशन सक्रिय') : t('Location not set', 'लोकेशन सेट नहीं है')}</div><button className="button button-outline button-small" onClick={locateNearby}><Navigation size={14} /> {t('Use current location', 'वर्तमान लोकेशन इस्तेमाल करें')}</button></div></div>
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label="Close notification"><X size={16} /></button></div>}
    <div className="match-banner"><span className="match-spark"><Sparkles size={20} /></span><div><b>Smart matches, made for your community</b><small>Ranked by pickup distance, quantity, freshness and your verified partner status.</small></div><span className="match-powered">MATCHED FOR YOU <ArrowDown size={14} /></span></div>
    {user.role === 'ngo' && !user.verified && <div className="inline-error">You can explore available food now. An admin must verify your NGO account before you can claim a listing.</div>}
    <div className="filter-bar"><label className="search-filter"><Search size={17} /><input placeholder={t('Search meals, ingredients, location…', 'भोजन, सामग्री या लोकेशन खोजें…')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label><select aria-label={t('Food category', 'भोजन श्रेणी')} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">{t('All categories', 'सभी श्रेणियाँ')}</option>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((x) => <option key={x}>{x}</option>)}</select><label className="min-quantity"><span>{t('Min. quantity', 'न्यूनतम मात्रा')}</span><input type="number" min="1" placeholder={t('Any', 'कोई भी')} value={filters.minQuantity} onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })} /></label><label className="radius-filter"><span>{t('Within', 'दूरी')}</span><select aria-label={t('Maximum distance', 'अधिकतम दूरी')} value={radius} onChange={(e) => setRadius(e.target.value)}><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option><option value="100">100 km</option><option value="any">{t('Any distance', 'कोई भी दूरी')}</option></select></label><label className="radius-filter"><span>{t('Sort by', 'क्रम')}</span><select aria-label={t('Sort listings', 'सूची क्रम')} value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="recommended">{t('Best match', 'बेहतरीन मेल')}</option><option value="distance">{t('Nearest', 'सबसे पास')}</option><option value="expiry">{t('Expiring soon', 'जल्दी समाप्त')}</option><option value="quantity">{t('Most food', 'अधिक मात्रा')}</option></select></label><button className="icon-button filter-refresh" onClick={fetchFoods} aria-label={t('Refresh listings', 'सूची रिफ्रेश करें')}><ArrowDown size={16} /></button></div>
    {error && <div className="inline-error">{error} <button onClick={fetchFoods}>Try again</button></div>}
    {loading ? <div className="dashboard-loading"><span className="spinner" />Finding the freshest nearby matches…</div> : matches.length ? <div className="food-grid">{matches.map((food, index) => {
      const safeToEat = !!food.safetyChecklist && Object.values(food.safetyChecklist).every(Boolean)
      const donorName = food.donor?.name || 'Local food donor'
      const donorCity = food.donor?.city || food.city || 'Nearby'
      const donorPhone = food.donor?.phone || food.donor?.whatsappNumber || ''
      const detailsOpen = expandedFoodId === food._id
      return <article className="food-card" key={food._id}><div className="food-image-wrap"><img src={food.image || foodPhotos.meals} alt={food.name} /><span className="food-fresh"><i /> Fresh listing</span>{user.role === 'ngo' && index < 3 && <span className="smart-match-tag"><Sparkles size={12} /> {food.matchScore}% match</span>}</div><div className="food-card-body"><div className="food-card-top"><span className="food-category">{food.category}</span><span className="food-distance"><MapPin size={13} />{(food.distanceKm ?? relativeDistance(food, user))?.toFixed(1) || 'Nearby'}{(food.distanceKm ?? relativeDistance(food, user)) !== null ? ' km' : ''}</span></div><h2>{food.name}</h2><p className="food-description">{food.description || 'Fresh surplus food ready to be shared with your community.'}</p><div className="food-details"><span><Utensils size={14} /><b>{food.quantity} {food.quantityUnit || 'meals'}</b></span><span><Clock3 size={14} />By {new Date(food.expiryTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><div className="food-donor"><span className="donor-dot">{donorName[0] || 'F'}</span><span><b>{donorName}</b><small><ShieldCheck size={12} /> {donorCity}</small></span></div>{detailsOpen && <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '12px', background: '#f5f7f2', border: '1px solid #e7efe0', fontSize: '0.82rem', color: '#23412a', lineHeight: 1.6 }}><div><b>Food status:</b> {safeToEat ? 'Safe to eat and ready to share' : 'Needs review before eating'}</div><div><b>Source:</b> {food.address || donorCity}</div><div><b>Donated by:</b> {donorName}{donorPhone ? ` · ${donorPhone}` : ''}</div><div><b>Prepared:</b> {new Date(food.preparedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div><div><b>Best before:</b> {new Date(food.expiryTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div></div>}<div className="food-card-actions"><button type="button" className="map-link" style={{ background: 'transparent', border: 'none', padding: 0, color: '#1b5f3f', fontWeight: 700, cursor: 'pointer' }} onClick={() => setExpandedFoodId(detailsOpen ? null : food._id)}>{detailsOpen ? 'Hide details' : 'View details'}</button><a href={mapHref(food)} target="_blank" rel="noreferrer" className="map-link"><MapPin size={14} />Pickup location</a><button className="button button-dark button-small" disabled={user.role !== 'ngo' || !user.verified} onClick={() => accept(food._id)}>{user.role !== 'ngo' ? 'NGO partners only' : !user.verified ? 'Verification pending' : 'Accept food'} <ArrowRight size={14} /></button></div></div></article>
    })}</div> : <div className="empty-state discover-empty"><span><Compass size={23} /></span><b>No matching food listings right now</b><p>{radius !== 'any' ? 'No active food listings matched these filters within the selected distance. Try expanding your search or check back soon.' : 'No active food listings matched these filters. Try a different search or category, or check back soon.'}</p>{radius !== 'any' && <button onClick={() => setRadius('any')} className="button button-outline">Search any distance</button>}{user.role === 'donor' && <button onClick={() => navigate('/donate')} className="button button-dark">Share some surplus <ArrowRight size={15} /></button>}</div>}
    <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">TRUSTED COMMUNITY</span><h2>Local food partners</h2></div></div><div className="community-links">{[...new Map(matches.filter((food) => food.donor?._id).map((food) => [food.donor._id, food.donor])).values()].slice(0, 8).map((donor) => <Link key={donor._id} to={`/community/${donor._id}`} className="community-link"><span className="table-avatar">{donor.name?.[0]?.toUpperCase()}</span><span><b>{donor.name}</b><small>{donor.verified ? 'Verified food partner' : 'Community donor'}</small></span><ArrowRight size={14} /></Link>)}</div></section>
    <div className="map-section"><div><span className="eyebrow">GET THERE WITH EASE</span><h2>Good food is just around the corner.</h2><p>Pickup pins use OpenStreetMap, with no paid map key. Select a listing’s pickup link for directions.</p></div>{mapCenter ? <MapContainer className="leaflet-map" center={mapCenter} zoom={12} scrollWheelZoom={false}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mappedFoods.map((food) => <Marker key={food._id} position={[food.location.coordinates[1], food.location.coordinates[0]]} icon={foodPinIcon}><Popup><b>{food.name}</b><br />{food.quantity} {food.quantityUnit || 'meals'}<br />{food.address}</Popup></Marker>)}</MapContainer> : <div className="map-preview map-no-coordinates"><MapPin size={22} /><b>No pickup pins to show yet</b><span>Allow location access at sign-up and browse listings with mapped coordinates.</span></div>}</div>
  </DashboardLayout>
}

function AdminUsersPage({ user, logout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); api.get('/admin/users').then(({ data }) => setUsers(data.users)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  const toggleActive = async (member) => {
    try {
      await api.patch(`/admin/users/${member._id}/status`, { active: !member.active })
      load()
    } catch (err) { setError(getErrorMessage(err)) }
  }
  return <DashboardLayout user={user} logout={logout} active="Users"><div className="dashboard-title-row"><div><div className="eyebrow">GROWING GOOD, TOGETHER</div><h1>Community members.</h1><p>Manage accounts and keep our partner network safe and trusted.</p></div></div>{error && <div className="inline-error">{error} <button onClick={load}>Try again</button></div>}<section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">PLATFORM COMMUNITY</span><h2>Registered users</h2></div><button className="table-action" onClick={load}>Refresh <ArrowDown size={14} /></button></div>{loading ? <div className="dashboard-loading"><span className="spinner" />Loading community…</div> : <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>ROLE</th><th>LOCATION</th><th>JOINED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{users.map((member) => <tr key={member._id}><td><div className="food-name-cell"><span className="table-avatar">{member.name?.[0]?.toUpperCase()}</span><span><b>{member.name}</b><small>{member.email}</small></span></div></td><td>{member.role}</td><td>{member.address || '—'}</td><td>{new Date(member.createdAt).toLocaleDateString()}</td><td><StatusPill status={member.active === false ? 'inactive' : member.role === 'ngo' ? member.verified ? 'verified' : 'pending' : 'active'} /></td><td>{member.role !== 'admin' && <button className={`table-action ${member.active === false ? '' : 'cancel-listing'}`} onClick={() => toggleActive(member)}>{member.active === false ? 'Reactivate' : 'Deactivate'}</button>}</td></tr>)}</tbody></table></div>}</section></DashboardLayout>
}

function AdminDonorsPage({ user, logout }) {
  const [donors, setDonors] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [foods, setFoods] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [foodsLoading, setFoodsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const selectedDonor = donors.find((donor) => donor._id === selectedId)
  const loadDonors = () => {
    setLoading(true)
    setError('')
    api.get('/admin/donors').then(({ data }) => {
      setDonors(data.donors)
      setSelectedId((current) => current || data.donors[0]?._id || '')
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false))
  }
  useEffect(() => { loadDonors() }, [])
  useEffect(() => {
    if (!selectedId) {
      setFoods([])
      return
    }
    setFoodsLoading(true)
    api.get(`/admin/donors/${selectedId}/foods`)
      .then(({ data }) => { setFoods(data.foods); setHasMore(data.hasMore) })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setFoodsLoading(false))
  }, [selectedId])
  const visibleDonors = donors.filter((donor) => `${donor.name} ${donor.email} ${donor.city} ${donor.address}`.toLowerCase().includes(search.toLowerCase()))
  const locationText = (location) => location?.coordinates?.length === 2
    ? `${location.coordinates[1].toFixed(5)}, ${location.coordinates[0].toFixed(5)}`
    : 'No coordinates saved'
  return <DashboardLayout user={user} logout={logout} active="Donors">
    <div className="dashboard-title-row"><div><div className="eyebrow">DONOR DIRECTORY</div><h1>Food donors and their listings.</h1><p>Review donor profiles, contact details, and where each food listing was offered for pickup.</p></div><button className="button button-outline button-small" onClick={loadDonors}><ArrowDown size={14} /> Refresh</button></div>
    {error && <div className="inline-error">{error} <button onClick={loadDonors}>Try again</button></div>}
    <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">REGISTERED DONORS</span><h2>{donors.length} donor accounts</h2></div><label className="search-filter"><Search size={16} /><input aria-label="Search donors" placeholder="Search name, email, or city" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      {loading ? <div className="dashboard-loading"><span className="spinner" />Loading donor records…</div> : visibleDonors.length ? <div className="table-wrap"><table><thead><tr><th>DONOR</th><th>CITY / ADDRESS</th><th>LISTINGS</th><th>TOTAL QUANTITY</th><th>JOINED</th></tr></thead><tbody>{visibleDonors.map((donor) => <tr key={donor._id} className={selectedId === donor._id ? 'donor-row-selected' : ''}><td><button className="food-name-cell donor-select" onClick={() => setSelectedId(donor._id)}><span className="table-avatar">{donor.name?.[0]?.toUpperCase()}</span><span><b>{donor.name}</b><small>{donor.email}</small></span></button></td><td>{donor.city || '—'}<small className="cell-subtext">{donor.address || 'Address not provided'}</small></td><td>{donor.listingCount || 0}</td><td>{Number(donor.totalQuantity || 0).toLocaleString()}</td><td>{new Date(donor.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty-state"><b>No donors found</b><p>{search ? 'Try a different search term.' : 'Donor accounts will appear here when they register.'}</p></div>}
    </section>
    {selectedDonor && <><section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">DONOR PROFILE</span><h2>{selectedDonor.name}</h2></div><StatusPill status={selectedDonor.active === false ? 'inactive' : 'active'} /></div><div className="impact-mini-grid"><div><b>{selectedDonor.email}</b><span>Email</span></div><div><b>{selectedDonor.phone || '—'}</b><span>Phone</span></div><div><b>{selectedDonor.whatsappNumber || '—'}</b><span>WhatsApp</span></div><div><b>{selectedDonor.city || '—'}</b><span>City</span></div><div><b>{selectedDonor.address || '—'}</b><span>Profile address</span></div><div><b>{locationText(selectedDonor.location)}</b><span>Saved profile coordinates</span></div></div></section>
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">DONATION HISTORY</span><h2>Food listed by {selectedDonor.name}</h2></div><span className="review-count">{selectedDonor.listingCount || 0} total listings</span></div>
        {foodsLoading ? <div className="dashboard-loading"><span className="spinner" />Loading food history…</div> : foods.length ? <div className="table-wrap"><table><thead><tr><th>FOOD</th><th>QUANTITY</th><th>PICKUP LOCATION</th><th>CREATED</th><th>STATUS</th></tr></thead><tbody>{foods.map((food) => {
          const coordinates = food.location?.coordinates
          const mapUrl = coordinates?.length === 2 ? `https://www.openstreetmap.org/?mlat=${coordinates[1]}&mlon=${coordinates[0]}#map=15/${coordinates[1]}/${coordinates[0]}` : ''
          return <tr key={food._id}><td><div className="food-name-cell"><span><b>{food.name}</b><small>{food.category} · {food.city || selectedDonor.city || 'City not provided'}</small></span></div></td><td>{food.quantity} {food.quantityUnit || 'meals'}</td><td>{food.address || 'Address not provided'}{mapUrl && <small className="cell-subtext"><a href={mapUrl} target="_blank" rel="noreferrer">View pickup on map</a></small>}</td><td>{new Date(food.createdAt).toLocaleString()}</td><td><StatusPill status={food.status} /></td></tr>
        })}</tbody></table></div> : <div className="empty-state"><b>No food listings yet</b><p>This donor has not published any food listings.</p></div>}
        {hasMore && <p className="muted-copy">Showing the latest 500 food listings for this donor.</p>}
      </section></>}
  </DashboardLayout>
}

function AdminNgosPage({ user, logout }) {
  const [ngos, setNgos] = useState([])
  const [priorities, setPriorities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); api.get('/admin/ngos').then(({ data }) => setNgos(data.ngos)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  const verify = async (id) => { try { await api.patch(`/admin/ngos/${id}/verify`, { priority: Number(priorities[id] || 1) }); load() } catch (err) { setError(getErrorMessage(err)) } }
  return <DashboardLayout user={user} logout={logout} active="NGO verification"><div className="dashboard-title-row"><div><div className="eyebrow">A TRUSTED TABLE FOR EVERYONE</div><h1>Partner verification.</h1><p>Review recipient organizations before they can accept food donations.</p></div></div>{error && <div className="inline-error">{error} <button onClick={load}>Try again</button></div>}<section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">COMMUNITY PARTNERS</span><h2>NGO applications</h2></div><span className="review-count">{ngos.filter((n) => !n.verified).length} to review</span></div>{loading ? <div className="dashboard-loading"><span className="spinner" />Loading applications…</div> : ngos.length ? <div className="table-wrap"><table><thead><tr><th>ORGANIZATION</th><th>CONTACT</th><th>LOCATION</th><th>APPLIED</th><th>PRIORITY</th><th>STATUS</th><th></th></tr></thead><tbody>{ngos.map((ngo) => <tr key={ngo._id}><td><div className="food-name-cell"><span className="table-avatar ngo-avatar">{ngo.name?.[0]?.toUpperCase()}</span><span><b>{ngo.name}</b><small>Community recipient</small></span></div></td><td>{ngo.email}<small className="cell-sub">{ngo.phone || ''}</small></td><td>{ngo.address || '—'}</td><td>{new Date(ngo.createdAt).toLocaleDateString()}</td><td>{ngo.verified ? ngo.priority : <select className="priority-select" aria-label={`Priority for ${ngo.name}`} value={priorities[ngo._id] ?? 1} onChange={(e) => setPriorities({ ...priorities, [ngo._id]: e.target.value })}><option value="1">1 — Standard</option><option value="2">2</option><option value="3">3 — Elevated</option><option value="4">4</option><option value="5">5 — Highest</option></select>}</td><td><StatusPill status={ngo.verified ? 'verified' : 'pending'} /></td><td>{!ngo.verified && <button className="verify-button" onClick={() => verify(ngo._id)}><Check size={14} /> Verify</button>}</td></tr>)}</tbody></table></div> : <div className="empty-state"><span><ShieldCheck size={22} /></span><b>No NGO applications yet</b><p>When an organization registers, their verification request will appear here.</p></div>}</section></DashboardLayout>
}

function AdminAuditPage({ user, logout }) {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const load = () => api.get('/admin/audit').then(({ data }) => setLogs(data.logs)).catch((err) => setError(getErrorMessage(err)))
  useEffect(() => { load() }, [])
  const exportLog = async () => {
    try {
      const { data } = await api.get('/admin/reports/audit.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'foodorax-audit.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(getErrorMessage(err)) }
  }
  return <DashboardLayout user={user} logout={logout} active="Audit log"><div className="dashboard-title-row"><div><div className="eyebrow">ADMINISTRATOR ACTIVITY</div><h1>Audit log.</h1><p>Review account, verification, listing and report actions.</p></div><button className="button button-outline" onClick={exportLog}>Export audit CSV</button></div>{error && <div className="inline-error">{error} <button onClick={load}>Try again</button></div>}
    <section className="dashboard-panel"><div className="table-wrap"><table><thead><tr><th>WHEN</th><th>ADMIN</th><th>ACTION</th><th>ITEM</th><th>DETAILS</th></tr></thead><tbody>{logs.map((log) => <tr key={log._id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.actor?.email || '—'}</td><td>{log.action.replaceAll('_', ' ')}</td><td>{log.targetType} · {log.targetId}</td><td>{log.details || '—'}</td></tr>)}</tbody></table></div>{!logs.length && <div className="empty-state"><b>No admin activity yet</b><p>Administrative actions will appear here.</p></div>}</section>
  </DashboardLayout>
}

function AdminOnly({ user, children }) { return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace /> }

export default function App() {
  const auth = useAuth()
  const { user, loading, logout, setUser } = auth
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => {
    if (!location.hash) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])
  const isWorkspace = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin') || ['/donate', '/discover', '/requests', '/recipient', '/profile'].includes(location.pathname)
  return <>{!isWorkspace && location.pathname !== '/login' && location.pathname !== '/register' && <Header user={user} logout={logout} />}
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage key="login" mode="login" setUser={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage key="register" mode="register" setUser={setUser} />} />
      <Route path="/dashboard" element={<Protected user={user} loading={loading}><Dashboard user={user} logout={logout} /></Protected>} />
      <Route path="/recipient" element={<Protected user={user} loading={loading}><DashboardLayout user={user} logout={logout} active="Available food"><RecipientDashboard user={user} logout={logout} /></DashboardLayout></Protected>} />
      <Route path="/donate" element={<Protected user={user} loading={loading}>{user?.role === 'donor' || (user?.role === 'ngo' && new URLSearchParams(location.search).has('request')) ? <DonatePage user={user} logout={logout} /> : <Navigate to="/dashboard" replace />}</Protected>} />
      <Route path="/requests" element={<Protected user={user} loading={loading}>{['donor', 'ngo'].includes(user?.role) ? <FoodRequestsPage user={user} logout={logout} /> : <Navigate to="/dashboard" replace />}</Protected>} />
      <Route path="/discover" element={loading ? <div className="center-loading"><span className="spinner" />Loading FoodoraX…</div> : user ? <DiscoverPage user={user} logout={logout} /> : <PublicDiscoverPage />} />
      <Route path="/community/:id" element={<Protected user={user} loading={loading}><PublicProfilePage user={user} logout={logout} /></Protected>} />
      <Route path="/profile" element={<Protected user={user} loading={loading}><ProfilePage user={user} logout={logout} /></Protected>} />
      <Route path="/admin/users" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminUsersPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="/admin/donors" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminDonorsPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="/admin/ngos" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminNgosPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="/admin/audit" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminAuditPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="*" element={<main className="not-found"><span className="eyebrow">THAT’S A LITTLE TOO FAR</span><h1>We can’t find that page.</h1><Link className="button button-dark" to="/">Back to home <ArrowRight size={15} /></Link></main>} />
    </Routes>
  </>
}
