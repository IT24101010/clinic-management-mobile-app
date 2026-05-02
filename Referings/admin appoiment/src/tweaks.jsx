// Tweaks panel + edit-mode wiring

const TWEAK_META = {
  variant: {
    label: 'Variant', kind: 'segment',
    options: [
      { id: 'safe', label: 'Safe' },
      { id: 'bold', label: 'Bolder' },
    ],
  },
  list_style: {
    label: 'List style', kind: 'segment',
    options: [
      { id: 'flat', label: 'Flat' },
      { id: 'grouped', label: 'Grouped' },
      { id: 'timeline', label: 'Timeline' },
    ],
  },
  show_stats: {
    label: 'KPI strip', kind: 'toggle',
  },
  density: {
    label: 'Density', kind: 'segment',
    options: [
      { id: 'spacious', label: 'Spacious' },
      { id: 'balanced', label: 'Balanced' },
      { id: 'dense', label: 'Dense' },
    ],
  },
};

function TweaksPanel({ tweaks, onChange, onClose }) {
  return (
    <div style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 2000,
      width: 280, background: '#fff', borderRadius: 16,
      border: '1px solid #E3E6EC', padding: 14,
      boxShadow: '0 20px 40px rgba(16,24,40,0.18)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0E1422', letterSpacing: -0.2, flex: 1 }}>Tweaks</div>
        <button onClick={onClose} style={{
          width: 24, height: 24, borderRadius: 6, border: 0, cursor: 'pointer',
          background: '#F4F5F7', color: '#7A8296', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(TWEAK_META).map(([key, meta]) => (
          <div key={key}>
            <div style={{ fontSize: 10.5, color: '#7A8296', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5 }}>{meta.label}</div>
            {meta.kind === 'segment' && (
              <div style={{ display: 'flex', background: '#F4F5F7', borderRadius: 9, padding: 2 }}>
                {meta.options.map(o => (
                  <button key={o.id} onClick={() => onChange(key, o.id)} style={{
                    flex: 1, padding: '6px 4px', borderRadius: 7, border: 0, cursor: 'pointer',
                    background: tweaks[key] === o.id ? '#fff' : 'transparent',
                    color: tweaks[key] === o.id ? '#0E1422' : '#7A8296',
                    fontWeight: 600, fontSize: 11.5, fontFamily: 'inherit',
                    boxShadow: tweaks[key] === o.id ? '0 1px 2px rgba(16,24,40,0.08)' : 'none',
                  }}>{o.label}</button>
                ))}
              </div>
            )}
            {meta.kind === 'toggle' && (
              <div onClick={() => onChange(key, !tweaks[key])} style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
              }}>
                <div style={{
                  width: 36, height: 20, borderRadius: 20,
                  background: tweaks[key] ? '#0B5FFF' : '#D6DAE3',
                  position: 'relative', transition: 'background 140ms',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: tweaks[key] ? 18 : 2,
                    width: 16, height: 16, borderRadius: 16, background: '#fff',
                    transition: 'left 140ms', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}/>
                </div>
                <div style={{ marginLeft: 8, fontSize: 12, color: '#3A4254', fontWeight: 500 }}>
                  {tweaks[key] ? 'Shown' : 'Hidden'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
