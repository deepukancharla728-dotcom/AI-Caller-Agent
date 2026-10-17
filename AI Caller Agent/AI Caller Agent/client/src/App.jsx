import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Bell, Bot, CheckCircle2, ChevronRight, Clock3,
  Download, GraduationCap, Headphones, LayoutDashboard, LogIn, LogOut,
  Mic, MicOff, Phone, PhoneForwarded, Search, Settings as SettingsIcon,
  ShieldCheck, Users, UserRound, X
} from 'lucide-react'
import { createSpeechRecognition, speakText } from './speech.js'

const guardianGroups = [
  { guardian: 'Ravi Kumar', seed: { id: 'STU-1001', name: 'Rahul Verma', section: 'B.Tech CSE - A', attendance: 'Present' } },
  { guardian: 'Meena Sharma', seed: { id: 'STU-1002', name: 'Priya Nair', section: 'B.Tech CSE - B', attendance: 'Present' } },
  { guardian: 'Suresh Patel', seed: { id: 'STU-1003', name: 'Arjun Rao', section: 'B.Tech IT - A', attendance: 'Not updated' } },
  { guardian: 'Lakshmi Reddy', seed: { id: 'STU-1004', name: 'Nisha Menon', section: 'B.Tech ECE - A', attendance: 'Absent' } },
  { guardian: 'Amit Singh', seed: { id: 'STU-1005', name: 'Vikram Das', section: 'B.Tech CSE - C', attendance: 'Present' } }
]
const generatedFirstNames = [
  'Aarav', 'Aadhya', 'Aarohi', 'Aditya', 'Aishwarya', 'Akash', 'Amrita', 'Ananya', 'Anika', 'Anirudh',
  'Arnav', 'Avani', 'Bhavya', 'Charan', 'Diya', 'Dhruv', 'Esha', 'Gautam', 'Ishita', 'Ishaan',
  'Jaya', 'Kabir', 'Kavya', 'Kiran', 'Krishna', 'Madhav', 'Meera', 'Mihir', 'Nandini', 'Neha',
  'Nikhil', 'Pallavi', 'Pranav', 'Raghav', 'Rhea', 'Rohan', 'Saanvi', 'Sahil', 'Samira', 'Tanvi',
  'Varun', 'Vedant', 'Vihaan', 'Yash', 'Zoya', 'Anmol', 'Deepa', 'Harini', 'Manav'
]
const generatedSurnames = ['Verma', 'Nair', 'Rao', 'Menon', 'Das', 'Gupta', 'Iyer', 'Bose', 'Kulkarni', 'Joshi']
const sections = ['B.Tech CSE - A', 'B.Tech CSE - B', 'B.Tech CSE - C', 'B.Tech IT - A', 'B.Tech ECE - A']
const attendanceOptions = ['Present', 'Present', 'Absent', 'Not updated']
const students = guardianGroups.flatMap((group, guardianIndex) => [
  { ...group.seed, guardian: group.guardian },
  ...generatedFirstNames.map((firstName, index) => ({
    id: `STU-${1006 + guardianIndex * generatedFirstNames.length + index}`,
    name: `${firstName} ${generatedSurnames[index % generatedSurnames.length]}`,
    section: sections[(index + guardianIndex) % sections.length],
    attendance: attendanceOptions[(index + guardianIndex) % attendanceOptions.length],
    guardian: group.guardian
  }))
])
const navItems = [
  ['Overview', LayoutDashboard],
  ['Students', GraduationCap],
  ['AI Call Agent', Bot],
  ['Call History', Clock3],
  ['Emergency Alerts', AlertTriangle],
  ['Settings', SettingsIcon]
]

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.headers || {}) }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`)
  return data
}

function getInitialSetting(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [authState, setAuthState] = useState('checking')
  const [authError, setAuthError] = useState('')
  const [userLabel, setUserLabel] = useState('Demo Guardian')
  const [page, setPage] = useState('Overview')
  const [notice, setNotice] = useState('')
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState('')
  const [healthLoading, setHealthLoading] = useState(true)
  const [calls, setCalls] = useState([])
  const [callsLoading, setCallsLoading] = useState(false)
  const [callsError, setCallsError] = useState('')
  const [agentOn, setAgentOn] = useState(true)
  const [activeCall, setActiveCall] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [callStatus, setCallStatus] = useState('')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [replyError, setReplyError] = useState('')
  const [busy, setBusy] = useState(false)
  const [escalationReason, setEscalationReason] = useState('')
  const [notificationHistory, setNotificationHistory] = useState([])
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(() => getInitialSetting('cc-voice-enabled', 'true') === 'true')
  const [speechLanguage, setSpeechLanguage] = useState(() => getInitialSetting('cc-speech-language', 'en-IN'))
  const recognitionRef = useRef(null)
  const problemRef = useRef('')
  const callSessionRef = useRef(0)

  async function loadHealth() {
    setHealthLoading(true)
    setHealthError('')
    try {
      setHealth(await apiRequest('/api/health'))
    } catch (error) {
      setHealthError(error.message)
    } finally {
      setHealthLoading(false)
    }
  }

  async function loadCalls() {
    setCallsLoading(true)
    setCallsError('')
    try {
      const result = await apiRequest('/api/calls')
      setCalls(Array.isArray(result.items) ? result.items : [])
    } catch (error) {
      setCallsError(error.message)
    } finally {
      setCallsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    apiRequest('/api/health')
      .then(data => { if (active) setHealth(data) })
      .catch(error => { if (active) setHealthError(error.message) })
      .finally(() => { if (active) setHealthLoading(false) })
    apiRequest('/api/auth/session')
      .then(data => { if (active) setAuthState(data.authenticated ? 'signed-in' : 'signed-out') })
      .catch(error => {
        if (!active) return
        setAuthError(error.message)
        setAuthState('signed-out')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (authState === 'signed-in') void loadCalls()
  }, [authState])

  useEffect(() => {
    if (!activeCall || countdown === null) return undefined
    if (countdown === 0) {
      setCountdown(null)
      if (!voiceEnabled) {
        setCallStatus('ready')
        setNotice('Voice is off. Type a short message, or enable voice in Settings.')
        return undefined
      }
      setCallStatus('connecting')
      speak('The AI demo is ready. Please describe the problem after the tone.', speechLanguage, startMicrophone)
      return undefined
    }
    const timer = window.setTimeout(() => setCountdown(value => value === null ? null : value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [activeCall, countdown, speechLanguage, voiceEnabled])

  function handleLoginSuccess(data) {
    setUserLabel(`Demo Guardian - ${data.user.phone}`)
    setAuthError('')
    setAuthState('signed-in')
  }

  async function signOut() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      setNotice(`Sign-out request failed: ${error.message}`)
    } finally {
      stopMicrophone()
      window.speechSynthesis?.cancel()
      setAuthState('signed-out')
      setPage('Overview')
    }
  }

  function speak(text, language = speechLanguage, onEnd) {
    if (!voiceEnabled) {
      onEnd?.()
      return
    }
    speakText(text, window.speechSynthesis, value => new SpeechSynthesisUtterance(value), language, {
      onEnd,
      onError: () => {
        setCallStatus('ready')
        setNotice('Speech playback is unavailable. The reply remains visible on screen.')
        onEnd?.()
      }
    })
  }

  function stopMicrophone() {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    recognition?.stop()
    setCallStatus(status => status === 'recording' ? 'ready' : status)
  }

  function finishListening() {
    const transcript = problemRef.current.trim()
    stopMicrophone()
    if (transcript) void submitMessage(transcript)
  }

  function startMicrophone() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setCallStatus('unavailable')
      setNotice('Speech recognition is not supported here. Type your message instead.')
      return
    }
    problemRef.current = ''
    setMessage('')
    setReply('')
    setReplyError('')
    window.speechSynthesis?.cancel()
    const recognition = createSpeechRecognition(SpeechRecognition, speechLanguage, {
      onResult: event => {
        let transcript = problemRef.current
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const segment = event.results[index][0].transcript.trim()
          if (event.results[index].isFinal && segment) transcript = `${transcript} ${segment}`.trim()
        }
        problemRef.current = transcript.slice(0, 3000)
        setMessage(problemRef.current)
      },
      onError: () => {
        setCallStatus('unavailable')
        setNotice('Microphone could not capture speech. Check browser permission or type your message.')
      },
      onEnd: endedRecognition => {
        if (recognitionRef.current !== endedRecognition) return
        recognitionRef.current = null
        setCallStatus('ready')
        const transcript = problemRef.current.trim()
        if (transcript) void submitMessage(transcript)
      }
    })
    if (!recognition) {
      setCallStatus('unavailable')
      setNotice('Speech recognition is not supported here. Type your message instead.')
      return
    }
    recognitionRef.current = recognition
    setCallStatus('recording')
    setNotice('Microphone is active. Keyword detection can miss or misread emergencies.')
    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setCallStatus('unavailable')
      setNotice('Microphone could not start. Check browser permission or type your message.')
    }
  }

  function startCall(student) {
    stopMicrophone()
    window.speechSynthesis?.cancel()
    callSessionRef.current += 1
    problemRef.current = ''
    setMessage('')
    setReply('')
    setReplyError('')
    setEscalationReason('')
    setCallStatus('waiting')
    setCountdown(30)
    setActiveCall({ studentId: student.id, student: student.name, caller: student.guardian })
    setPage('AI Call Agent')
    setNotice('Simulated call started. No real phone call has been placed.')
  }

  function endCall() {
    callSessionRef.current += 1
    stopMicrophone()
    window.speechSynthesis?.cancel()
    problemRef.current = ''
    setActiveCall(null)
    setMessage('')
    setReply('')
    setCountdown(null)
    setCallStatus('')
    setNotice('Demo call ended.')
  }

  async function submitMessage(value = message) {
    const text = value.trim().slice(0, 3000)
    if (!text || busy) return
    stopMicrophone()
    setCountdown(null)
    setCallStatus('connecting')
    setBusy(true)
    setReply('')
    setReplyError('')
    try {
      const result = await apiRequest('/api/agent/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, studentId: activeCall?.studentId || 'STU-1001' })
      })
      setReply(result.reply || 'No response returned.')
      setCallStatus('ready')
      const isEmergency = result.priority === 'emergency' && result.escalate === true
      setEscalationReason(isEmergency ? result.escalationReason || 'server keyword rule' : '')
      if (isEmergency) {
        const item = {
          id: `${Date.now()}-simulated`,
          status: result.notificationStatus || 'simulated',
          reason: result.escalationReason || 'server keyword rule',
          at: new Date().toISOString()
        }
        setNotificationHistory(history => [item, ...history])
        setNotice('Possible emergency flagged by a demo keyword rule. This is not reliable emergency detection. Call 112 in immediate danger.')
      }
      if (voiceEnabled) {
        speak(result.reply || '', speechLanguage)
      }
      await loadCalls()
    } catch (error) {
      setReplyError(error.message)
      setCallStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function confirmGuardianCall() {
    const confirmed = window.confirm('This may attempt an outbound guardian call if live calling is enabled. It is not emergency services. Continue?')
    if (!confirmed) return
    setNotificationBusy(true)
    try {
      const result = await apiRequest('/api/emergency/call-counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'CALL GUARDIAN' })
      })
      const item = {
        id: `${Date.now()}-guardian`,
        status: result.notificationStatus || 'simulated',
        reason: 'User confirmed a guardian notification attempt',
        at: new Date().toISOString(),
        phone: result.guardianPhone || ''
      }
      setNotificationHistory(history => [item, ...history])
      setNotice(result.attempted
        ? 'Guardian call attempt queued. The provider has not confirmed that a person answered.'
        : 'Guardian notification was simulated. No real call was placed.')
      await loadCalls()
    } catch (error) {
      setNotificationHistory(history => [{
        id: `${Date.now()}-failed`,
        status: 'failed',
        reason: 'Guardian notification request failed',
        at: new Date().toISOString()
      }, ...history])
      setNotice(error.message)
    } finally {
      setNotificationBusy(false)
    }
  }

  function updateVoiceEnabled(enabled) {
    setVoiceEnabled(enabled)
    try {
      window.localStorage.setItem('cc-voice-enabled', String(enabled))
    } catch {
      setNotice('Voice setting changed for this session but could not be saved in this browser.')
    }
    if (!enabled) {
      stopMicrophone()
      window.speechSynthesis?.cancel()
    }
  }

  function updateSpeechLanguage(language) {
    setSpeechLanguage(language)
    try {
      window.localStorage.setItem('cc-speech-language', language)
    } catch {
      setNotice('Language changed for this session but could not be saved in this browser.')
    }
  }

  if (authState !== 'signed-in') {
    return <Login
      checking={authState === 'checking'}
      error={authError}
      onLoginSuccess={handleLoginSuccess}
    />
  }

  const emergencyCalls = calls.filter(call => String(call.priority).toLowerCase() === 'emergency')
  const recentCalls = calls.slice(0, 4)

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#overview" onClick={event => { event.preventDefault(); setPage('Overview') }}>
          <span className="brand-mark"><Headphones size={21} aria-hidden="true" /></span>
          <span>CareConnect <b>AI</b><small>GUARDIAN DESK</small></span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-list">
          {navItems.map(([label, Icon]) => (
            <button
              type="button"
              key={label}
              className={`nav-link ${page === label ? 'selected' : ''}`}
              aria-current={page === label ? 'page' : undefined}
              onClick={() => setPage(label)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {label === 'Emergency Alerts' && emergencyCalls.length > 0 && <span className="count">{emergencyCalls.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <span className="user-avatar" aria-hidden="true">CC</span>
            <span><b>Demo account</b><small>{userLabel}</small></span>
          </div>
          <button className="nav-link" type="button" onClick={() => void signOut()}>
            <LogOut size={18} aria-hidden="true" /><span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="overline dark">FICTIONAL DEMO WORKSPACE</span>
            <h1>{page}</h1>
          </div>
          <div className="top-right">
            <span className={`agent-pill ${agentOn ? 'on' : 'off'}`}>
              <i aria-hidden="true" />{agentOn ? 'Agent active' : 'Agent paused'}
            </span>
            <button className="icon-btn" type="button" aria-label="Open emergency alerts" onClick={() => setPage('Emergency Alerts')}>
              <Bell size={19} aria-hidden="true" />
              {emergencyCalls.length > 0 && <span className="notification-dot" aria-label={`${emergencyCalls.length} emergency alerts`} />}
            </button>
          </div>
        </header>

        <div className="safety-banner" role="alert">
          <strong>This is a prototype, not an emergency service.</strong>
          <span>Keyword detection can miss or misread danger. Call 112 in immediate danger.</span>
        </div>
        <p className="onboarding-note">Demo only: records are fictional, and in-memory call history resets when the server restarts or sleeps.</p>

        <HealthBanner health={health} loading={healthLoading} error={healthError} onRetry={() => void loadHealth()} />
        {notice && <div className="notice-bar" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {callsError && <div className="error-banner" role="alert">{callsError} <button type="button" onClick={() => void loadCalls()}>Retry call history</button></div>}

        {page === 'Overview' && (
          <Dashboard
            studentCount={students.length}
            calls={recentCalls}
            callCount={calls.length}
            alertCount={emergencyCalls.length}
            agentOn={agentOn}
            setAgentOn={setAgentOn}
            loading={callsLoading}
            error={callsError}
            onRetry={() => void loadCalls()}
            onStartCall={startCall}
            setPage={setPage}
          />
        )}
        {page === 'Students' && <StudentList records={students} onStartCall={startCall} />}
        {page === 'AI Call Agent' && (
          <CallPanel
            student={activeCall}
            students={students.slice(0, 5)}
            onStartCall={startCall}
            onEndCall={endCall}
            countdown={countdown}
            status={callStatus}
            message={message}
            setMessage={setMessage}
            reply={reply}
            replyError={replyError}
            busy={busy}
            onSubmit={() => void submitMessage()}
            onStartMicrophone={startMicrophone}
            onStopMicrophone={finishListening}
            voiceEnabled={voiceEnabled}
            escalationReason={escalationReason}
            onConfirmGuardianCall={() => void confirmGuardianCall()}
            notificationBusy={notificationBusy}
            notifications={notificationHistory}
            onSpeak={() => speak(reply)}
          />
        )}
        {page === 'Call History' && (
          <CallLog
            calls={calls}
            loading={callsLoading}
            error={callsError}
            onRetry={() => void loadCalls()}
          />
        )}
        {page === 'Emergency Alerts' && (
          <EmergencyAlerts calls={emergencyCalls} loading={callsLoading} error={callsError} onRetry={() => void loadCalls()} />
        )}
        {page === 'Settings' && (
          <Settings
            voiceEnabled={voiceEnabled}
            onVoiceChange={updateVoiceEnabled}
            speechLanguage={speechLanguage}
            onLanguageChange={updateSpeechLanguage}
            recording={callStatus === 'recording'}
            onStop={() => { stopMicrophone(); window.speechSynthesis?.cancel() }}
          />
        )}
      </main>
    </div>
  )
}

function Login({ checking, error, onLoginSuccess }) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const endpoint = otpSent ? '/api/auth/otp/verify' : '/api/auth/otp/request'
      const data = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpSent ? { phone, otp } : { phone })
      })
      if (otpSent) {
        onLoginSuccess(data)
      } else {
        setOtpSent(true)
        setMessage(data.message)
      }
    } catch (submitError) {
      setMessage(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span className="brand-mark"><Headphones size={22} aria-hidden="true" /></span><b>CareConnect AI</b></div>
        <span className="eyebrow">GUARDIAN SUPPORT DEMO</span>
        <h1 id="login-title">Sign in to the demo</h1>
        <p>Use a fictional 10-digit number. This prototype does not send SMS messages.</p>
        {checking && <p className="loading-state" role="status">Checking your session...</p>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label htmlFor="demo-phone">Demo phone number</label>
          <input
            id="demo-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            pattern="[0-9]{10}"
            value={phone}
            onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(0, 10)); setOtpSent(false); setOtp('') }}
            placeholder="10-digit fictional number"
            required
          />
          {otpSent && <>
            <label htmlFor="demo-otp">Demo one-time password</label>
            <input
              id="demo-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              required
            />
          </>}
          <button className="button primary full-width" type="submit" disabled={busy || checking}>
            <LogIn size={17} aria-hidden="true" />{checking ? 'Checking session...' : busy ? 'Please wait...' : otpSent ? 'Verify OTP and sign in' : 'Continue'}
          </button>
        </form>
        {message && <p className={message.includes('No SMS') ? 'inline-message' : 'error-banner'} role="status">{message}</p>}
        <div className="demo-box">
          <b>DEMO CREDENTIALS</b>
          <span>OTP: <strong>123456</strong> (verified by the server; no text is sent)</span>
          <small>Do not use your real phone number. Authentication is for demonstration only, not identity verification.</small>
        </div>
        <p className="disclaimer">Prototype only. Never enter real student or guardian information. If anyone is in immediate danger, call 112.</p>
      </section>
    </main>
  )
}

function HealthBanner({ health, loading, error, onRetry }) {
  if (loading) return <div className="service-banner" role="status">Checking AI and phone service configuration...</div>
  if (error) return <div className="error-banner" role="alert">Service status could not be loaded: {error} <button type="button" onClick={onRetry}>Retry</button></div>
  if (!health) return null
  const missing = []
  if (!health.geminiConfigured) missing.push('Gemini')
  if (!health.telephonyConfigured || !health.liveCallsEnabled) missing.push('live Twilio calling')
  return (
    <div className={`service-banner ${missing.length ? 'service-warning' : 'service-ready'}`} role="status">
      {missing.length
        ? `${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not active. Safe scripted replies and simulated notifications will be used.`
        : 'Gemini and telephony are configured. Live calling still requires explicit confirmation and provider eligibility.'}
    </div>
  )
}

function Dashboard({ studentCount, calls, callCount, alertCount, agentOn, setAgentOn, loading, error, onRetry, onStartCall, setPage }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow light">A CALM, FICTIONAL DEMO WORKSPACE</span>
          <h2>Listen carefully.<br />Escalate transparently.</h2>
          <p>Explore simulated guardian conversations, fictional student records and a review-only escalation workflow.</p>
          <button className="button hero-button" type="button" onClick={() => setPage('AI Call Agent')}>Open call agent <ChevronRight size={17} aria-hidden="true" /></button>
        </div>
        <div className="hero-art" aria-hidden="true"><span><Bot size={54} /></span><small>DEMO MODE</small></div>
      </section>
      <section className="metrics" aria-label="Demo overview">
        <Metric icon={Users} label="Fictional students" value={studentCount} />
        <Metric icon={Phone} label="Logged interactions" value={callCount} />
        <Metric icon={AlertTriangle} label="Possible alerts" value={alertCount} />
        <Metric icon={Activity} label="Agent status" value={agentOn ? 'Active' : 'Paused'} />
      </section>
      <div className="content-grid">
        <section className="panel">
          <PanelHeading title="Recent call activity" subtitle="Server-side in-memory demo log" action="Open call history" onAction={() => setPage('Call History')} />
          {loading ? <p className="loading-state" role="status">Loading call activity...</p>
            : error ? <ErrorState message={error} onRetry={onRetry} />
              : calls.length ? <CallTable calls={calls} />
                : <EmptyState title="No demo interactions yet" text="Simulate a conversation to see its outcome here." />}
        </section>
        <section className="panel">
          <PanelHeading title="Demo controls" subtitle="No real phone call is placed by this button." />
          <div className="setting-row">
            <span className="setting-icon"><Bot size={19} aria-hidden="true" /></span>
            <span><b>AI call agent</b><small>Accept simulated conversations</small></span>
            <button className={`toggle ${agentOn ? 'active' : ''}`} type="button" role="switch" aria-checked={agentOn} aria-label="Toggle the demo AI agent" onClick={() => setAgentOn(value => !value)}><span /></button>
          </div>
          <button className="button primary full-width" type="button" onClick={() => onStartCall(students[0])} disabled={!agentOn}>
            <PhoneForwarded size={17} aria-hidden="true" /> Simulate incoming call
          </button>
          <p className="microcopy">Keyword detection is only a demo aid, not reliable emergency detection.</p>
        </section>
      </div>
      <section className="panel">
        <PanelHeading title="Fictional student directory" subtitle="250 sample students across five demo guardians" action="Browse students" onAction={() => setPage('Students')} />
        <StudentTable records={students.slice(0, 5)} onStartCall={onStartCall} />
      </section>
    </>
  )
}

function StudentList({ records, onStartCall }) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('all')
  const [attendance, setAttendance] = useState('all')
  const [guardian, setGuardian] = useState('all')
  const filtered = useMemo(() => records.filter(student => {
    const matchesText = `${student.name} ${student.id} ${student.guardian} ${student.section}`.toLowerCase().includes(query.toLowerCase())
    return matchesText
      && (section === 'all' || student.section === section)
      && (attendance === 'all' || student.attendance === attendance)
      && (guardian === 'all' || student.guardian === guardian)
  }), [records, query, section, attendance, guardian])

  return (
    <section className="panel">
      <PanelHeading title="Fictional student directory" subtitle={`${filtered.length} of ${records.length} fictional records`} />
      <div className="guardian-summary">
        {guardianGroups.map(group => (
          <button key={group.guardian} className={`guardian-card ${guardian === group.guardian ? 'chosen' : ''}`} type="button" onClick={() => setGuardian(value => value === group.guardian ? 'all' : group.guardian)}>
            <b>{group.guardian}</b><span>{records.filter(student => student.guardian === group.guardian).length} fictional students</span>
          </button>
        ))}
      </div>
      <div className="filters">
        <label className="search-field" htmlFor="student-search"><Search size={18} aria-hidden="true" /><input id="student-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search student, ID, section or guardian" /></label>
        <label>Section<select value={section} onChange={event => setSection(event.target.value)}><option value="all">All sections</option>{sections.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Attendance<select value={attendance} onChange={event => setAttendance(event.target.value)}><option value="all">All attendance</option>{attendanceOptions.filter((value, index, all) => all.indexOf(value) === index).map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Guardian<select value={guardian} onChange={event => setGuardian(event.target.value)}><option value="all">All guardians</option>{guardianGroups.map(group => <option key={group.guardian}>{group.guardian}</option>)}</select></label>
      </div>
      {filtered.length ? <StudentTable records={filtered} onStartCall={onStartCall} /> : <EmptyState title="No matching fictional students" text="Change or clear one of the filters to see records." />}
    </section>
  )
}

function StudentTable({ records, onStartCall }) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Fictional student records and demo call actions</caption>
        <thead><tr><th scope="col">Student</th><th scope="col">Section</th><th scope="col">Attendance</th><th scope="col">Demo guardian</th><th scope="col">Action</th></tr></thead>
        <tbody>{records.map(student => (
          <tr key={student.id}>
            <td><b>{student.name}</b><small>{student.id}</small></td>
            <td>{student.section}</td>
            <td><span className={`attendance ${student.attendance.toLowerCase().replace(' ', '-')}`}>{student.attendance}</span></td>
            <td>{student.guardian}</td>
            <td><button className="table-button" type="button" onClick={() => onStartCall(student)} aria-label={`Simulate a call for ${student.name}`}><Phone size={15} aria-hidden="true" /><span>Simulate</span></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function CallPanel({
  student, students: suggestedStudents, onStartCall, onEndCall, countdown, status,
  message, setMessage, reply, replyError, busy, onSubmit, onStartMicrophone,
  onStopMicrophone, voiceEnabled, escalationReason, onConfirmGuardianCall,
  notificationBusy, notifications, onSpeak
}) {
  return (
    <div className="call-grid">
      <section className="panel call-console">
        <PanelHeading title="AI call console" subtitle="Simulated conversation; no real call is placed here." />
        {!student ? <>
          <EmptyState title="No active demo call" text="Choose a fictional student to start a simulated conversation." />
          <StudentTable records={suggestedStudents} onStartCall={onStartCall} />
        </> : <>
          <div className="caller">
            <span className="caller-avatar"><UserRound size={24} aria-hidden="true" /></span>
            <div><span className="eyebrow">FICTIONAL DEMO GUARDIAN</span><h2>{student.caller}</h2><p>Student: {student.student} ({student.studentId})</p></div>
            <span className="simulated-badge">SIMULATED</span>
          </div>
          {countdown !== null && <p className="call-timer" role="status">Demo connects in <b>{countdown}</b> seconds</p>}
          {status === 'recording' && <div className="recording-status" role="status"><span className="recording-dot" /> Microphone active <button className="button secondary" type="button" onClick={onStopMicrophone}><MicOff size={16} aria-hidden="true" /> Finish and respond</button></div>}
          {status === 'connecting' && <p className="loading-state" role="status">Processing the demo message...</p>}
          {status === 'unavailable' && <p className="inline-message">Speech recognition is unavailable. You can type instead.</p>}
          <form className="question-form" onSubmit={event => { event.preventDefault(); onSubmit() }}>
            <label htmlFor="call-message">Describe the problem <small>Speak after starting the microphone; the agent replies aloud automatically. Up to 3,000 characters; content is not retained in server call logs.</small></label>
            <textarea id="call-message" value={message} onChange={event => setMessage(event.target.value.slice(0, 3000))} onKeyDown={event => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                onSubmit()
              }
            }} maxLength={3000} placeholder="Type a short message, or use the microphone..." rows={4} disabled={busy} />
            <div className="call-actions">
              {voiceEnabled && status !== 'recording' && <button className="button primary" type="button" onClick={onStartMicrophone} disabled={busy}><Mic size={16} aria-hidden="true" /> Listen and respond aloud</button>}
              <button className="button danger-outline" type="button" onClick={onEndCall}>End demo call</button>
            </div>
            <small className="inline-message">To submit typed text, press Ctrl+Enter (or Cmd+Enter on Mac). Turn voice on in Settings for spoken replies.</small>
            {replyError && <div className="error-banner" role="alert">{replyError}</div>}
          </form>
          {reply && <section className="ai-response" aria-live="polite">
            <h3><Bot size={18} aria-hidden="true" /> AI reply caption</h3>
            <p>{reply}</p>
            {voiceEnabled && <button className="text-button" type="button" onClick={onSpeak}>Play reply again</button>}
            {escalationReason && <>
              <div className="escalation-note"><b>Why this was flagged:</b> {escalationReason}. Keyword detection is not reliable and is not an emergency service.</div>
              <p className="notification-state">Guardian notification: simulated. Nobody has been contacted.</p>
              <button className="button danger-outline" type="button" onClick={onConfirmGuardianCall} disabled={notificationBusy}>
                {notificationBusy ? 'Recording notification...' : 'Confirm guardian call attempt'}
              </button>
              <p className="microcopy">An explicit confirmation is required. If live calling is disabled, the server records a simulation only.</p>
            </>}
          </section>}
        </>}
      </section>
      <aside className="panel workflow">
        <PanelHeading title="What happens in this demo" subtitle="Clear actions, no hidden hand-off" />
        <ol className="workflow-list">
          <li><b>Simulated call</b><small>Choose fictional data; no real call is made.</small></li>
          <li><b>Visible reply</b><small>AI text is shown as captions before optional speech.</small></li>
          <li><b>Rule-based alert</b><small>Server keywords can be wrong. A human must review.</small></li>
        </ol>
        <section className="notification-history">
          <h3>Guardian notification history</h3>
          {notifications.length ? notifications.map(item => <div className="notification-row" key={item.id}><span>{new Date(item.at).toLocaleString()}</span><b className={`status-tag ${item.status}`}>{item.status}</b><small>{item.reason}{item.phone ? ` · ${item.phone}` : ''}</small></div>)
            : <EmptyState title="No notifications yet" text="Confirmed, simulated or failed attempts will appear here." />}
        </section>
        <div className="emergency-help"><b>If anyone is in immediate danger, call 112.</b><p>This prototype cannot provide emergency response. Do not wait for keyword detection.</p></div>
      </aside>
    </div>
  )
}

function CallLog({ calls, loading, error, onRetry }) {
  const [priority, setPriority] = useState('all')
  const [outcome, setOutcome] = useState('all')
  const filtered = calls.filter(call => (priority === 'all' || String(call.priority).toLowerCase() === priority)
    && (outcome === 'all' || String(call.status).toLowerCase() === outcome))

  function exportCsv() {
    const headers = ['Time', 'Student ID', 'Student', 'Caller', 'Type', 'Summary', 'Priority', 'Outcome', 'Guardian notification', 'Simulated']
    const rows = filtered.map(call => [
      call.at || '',
      call.studentId || '',
      call.student || '',
      call.caller || '',
      call.type || '',
      call.summary || '',
      call.priority || '',
      call.status || '',
      call.notificationStatus || '',
      call.simulated !== false ? 'yes' : 'no'
    ])
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'careconnect-fictional-call-log.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel">
      <PanelHeading title="Call history" subtitle="In-memory demo records. Message transcripts and phone numbers are not stored." />
      <div className="filters log-filters">
        <label>Priority<select value={priority} onChange={event => setPriority(event.target.value)}><option value="all">All priorities</option><option value="emergency">Emergency</option><option value="normal">Normal</option></select></label>
        <label>Outcome<select value={outcome} onChange={event => setOutcome(event.target.value)}><option value="all">All outcomes</option>{[...new Set(calls.map(call => String(call.status || 'unknown').toLowerCase()))].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <button className="button secondary" type="button" onClick={exportCsv} disabled={!filtered.length}><Download size={16} aria-hidden="true" /> Export CSV</button>
      </div>
      {loading ? <p className="loading-state" role="status">Loading call history...</p>
        : error ? <ErrorState message={error} onRetry={onRetry} />
          : filtered.length ? <CallTable calls={filtered} />
            : <EmptyState title="No calls match these filters" text="Try another priority or outcome, or simulate a demo conversation." />}
      <p className="microcopy">CSV includes fictional demo metadata only; do not add real people or contact details.</p>
    </section>
  )
}

function CallTable({ calls }) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Fictional demo call activity</caption>
        <thead><tr><th scope="col">Time</th><th scope="col">Student / caller</th><th scope="col">Summary</th><th scope="col">Priority</th><th scope="col">Outcome</th><th scope="col">Guardian notice</th><th scope="col">Mode</th></tr></thead>
        <tbody>{calls.map((call, index) => (
          <tr key={call.at || call.id || index}>
            <td>{call.at ? new Date(call.at).toLocaleString() : 'Time unavailable'}</td>
            <td><b>{call.student || 'No linked student'}</b><small>{call.studentId || call.caller || 'Demo caller'}</small></td>
            <td className="summary-cell">{call.summary || 'Demo interaction recorded.'}</td>
            <td><span className={`priority ${String(call.priority).toLowerCase()}`}>{call.priority || 'Normal'}</span>{call.escalationReason && <small className="reason-note">Why: {call.escalationReason}</small>}</td>
            <td>{call.status || 'Recorded'}</td>
            <td>{call.notificationStatus ? <span className={`status-tag ${call.notificationStatus}`}>{call.notificationStatus}</span> : 'Not applicable'}</td>
            <td><span className="simulated-badge">{call.simulated === false ? 'PROVIDER' : 'SIMULATED'}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function EmergencyAlerts({ calls, loading, error, onRetry }) {
  return (
    <section className="panel">
      <PanelHeading title="Possible emergency alerts" subtitle="Rule-based keyword flags only; these may be missed or incorrect." />
      <div className="emergency-help"><b>This is not emergency monitoring.</b><p>Call 112 in immediate danger. Never wait for the application or infer that a guardian was reached.</p></div>
      {loading ? <p className="loading-state" role="status">Loading alert history...</p>
        : error ? <ErrorState message={error} onRetry={onRetry} />
          : calls.length ? <CallTable calls={calls} />
            : <EmptyState title="No possible emergency flags" text="This does not prove that there is no emergency." />}
    </section>
  )
}

function Settings({ voiceEnabled, onVoiceChange, speechLanguage, onLanguageChange, recording, onStop }) {
  return (
    <section className="panel settings-panel">
      <PanelHeading title="Voice and privacy settings" subtitle="Browser speech APIs require permission and may not be available in every browser." />
      <div className="setting-row">
        <span className="setting-icon"><Mic size={19} aria-hidden="true" /></span>
        <span><b>Voice features</b><small>Speech playback and optional browser microphone recognition</small></span>
        <button className={`toggle ${voiceEnabled ? 'active' : ''}`} type="button" role="switch" aria-checked={voiceEnabled} aria-label="Toggle voice features" onClick={() => onVoiceChange(!voiceEnabled)}><span /></button>
      </div>
      <label className="language-control">Speech language<select value={speechLanguage} onChange={event => onLanguageChange(event.target.value)}><option value="en-IN">English (India)</option><option value="te-IN">Telugu (India)</option><option value="hi-IN">Hindi (India)</option></select></label>
      <div className={`mic-indicator ${recording ? 'is-recording' : ''}`} role="status">
        {recording ? <><span className="recording-dot" /> Microphone is active <button className="button secondary" type="button" onClick={onStop}><MicOff size={16} aria-hidden="true" /> Stop</button></>
          : <><MicOff size={16} aria-hidden="true" /> Microphone is off</>}
      </div>
      <div className="privacy-note"><ShieldCheck size={18} aria-hidden="true" /><p>Microphone recognition is handled by browser speech APIs and can have provider privacy implications. Avoid real personal or student information.</p></div>
      <div className="emergency-help"><b>Demo storage limit</b><p>Call records are in memory and reset when the Render free service sleeps or restarts. No durable storage is configured.</p></div>
    </section>
  )
}

function Metric({ icon: Icon, label, value }) {
  return <div className="metric"><span className="metric-icon"><Icon size={20} aria-hidden="true" /></span><span><small>{label}</small><b>{value}</b></span></div>
}

function PanelHeading({ title, subtitle, action, onAction }) {
  return (
    <header className="panel-head">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {action && <button className="text-button" type="button" onClick={onAction}>{action}<ChevronRight size={15} aria-hidden="true" /></button>}
    </header>
  )
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><CheckCircle2 size={27} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>
}

function ErrorState({ message, onRetry }) {
  return <div className="error-banner" role="alert">{message}<button type="button" onClick={onRetry}>Retry</button></div>
}
