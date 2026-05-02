// App entry — composes frame, screen, detail, tweaks

const { useEffect: useEff, useState: useSt } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "safe",
  "list_style": "flat",
  "show_stats": true,
  "density": "balanced"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = useSt(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useSt(false);
  const [open, setOpen] = useSt(null); // selected appointment

  useEff(() => {
    // persist selection
    try {
      const saved = JSON.parse(localStorage.getItem('rasul_tweaks') || 'null');
      if (saved) setTweaks(t => ({ ...t, ...saved }));
      const savedOpenId = localStorage.getItem('rasul_open');
      if (savedOpenId) {
        const a = window.APPOINTMENTS.find(x => x.id === savedOpenId);
        if (a) setOpen(a);
      }
    } catch(e) {}

    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setEditMode(true);
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const change = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    try { localStorage.setItem('rasul_tweaks', JSON.stringify(next)); } catch(e) {}
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*'); } catch(e) {}
  };

  const openAppt = (a) => {
    setOpen(a);
    try { localStorage.setItem('rasul_open', a.id); } catch(e) {}
  };
  const closeAppt = () => {
    setOpen(null);
    try { localStorage.removeItem('rasul_open'); } catch(e) {}
  };

  // Canvas composition
  return (
    <div style={{
      minHeight: '100vh', padding: '40px 20px',
      background: 'radial-gradient(1200px 700px at 50% -10%, #FFFFFF 0%, #EDEEF1 60%, #E6E8EC 100%)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      gap: 40, flexWrap: 'wrap',
    }}>
      {/* Left: phone with list */}
      <ScreenFrame label="01 · Today's appointments">
        <AppointmentsScreen tweaks={tweaks} onOpen={openAppt}/>
      </ScreenFrame>

      {/* Right: phone with detail overlay open */}
      <ScreenFrame label="02 · Appointment detail">
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <AppointmentsScreen tweaks={tweaks} onOpen={openAppt}/>
          <DetailSheet a={open || window.APPOINTMENTS[0]} onClose={closeAppt}/>
        </div>
      </ScreenFrame>

      {editMode && <TweaksPanel tweaks={tweaks} onChange={change} onClose={() => setEditMode(false)}/>}
    </div>
  );
}

function ScreenFrame({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }} data-screen-label={label}>
      <div style={{
        fontSize: 11, color: '#7A8296', fontWeight: 600,
        letterSpacing: 0.8, textTransform: 'uppercase',
        fontFamily: 'JetBrains Mono, monospace',
      }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <IOSDevice width={390} height={844}>
          {children}
        </IOSDevice>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
