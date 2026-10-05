import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { divIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, Compass, CookingPot, Gift, HandHeart, Heart, Leaf, LogOut,
  MapPin, Menu, PackageCheck, Plus, Search, ShieldCheck, Sparkles, Users, Utensils,
  X, Zap,
} from 'lucide-react'
import api, { getErrorMessage } from './api'

const foodPhotos = {
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
  meals: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
  rice: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
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
  const navigate = useNavigate()
  const links = [['How it works', '/#how'], ['Find food', '/discover'], ['Our impact', '/#impact']]
  return <header className="site-header"><div className="nav-shell">
    <Brand />
    <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>{links.map(([label, to]) => <a href={to} key={label} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
    <div className="nav-actions">
      {user ? <><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><button className="avatar" onClick={() => navigate('/dashboard')}>{user.name?.[0]?.toUpperCase()}</button><button className="text-button logout-button" onClick={logout}><LogOut size={16} /> Log out</button></>
        : <><Link className="nav-login" to="/login">Log in</Link><Link className="button button-dark button-small" to="/register">Join the movement <ArrowRight size={15} /></Link></>}
      <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>
}

function Footer() {
  return <footer className="footer"><div className="footer-inner"><div><Brand light /><p>Good food deserves a second chance.<br />Together, we can make every meal count.</p></div><div className="footer-links"><a href="/#how">How it works</a><Link to="/discover">Find food</Link><Link to="/register">Become a partner</Link><a href="mailto:hello@foodorax.org">Contact us</a></div><div className="footer-note">Made with <Heart size={14} fill="currentColor" /> for a better tomorrow.</div></div><div className="footer-bottom">© 2025 FoodoraX · Turning surplus into smiles.</div></footer>
}

function Home() {
  return <><section className="hero-wrap"><div className="hero page-width">
    <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> GOOD FOOD. GOOD PEOPLE. BETTER FUTURE.</div>
      <h1>Turning surplus<br />into <span>smiles.</span></h1><p className="hero-subtitle">AI-powered food rescue that brings fresh, surplus food to the communities who need it most.</p>
      <div className="hero-actions"><Link to="/register?role=donor" className="button button-orange">Donate food <ArrowRight size={17} /></Link><Link to="/discover" className="button button-outline">Find food <ArrowUpRight size={16} /></Link></div>
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
  <section className="how-section" id="how"><div className="page-width"><div className="section-heading center-heading"><div className="eyebrow">GOOD FOOD. THREE EASY STEPS.</div><h2>Rescue a meal.<br /><span>Spread a little joy.</span></h2></div><div className="steps-grid">
    {[[Gift, '01', 'Share your surplus', 'A restaurant, campus or local event lists food that is fresh, safe and ready to share.'], [Sparkles, '02', 'Get a smart match', 'Our matching engine finds a nearby verified partner with the right needs and pickup window.'], [PackageCheck, '03', 'Make someone’s day', 'The partner picks up, verifies the handoff and gets good food to their community.']].map(([Icon, number, title, copy]) => <article className="step-card" key={number}><div className="step-icon"><Icon size={23} /><span>{number}</span></div><h3>{title}</h3><p>{copy}</p></article>)}
  </div></div></section>
  <section className="feature-section page-width"><div className="feature-visual"><img src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85" alt="Community members preparing and sharing food" /><div className="feature-badge"><span><Check size={17} /></span><div><b>Every handoff matters</b><small>Verified, tracked, delivered</small></div></div></div><div className="feature-copy"><div className="eyebrow">TECH WITH A HUMAN SIDE</div><h2>Smarter matches.<br /><span>Warmer hearts.</span></h2><p>We make food rescue feel effortless with tools designed to get good food moving before time runs out.</p><ul>{[['Match by distance and need', 'Connect with the closest partner ready to collect.'], ['Know where every meal goes', 'Follow donations from listing to delivery in real time.'], ['Trust the handoff', 'Verified partners and secure pickup codes build confidence.']].map(([title, copy]) => <li key={title}><span><Check size={15} /></span><div><b>{title}</b><small>{copy}</small></div></li>)}</ul><Link to="/register" className="button button-dark">Be part of it <ArrowRight size={16} /></Link></div></section>
  <section className="testimonial-section"><div className="page-width testimonial-content"><div className="eyebrow">BETTER, TOGETHER</div><div className="quote-mark">“</div><blockquote>FoodoraX has made it so easy to share what we have with people who need it. It turns the end of every service into a new beginning.</blockquote><div className="quote-author"><div className="quote-avatar">SK</div><div><b>Sarah K.</b><span>Community kitchen partner · Bengaluru</span></div></div><div className="quote-decoration"><Leaf size={34} /><Leaf size={22} /></div></div></section>
  <section className="cta-section page-width"><div className="cta-card"><div className="cta-deco"><Leaf /><Leaf /></div><div><span className="eyebrow">YOUR NEIGHBOURHOOD IS READY</span><h2>There’s a place for<br />everyone at this table.</h2><p>Whether you have food to share or a community to feed, we’re glad you’re here.</p></div><div className="cta-buttons"><Link to="/register?role=donor" className="button button-orange">I have food to share <ArrowRight size={16} /></Link><Link to="/register?role=ngo" className="button button-light">I’m an NGO partner <ArrowRight size={16} /></Link></div></div></section><Footer /></>
}

function AuthPage({ mode, setUser }) {
  const register = mode === 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: new URLSearchParams(window.location.search).get('role') || 'donor', address: '', latitude: '', longitude: '', quantityNeeded: '', preferredCategories: [] })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [located, setLocated] = useState(false)
  const navigate = useNavigate()
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
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
      const payload = register ? { ...form, quantityNeeded: Number(form.quantityNeeded || 0), location: { type: 'Point', coordinates: form.longitude && form.latitude ? [Number(form.longitude), Number(form.latitude)] : [] } } : { email: form.email, password: form.password }
      const { data } = await api.post(endpoint, payload)
      localStorage.setItem('foodorax-token', data.token)
      setUser(data.user)
      navigate('/dashboard')
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }
  return <main className="auth-layout"><div className="auth-story"><Brand light /><div className="auth-story-content"><span className="eyebrow">A LITTLE GOOD GOES A LONG WAY</span><h1>One meal can<br />change a day.</h1><p>Join a growing community turning surplus into something wonderful.</p><div className="auth-story-stats"><span><b>12,450+</b> meals rescued</span><span><b>82</b> verified partners</span></div></div><div className="auth-story-foot">FoodoraX · Turning surplus into smiles.</div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><Link to="/" className="back-home">← Back to home</Link><div className="auth-heading"><span className="eyebrow">{register ? 'WELCOME TO THE TABLE' : 'GOOD TO HAVE YOU BACK'}</span><h2>{register ? 'Let’s do some good.' : 'Welcome back.'}</h2><p>{register ? 'Create your account and find your place in the movement.' : 'Log in to pick up where the good left off.'}</p></div>
      <form onSubmit={submit} className="auth-form">
        {register && <label>Your name<input name="name" placeholder="e.g. Priya Sharma" value={form.name} onChange={update} autoComplete="name" required /></label>}
        <label>Email address<input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={update} autoComplete="email" required /></label>
        {register && <label>I'm joining as<select name="role" value={form.role} onChange={update}><option value="donor">A food donor</option><option value="ngo">An NGO / recipient</option></select></label>}
        <label>Password<input name="password" type="password" placeholder={register ? 'At least 8 characters' : 'Enter your password'} value={form.password} onChange={update} autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required /></label>
        {register && <><label>Phone number <span className="optional">(optional)</span><input name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={update} /></label><label>Organization / pickup address <span className="optional">(optional)</span><input name="address" placeholder="Area, city" value={form.address} onChange={update} /></label>{form.role === 'ngo' && <><label>Meals your organization can use <span className="optional">(optional)</span><input name="quantityNeeded" type="number" min="0" placeholder="e.g. 40" value={form.quantityNeeded} onChange={update} /></label><div className="category-preferences"><span>Food preferences <span className="optional">(optional)</span></span><div>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((category) => <label key={category}><input type="checkbox" checked={form.preferredCategories.includes(category)} onChange={(e) => setForm((old) => ({ ...old, preferredCategories: e.target.checked ? [...old.preferredCategories, category] : old.preferredCategories.filter((item) => item !== category) }))} />{category}</label>)}</div></div></>}<button type="button" className={`location-button ${located ? 'location-found' : ''}`} onClick={locateMe}><MapPin size={16} />{located ? 'Location added — nearby matches enabled' : 'Use my current location for nearby matches'}</button></>}
        {error && <div className="form-error">{error}</div>}
        <button className="button button-dark auth-submit" disabled={busy}>{busy ? 'One moment…' : register ? 'Create my account' : 'Log in'} <ArrowRight size={16} /></button>
      </form><div className="auth-switch">{register ? 'Already part of the movement?' : 'New to the movement?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></div><div className="auth-safe"><ShieldCheck size={15} /> Your details are safely encrypted.</div></div></div></main>
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

function DashboardLayout({ user, logout, children, active }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = user.role === 'admin' ? [['Overview', '/dashboard', Compass], ['Users', '/admin/users', Users], ['NGO verification', '/admin/ngos', ShieldCheck], ['Food listings', '/discover', Utensils]] : user.role === 'donor' ? [['Overview', '/dashboard', Compass], ['My donations', '/dashboard?tab=donations', Gift], ['Add food', '/donate', Plus]] : [['Overview', '/dashboard', Compass], ['Find food', '/discover', Search], ['My pickups', '/dashboard?tab=pickups', PackageCheck]]
  return <div className="dashboard-shell"><aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><Brand light /><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div><div className="sidebar-caption">WORKSPACE</div><nav className="sidebar-nav">{items.map(([label, path, Icon]) => <Link key={label} to={path} onClick={() => setMobileOpen(false)} className={active === label ? 'sidebar-active' : ''}><Icon size={18} />{label}{label === 'NGO verification' && <span className="nav-count">!</span>}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><CircleHelp size={18} /><div><b>Need a hand?</b><span>We’re here for you</span></div><ArrowUpRight size={14} /></div><button className="sidebar-user" onClick={() => navigate('/dashboard')}><span className="avatar sidebar-avatar">{user.name?.[0]?.toUpperCase()}</span><span><b>{user.name}</b><small>{user.role === 'ngo' ? 'Community partner' : user.role === 'admin' ? 'Administrator' : 'Food donor'}</small></span><ChevronDown size={15} /></button><button className="sidebar-logout" onClick={logout}><LogOut size={15} /> Log out</button></div></aside>
    <main className="dashboard-main"><header className="dashboard-topbar"><button className="icon-button dashboard-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button><span className="crumb">Workspace <span>/</span> {active}</span><div className="topbar-right"><span className="topbar-date"><span className="live-dot" /> All systems growing</span><span className="topbar-avatar">{user.name?.[0]?.toUpperCase()}</span></div></header><div className="dashboard-content">{children}</div></main></div>
}

function MetricCard({ icon: Icon, label, value, note, tone = 'green' }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><span className="metric-label">{label}</span><strong>{value ?? '—'}</strong><small>{note}</small></article>
}

function Dashboard({ user, logout }) {
  const [stats, setStats] = useState(null)
  const [foods, setFoods] = useState([])
  const [donations, setDonations] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [codeInput, setCodeInput] = useState({})
  const isAdmin = user.role === 'admin', isDonor = user.role === 'donor'
  const currentTab = new URLSearchParams(useLocation().search).get('tab')
  const activeLabel = isAdmin ? 'Overview' : currentTab ? (isDonor ? 'My donations' : 'My pickups') : 'Overview'
  const load = () => {
    setLoading(true); setError('')
    const requests = user.role === 'admin' ? [api.get('/admin/analytics'), api.get('/admin/users'), api.get('/food')]
      : [isDonor ? api.get('/food', { params: { mine: 'true' } }) : api.get('/food/recommendations'), api.get('/donations')]
    Promise.all(requests).then((results) => {
      if (user.role === 'admin') { setStats(results[0].data.analytics); setFoods(results[2].data.foods); setDonations(results[1].data.users) }
      else { setFoods(results[0].data.foods); setDonations(results[1].data.donations) }
    }).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [user.role])
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('foodorax-token') } })
    socket.on('notification', (item) => { setToast(item.message); load(); setTimeout(() => setToast(''), 4500) })
    socket.on('food:updated', load)
    return () => socket.disconnect()
  }, [user.role])
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
  const active = donations.filter((d) => !['delivered', 'cancelled'].includes(d.status))
  const done = donations.filter((d) => d.status === 'delivered')
  const rescued = done.reduce((sum, d) => sum + Number(d.food?.quantity || 0), 0)
  const displayFoods = isAdmin ? foods : foods
  return <DashboardLayout user={user} logout={logout} active={activeLabel}>
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label="Close notification"><X size={16} /></button></div>}
    <div className="dashboard-title-row"><div><div className="eyebrow">{isAdmin ? 'FOODORAX CONTROL ROOM' : `GOOD ${new Date().getHours() < 12 ? 'MORNING' : 'DAY'}, ${user.name.split(' ')[0].toUpperCase()}`}</div><h1>{isAdmin ? 'Impact at a glance.' : `Let’s make today count${user.name ? `, ${user.name.split(' ')[0]}` : ''}.`}</h1><p>{isAdmin ? 'A real-time view of your community’s food rescue.' : isDonor ? 'Your surplus can be someone’s next warm meal.' : 'Find a fresh match for your community today.'}</p></div>{isDonor && <Link to="/donate" className="button button-dark"><Plus size={17} /> Add surplus food</Link>}{user.role === 'ngo' && <Link to="/discover" className="button button-dark"><Search size={16} /> Find nearby food</Link>}</div>
    {error && <div className="inline-error">{error} <button onClick={load}>Try again</button></div>}
    {loading ? <div className="dashboard-loading"><span className="spinner" />Loading your latest impact…</div> : <>
      <div className="metrics-grid">
        {isAdmin ? <><MetricCard icon={Users} label="Community members" value={stats?.users ?? 0} note="Registered on the platform" /><MetricCard icon={Gift} label="Food listings" value={stats?.totalDonations ?? 0} note={`${stats?.activeDonations ?? 0} active right now`} tone="orange" /><MetricCard icon={HandHeart} label="Meals rescued" value={stats?.mealsRescued?.toLocaleString() ?? 0} note="Quantity delivered successfully" /><MetricCard icon={ShieldCheck} label="Verified NGOs" value={stats?.verifiedNgos ?? 0} note={`${stats?.pendingNgos ?? 0} waiting for review`} tone="blue" /></>
          : isDonor ? <><MetricCard icon={Gift} label="Total donations" value={foods.length} note="Food shared with your community" /><MetricCard icon={Clock3} label="Active donations" value={foods.filter((f) => !['delivered', 'cancelled'].includes(f.status)).length} note="Making their way to a table" tone="orange" /><MetricCard icon={PackageCheck} label="Completed" value={done.length} note="Successful food handoffs" tone="blue" /><MetricCard icon={Leaf} label="Meals rescued" value={rescued.toLocaleString()} note="Thanks to your generosity" /></>
          : <><MetricCard icon={Compass} label="Nearby food" value={foods.length} note="Available listings in your area" /><MetricCard icon={Clock3} label="Active pickups" value={active.length} note="Accepted and on the move" tone="orange" /><MetricCard icon={PackageCheck} label="Completed pickups" value={done.length} note="Community meals delivered" tone="blue" /><MetricCard icon={Sparkles} label="Match readiness" value={user.verified ? 'Verified' : 'Pending'} note={user.verified ? 'Ready for smart matches' : 'Admin verification required'} /></>}
      </div>
      {isAdmin && <section className="admin-summary-row"><div className="summary-panel"><div className="panel-heading"><div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>Partner verification</h2></div><Link to="/admin/ngos">Review NGOs <ArrowRight size={15} /></Link></div><div className="summary-highlight"><span className="summary-highlight-icon"><ShieldCheck size={20} /></span><div><b>{stats?.pendingNgos ?? 0} partners waiting</b><small>Verify trusted NGOs so they can start accepting food.</small></div><Link className="round-action" to="/admin/ngos"><ArrowRight size={17} /></Link></div></div><div className="summary-panel env-panel"><span className="eyebrow">YOUR COMMUNITY’S IMPACT</span><h2>{(stats?.estimatedKgSaved || 0).toLocaleString()} kg <span>food saved</span></h2><div className="progress-track"><i style={{ width: `${Math.min(100, (stats?.mealsRescued || 0) / 100)}%` }} /></div><div className="impact-mini-grid"><div><b>{stats?.donors ?? 0}</b><span>food donors</span></div><div><b>{stats?.completedDonations ?? 0}</b><span>completed rescues</span></div><div><b>{stats?.estimatedPeopleSupported ?? 0}</b><span>people supported</span></div></div></div></section>}
      <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">{isAdmin ? 'LIVE PLATFORM ACTIVITY' : isDonor ? 'YOUR FOOD, FINDING A HOME' : 'YOUR COMMUNITY PICKUPS'}</span><h2>{isAdmin ? 'Recent food listings' : isDonor ? 'Recent donations' : 'Donation tracker'}</h2></div><Link to={isDonor ? '/donate' : '/discover'}>{isDonor ? 'Add food' : 'Explore listings'} <ArrowRight size={15} /></Link></div>
        {!displayFoods.length && !donations.length ? <div className="empty-state"><span><Utensils size={22} /></span><b>No activity just yet</b><p>{isDonor ? 'List your first surplus meal and let a nearby community enjoy it.' : 'Your accepted donations and pickup progress will show up here.'}</p><Link to={isDonor ? '/donate' : '/discover'} className="button button-dark">{isDonor ? 'Add your first listing' : 'Discover food'} <ArrowRight size={15} /></Link></div>
          : <div className="table-wrap"><table><thead><tr><th>{isAdmin ? 'FOOD LISTING' : 'DONATION'}</th><th>{isAdmin ? 'DONOR' : 'QUANTITY'}</th><th>{isAdmin ? 'CATEGORY' : 'PICKUP WINDOW'}</th><th>STATUS</th><th>{isAdmin ? '' : 'NEXT STEP'}</th></tr></thead><tbody>
            {(isAdmin ? displayFoods : isDonor ? displayFoods : donations).slice(0, 7).map((item) => {
              const donation = item.food ? item : isDonor ? donations.find((record) => record.food?._id === item._id) : null
              const food = donation?.food || item
              if (!food) return null
              const status = donation?.status || food.status
              return <tr key={item._id}><td><div className="food-name-cell"><img src={food.image || foodPhotos.meals} alt="" /><span><b>{food.name}</b><small><MapPin size={12} />{food.address || food.location?.label || 'Pickup location shared after matching'}</small></span></div></td><td>{isAdmin ? food.donor?.name || '—' : `${food.quantity} ${food.quantityUnit || 'meals'}`}</td><td>{isAdmin ? food.category : new Date(food.pickupTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td><StatusPill status={status} /></td><td>{isAdmin && !['delivered', 'cancelled'].includes(status) && <button className="table-action cancel-listing" onClick={() => cancelListing(food._id)}>Cancel listing</button>}{isDonor && !donation && status === 'listed' && <button className="table-action cancel-listing" onClick={() => cancelListing(food._id)}>Cancel listing</button>}{!isAdmin && donation && status === 'accepted' && user.role === 'ngo' && <button className="table-action" onClick={() => updateStatus(donation._id, 'pickup_started')}>Start pickup <ArrowRight size={13} /></button>}{!isAdmin && donation && status === 'pickup_started' && user.role === 'ngo' && <div className="verify-inline"><input aria-label="Pickup code" placeholder="Donor’s 6-digit code" maxLength={6} value={codeInput[donation._id] || ''} onChange={(e) => setCodeInput({ ...codeInput, [donation._id]: e.target.value })} /><button onClick={() => updateStatus(donation._id, 'delivered', codeInput[donation._id])}>Verify</button></div>}{!isAdmin && donation && user.role === 'donor' && <span className="pickup-code">Code <b>{donation.verificationCode || '••••••'}</b></span>}</td></tr>
            })}</tbody></table></div>}
      </section>
      {!isAdmin && user.role === 'ngo' && <NearbyPanel user={user} foods={foods} />}
    </>}
  </DashboardLayout>
}

function NearbyPanel({ user, foods }) {
  const listed = foods.slice(0, 4)
  return <section className="dashboard-panel nearby-panel"><div className="panel-heading"><div><span className="eyebrow">FRESH FOOD, CLOSE TO HOME</span><h2>Nearby pickup spots</h2></div><Link to="/discover">See all nearby <ArrowRight size={15} /></Link></div>{listed.length ? <div className="nearby-grid">{listed.map((food) => <div className="nearby-mini" key={food._id}><img src={food.image || foodPhotos.meals} alt="" /><div><b>{food.name}</b><small><MapPin size={12} />{relativeDistance(food, user)?.toFixed(1) || '—'} km away · {food.quantity} {food.quantityUnit || 'meals'}</small></div><StatusPill status={food.status} /></div>)}</div> : <p className="muted-copy">No nearby listings at this moment. Check back soon.</p>}</section>
}

function DonatePage({ user, logout }) {
  const [form, setForm] = useState({ name: '', category: 'Prepared meals', quantity: '', quantityUnit: 'meals', description: '', image: foodPhotos.meals, address: user.address || '', preparedAt: '', pickupTime: '', expiryTime: '' })
  const [safety, setSafety] = useState({ edible: false, stored: false, uncontaminated: false })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const setValue = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('')
    if (!Object.values(safety).every(Boolean)) return setError('Please confirm every food safety check before publishing.')
    if (new Date(form.preparedAt) > new Date() || new Date(form.preparedAt) > new Date(form.pickupTime)) return setError('Preparation time must be in the past and before pickup.')
    if (new Date(form.expiryTime) <= new Date(form.pickupTime)) return setError('The expiry time must be after the pickup time.')
    setBusy(true)
    try {
      await api.post('/food', {
        ...form,
        quantity: Number(form.quantity),
        preparedAt: new Date(form.preparedAt).toISOString(),
        pickupTime: new Date(form.pickupTime).toISOString(),
        expiryTime: new Date(form.expiryTime).toISOString(),
        location: user.location,
        safetyChecklist: { ...safety, preparationTimeEntered: true, expiryTimeEntered: true },
      })
      setMessage('Your food is listed! We’ll find a nearby community partner.')
      setTimeout(() => navigate('/dashboard'), 1300)
    } catch (err) { setError(getErrorMessage(err)) } finally { setBusy(false) }
  }
  return <DashboardLayout user={user} logout={logout} active="Add food"><div className="dashboard-title-row donate-heading"><div><div className="eyebrow">A LITTLE GOOD STARTS HERE</div><h1>Share the good stuff.</h1><p>Add your surplus and we’ll help it find a nearby table.</p></div><span className="donate-illustration"><Gift size={30} /></span></div>
    <form className="donation-form" onSubmit={submit}><div className="form-section"><div className="form-section-title"><span>01</span><div><h2>Tell us about the food</h2><p>A few details help the right partner find you.</p></div></div><div className="form-grid"><label>Food name<input name="name" value={form.name} onChange={setValue} placeholder="e.g. Fresh vegetable biryani" required /></label><label>Food category<select name="category" value={form.category} onChange={setValue}>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Quantity<div className="quantity-combo"><input name="quantity" type="number" min="1" value={form.quantity} onChange={setValue} placeholder="50" required /><select name="quantityUnit" value={form.quantityUnit} onChange={setValue}><option>meals</option><option>kg</option><option>boxes</option><option>portions</option></select></div></label><label>Pickup address<input name="address" value={form.address} onChange={setValue} placeholder="Street, area, city" required /></label><label className="full-label">A little more about it<textarea name="description" value={form.description} onChange={setValue} rows="3" placeholder="What should your community partner know?" /></label><label className="full-label">Food photo URL <span className="optional">(optional)</span><input name="image" type="url" value={form.image} onChange={setValue} placeholder="https://…" /></label></div></div>
      <div className="form-section"><div className="form-section-title"><span>02</span><div><h2>Set the food and pickup times</h2><p>Preparation and pickup times help partners confirm food safety.</p></div></div><div className="form-grid"><label>Prepared at<input name="preparedAt" type="datetime-local" value={form.preparedAt} onChange={setValue} required /></label><label>Ready for pickup<input name="pickupTime" type="datetime-local" value={form.pickupTime} onChange={setValue} required /></label><label>Best before / expiry<input name="expiryTime" type="datetime-local" value={form.expiryTime} onChange={setValue} required /></label></div></div>
      <div className="form-section safety-section"><div className="form-section-title"><span>03</span><div><h2>Food safety comes first</h2><p>Please confirm each of these before publishing.</p></div></div><div className="safety-list">{[['edible', 'This food is safe and edible'], ['stored', 'It has been stored at the right temperature'], ['uncontaminated', 'It is free from contamination and properly handled']].map(([key, text]) => <label className="safety-check" key={key}><input type="checkbox" checked={safety[key]} onChange={(e) => setSafety({ ...safety, [key]: e.target.checked })} /><span className="checkmark"><Check size={13} /></span>{text}</label>)}</div></div>
      {error && <div className="form-error">{error}</div>}{message && <div className="form-success"><CheckCircle2 size={17} />{message}</div>}<div className="form-submit-row"><p><ShieldCheck size={15} /> All food listings are shared with verified partners.</p><button className="button button-dark" disabled={busy}>{busy ? 'Publishing…' : 'Publish food listing'} <ArrowRight size={16} /></button></div>
    </form></DashboardLayout>
}

