import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { startSession, stopSession, getSummaries, deleteSummary } from './api';

export default function App() {
  const [view, setView] = useState('home');
  const [meetUrl, setMeetUrl] = useState('');
  const [meetTitle, setMeetTitle] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!meetUrl) return setError('Please enter a Meet URL');
    setLoading(true); setError('');
    try {
      const { data } = await startSession(meetUrl, meetTitle || 'My Meeting');
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setView('active');
      } else {
        setError(data.error || 'Failed to start');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start');
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const { data } = await stopSession(sessionId);
      setSelected(data);
      setView('detail');
    } catch {
      setError('Failed to stop and summarize');
    }
    setLoading(false);
  };

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const { data } = await getSummaries();
      setSummaries(data);
    } catch {}
    setLoading(false);
  };

  const s = {
    header: { borderBottom: '1px solid #1f2937', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
    logoIcon: { width: 32, height: 32, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
    nav: { display: 'flex', gap: 24, fontSize: 14, color: '#9ca3af' },
    navBtn: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 },
    main: { maxWidth: 640, margin: '0 auto', padding: '48px 24px' },
    input: { width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    label: { fontSize: 13, color: '#9ca3af', display: 'block', marginBottom: 6 },
    btn: { width: '100%', background: '#2563eb', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
    btnRed: { width: '100%', background: '#dc2626', border: 'none', borderRadius: 8, padding: '12px', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
    error: { background: '#450a0a', border: '1px solid #991b1b', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 16 },
  };

  return (
    <div>
      <header style={s.header}>
        <div style={s.logo} onClick={() => { setView('home'); setError(''); }}>
          <div style={s.logoIcon}>🎙</div>
          <span style={{ fontWeight: 600 }}>MeetScribe</span>
        </div>
        <nav style={s.nav}>
          <button style={{...s.navBtn, color: view==='home'?'white':'#9ca3af'}} onClick={() => { setView('home'); setError(''); }}>New Session</button>
          <button style={{...s.navBtn, color: view==='summaries'?'white':'#9ca3af'}} onClick={() => { setView('summaries'); loadSummaries(); }}>Summaries</button>
        </nav>
      </header>

      <main style={s.main}>

        {view === 'home' && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>AI Meeting Scribe</h1>
            <p style={{ color: '#9ca3af', marginBottom: 32 }}>Deploy a bot to your Google Meet and get an instant AI summary.</p>
            {error && <div style={s.error}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={s.label}>Meeting title</label>
                <input style={s.input} placeholder="title" value={meetTitle} onChange={e => setMeetTitle(e.target.value)}/>
              </div>
              <div>
                <label style={s.label}>Google Meet URL *</label>
                <input style={s.input} placeholder="https://meet.google.com/abc-defg-hij" value={meetUrl} onChange={e => setMeetUrl(e.target.value)}/>
              </div>
              <button style={s.btn} onClick={handleStart} disabled={loading}>
                {loading ? 'Joining...' : '+ Deploy Bot'}
              </button>
            </div>
          </div>
        )}

        {view === 'active' && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>🎙</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{meetTitle || 'My Meeting'}</h2>
            <p style={{ color: '#9ca3af', marginBottom: 8 }}>Bot is listening to the meeting...</p>
            <p style={{ color: '#4b5563', fontSize: 13, marginBottom: 40 }}>When the meeting is over, click the button below to generate a summary.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }}/>
              <span style={{ color: '#4ade80', fontSize: 14 }}>Bot Active</span>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button style={s.btnRed} onClick={handleStop} disabled={loading}>
              {loading ? 'Generating Summary...' : 'Stop & Summarize'}
            </button>
          </div>
        )}

        {view === 'summaries' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Past Summaries</h2>
            {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading...</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {summaries.map(item => (
                <div key={item.sessionId} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelected(item); setView('detail'); }}>
                    <p style={{ fontWeight: 500 }}>{item.title}</p>
                    <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: '#4b5563', cursor: 'pointer' }} onClick={() => { setSelected(item); setView('detail'); }}>→</span>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm('Delete this summary?')) return;
                      await deleteSummary(item.sessionId);
                      setSummaries(prev => prev.filter(s => s.sessionId !== item.sessionId));
                    }} style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: 6, padding: '4px 10px', color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!loading && !summaries.length && <p style={{ color: '#4b5563', textAlign: 'center', padding: '48px 0' }}>No summaries yet</p>}
            </div>
          </div>
        )}

        {view === 'detail' && selected && (
          <div>
            <button onClick={() => setView('summaries')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, marginBottom: 24 }}>← Back</button>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{selected.title}</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 32 }}>{selected.startTime && new Date(selected.startTime).toLocaleString()}</p>
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 24, lineHeight: 1.7, fontSize: 14 }}>
              <ReactMarkdown>{selected.summary}</ReactMarkdown>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}