function matchScore(food, user) {
  if (Number.isFinite(food.matchScore)) return food.matchScore
  const distance = relativeDistance(food, user)
  const km = distance ?? 12
  const q = Number(food.quantity || 0)
  const quantityScore = q >= 25 ? 28 : q > 0 ? 15 : 0
  const timeLeft = (new Date(food.expiryTime) - Date.now()) / 36e5
  const timeScore = timeLeft > 4 ? 25 : timeLeft > 0 ? 15 : 0
  return Math.max(20, Math.round(100 - Math.min(km, 30) * 1.2 + quantityScore + timeScore + (user.verified ? 5 : 0)))
}

function DiscoverPage({ user, logout }) {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ category: '', search: '', minQuantity: '' })
  const [toast, setToast] = useState('')
  const navigate = useNavigate()
  const fetchFoods = () => {
    setLoading(true); setError('')
    (user.role === 'ngo'
      ? api.get('/food/recommendations', { params: filters })
      : api.get('/food', { params: { ...filters, status: 'listed' } }))
      .then(({ data }) => setFoods(data.foods)).catch((err) => setError(getErrorMessage(err))).finally(() => setLoading(false))
  }
  useEffect(() => { fetchFoods() }, [filters.category, filters.search, filters.minQuantity])
  const matches = useMemo(() => [...foods].sort((a, b) => matchScore(b, user) - matchScore(a, user)), [foods, user])
  const mappedFoods = foods.filter((food) => food.location?.coordinates?.length === 2)
  const firstPoint = mappedFoods[0]?.location.coordinates
  const userPoint = user.location?.coordinates
  const mapCenter = userPoint?.length === 2 ? [userPoint[1], userPoint[0]] : firstPoint ? [firstPoint[1], firstPoint[0]] : null
  const accept = async (foodId) => {
    try {
      const { data } = await api.post(`/food/${foodId}/accept`)
      setToast(`You’re matched! Your pickup code is ${data.donation.verificationCode}. Share it with the donor when you collect the food.`)
      fetchFoods()
      setTimeout(() => setToast(''), 8000)
    } catch (err) { setToast(getErrorMessage(err)); setTimeout(() => setToast(''), 5000) }
  }
  const mapHref = (food) => food.location?.coordinates?.length ? `https://www.openstreetmap.org/?mlat=${food.location.coordinates[1]}&mlon=${food.location.coordinates[0]}#map=14/${food.location.coordinates[1]}/${food.location.coordinates[0]}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(food.address || '')}`
  return <DashboardLayout user={user} logout={logout} active="Find food"><div className="dashboard-title-row discover-title"><div><div className="eyebrow">FRESH FROM YOUR NEIGHBOURHOOD</div><h1>Good food, close by.</h1><p>Discover verified surplus food and find the right match for your community.</p></div><div className="location-chip"><MapPin size={15} />{user.location?.coordinates?.length ? 'Sorted by nearby' : 'Add your location for distance matches'}</div></div>
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast('')} aria-label="Close notification"><X size={16} /></button></div>}
    <div className="match-banner"><span className="match-spark"><Sparkles size={20} /></span><div><b>Smart matches, made for your community</b><small>Ranked by pickup distance, quantity, freshness and your verified partner status.</small></div><span className="match-powered">MATCHED FOR YOU <ArrowDown size={14} /></span></div>
    <div className="filter-bar"><label className="search-filter"><Search size={17} /><input placeholder="Search meals, ingredients, location…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label><select aria-label="Food category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{['Prepared meals', 'Bakery', 'Produce', 'Dairy', 'Packaged food', 'Other'].map((x) => <option key={x}>{x}</option>)}</select><label className="min-quantity"><span>Min. quantity</span><input type="number" min="1" placeholder="Any" value={filters.minQuantity} onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })} /></label><button className="icon-button filter-refresh" onClick={fetchFoods} aria-label="Refresh listings"><ArrowDown size={16} /></button></div>
    {error && <div className="inline-error">{error} <button onClick={fetchFoods}>Try again</button></div>}
    {loading ? <div className="dashboard-loading"><span className="spinner" />Finding the freshest nearby matches…</div> : matches.length ? <div className="food-grid">{matches.map((food, index) => <article className="food-card" key={food._id}><div className="food-image-wrap"><img src={food.image || foodPhotos.meals} alt={food.name} /><span className="food-fresh"><i /> Fresh listing</span>{user.role === 'ngo' && index < 3 && <span className="smart-match-tag"><Sparkles size={12} /> {food.matchScore}% match</span>}</div><div className="food-card-body"><div className="food-card-top"><span className="food-category">{food.category}</span><span className="food-distance"><MapPin size={13} />{(food.distanceKm ?? relativeDistance(food, user))?.toFixed(1) || 'Nearby'}{(food.distanceKm ?? relativeDistance(food, user)) !== null ? ' km' : ''}</span></div><h2>{food.name}</h2><p className="food-description">{food.description || 'Fresh surplus food ready to be shared with your community.'}</p><div className="food-details"><span><Utensils size={14} /><b>{food.quantity} {food.quantityUnit || 'meals'}</b></span><span><Clock3 size={14} />By {new Date(food.expiryTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><div className="food-donor"><span className="donor-dot">{food.donor?.name?.[0] || 'F'}</span><span><b>{food.donor?.name || 'Local food donor'}</b><small><ShieldCheck size={12} /> Community partner</small></span></div><div className="food-card-actions"><a href={mapHref(food)} target="_blank" rel="noreferrer" className="map-link"><MapPin size={14} />Pickup location</a><button className="button button-dark button-small" disabled={user.role !== 'ngo' || !user.verified} onClick={() => accept(food._id)}>{user.role !== 'ngo' ? 'NGO partners only' : !user.verified ? 'Verification pending' : 'Accept food'} <ArrowRight size={14} /></button></div></div></article>)}</div> : <div className="empty-state discover-empty"><span><Compass size={23} /></span><b>No matching food listings right now</b><p>Try a different search or category, or come back soon. Great things are always being shared.</p>{user.role === 'donor' && <button onClick={() => navigate('/donate')} className="button button-dark">Share some surplus <ArrowRight size={15} /></button>}</div>}
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

function AdminOnly({ user, children }) { return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace /> }

export default function App() {
  const auth = useAuth()
  const { user, loading, logout, setUser } = auth
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  const isWorkspace = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin') || ['/donate', '/discover'].includes(location.pathname)
  return <>{!isWorkspace && location.pathname !== '/login' && location.pathname !== '/register' && <Header user={user} logout={logout} />}
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage key="login" mode="login" setUser={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage key="register" mode="register" setUser={setUser} />} />
      <Route path="/dashboard" element={<Protected user={user} loading={loading}><Dashboard user={user} logout={logout} /></Protected>} />
      <Route path="/donate" element={<Protected user={user} loading={loading}>{user?.role === 'donor' ? <DonatePage user={user} logout={logout} /> : <Navigate to="/dashboard" replace />}</Protected>} />
      <Route path="/discover" element={<Protected user={user} loading={loading}><DiscoverPage user={user} logout={logout} /></Protected>} />
      <Route path="/admin/users" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminUsersPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="/admin/ngos" element={<Protected user={user} loading={loading}><AdminOnly user={user}><AdminNgosPage user={user} logout={logout} /></AdminOnly></Protected>} />
      <Route path="*" element={<main className="not-found"><span className="eyebrow">THAT’S A LITTLE TOO FAR</span><h1>We can’t find that page.</h1><Link className="button button-dark" to="/">Back to home <ArrowRight size={15} /></Link></main>} />
    </Routes>
  </>
}
