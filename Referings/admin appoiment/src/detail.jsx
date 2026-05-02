// Appointment detail overlay sheet

function DetailSheet({ a, onClose }) {
  if (!a) return null;
  const m = window.STATUS_META[a.status];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(14,20,34,0.42)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn 180ms ease',
    }} onClick={onClose}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '92%', overflow: 'auto',
        background: 'var(--bg)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '10px 16px 28px',
        animation: 'slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--line-2)' }}/>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px 14px' }}>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--card)', border: '1px solid var(--line-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-2)', cursor: 'pointer',
          }}>
            <window.Icon.arrowLeft/>
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>Appointment details</div>
          <button style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--card)', border: '1px solid var(--line-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-2)', cursor: 'pointer',
          }}>
            <window.Icon.more/>
          </button>
        </div>

        {/* Patient card */}
        <div style={{
          background: 'var(--card)', borderRadius: 18,
          border: '1px solid var(--line)',
          padding: 16,
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 54, height: 54, borderRadius: 27,
              background: window.TONES[a.tone] || '#EEF0F4',
              color: '#2A2F3C', fontWeight: 600, fontSize: 19,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: 0.4, flexShrink: 0,
            }}>{a.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.3 }}>{a.patient}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {a.sex} · {a.age} yrs · PT-{a.id.toUpperCase()}
              </div>
            </div>
            <button style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <window.Icon.phone/>
            </button>
            <button style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <window.Icon.msg/>
            </button>
          </div>

          {/* Reason */}
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--bg)' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Reason for visit</div>
            <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginTop: 3 }}>{a.reason}</div>
            {a.note && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.5 }}>{a.note}</div>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <MetaTile label="When" value={`${a.time} – ${a.end}`} sub="Mon, 20 Apr 2026" icon="clock"/>
          <MetaTile label="Status" custom={<div style={{ marginTop: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999, background: m.bg, color: m.fg,
              fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: m.dot }}/>
              {m.label}
            </span>
          </div>}/>
          <MetaTile label="Doctor" value={a.doctor} sub={a.specialty} icon="user"/>
          <MetaTile label="Room" value={a.room} sub="Floor 2 · Wing B" icon="pin"/>
        </div>

        {/* Billing */}
        <div style={{
          marginTop: 10, background: 'var(--card)', borderRadius: 16,
          border: '1px solid var(--line)', padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Consult fee</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFeatureSettings: '"tnum"', letterSpacing: -0.4, marginTop: 2 }}>{a.amount}</div>
          </div>
          <div style={{
            padding: '5px 10px', borderRadius: 999,
            background: 'var(--success-soft)', color: '#0A6B55',
            fontSize: 11.5, fontWeight: 600,
          }}>Paid · Cash</div>
        </div>

        {/* Timeline strip */}
        <div style={{ marginTop: 10, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line)', padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Activity</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Activity dot="var(--success)" label="Checked in at reception" time="08:24" actor="Blessing O." active={a.status === 'checked-in'}/>
            <Activity dot="var(--accent)" label="Reminder SMS delivered" time="Yesterday, 18:00"/>
            <Activity dot="var(--muted-2)" label="Appointment booked" time="16 Apr, 10:12" actor="Self-booked"/>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button style={{
            flex: 1, padding: '13px 14px', borderRadius: 14,
            background: 'var(--card)', border: '1px solid var(--line-2)',
            color: 'var(--ink)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <window.Icon.calendar/> Reschedule
          </button>
          <button style={{
            flex: 1, padding: '13px 14px', borderRadius: 14,
            background: '#fff', border: '1px solid var(--danger-soft)',
            color: 'var(--danger)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <window.Icon.x/> Cancel
          </button>
        </div>
        <button style={{
          marginTop: 8, width: '100%', padding: '14px', borderRadius: 14,
          background: a.status === 'checked-in' ? 'var(--success)' : 'var(--accent)',
          border: 0, color: '#fff', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: a.status === 'checked-in' ? '0 6px 18px rgba(15,157,122,0.25)' : '0 6px 18px rgba(11,95,255,0.28)',
        }}>
          <window.Icon.check/>
          {a.status === 'checked-in' ? 'Mark as seen' : 'Check in patient'}
        </button>
      </div>
    </div>
  );
}

function MetaTile({ label, value, sub, icon, custom }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 14, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && React.createElement(window.Icon[icon], { style: { color: 'var(--muted-2)', width: 13, height: 13 } })}
        <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
      </div>
      {custom ? custom : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 4, letterSpacing: -0.2 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function Activity({ dot, label, time, actor, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 8, height: 8, borderRadius: 8, background: dot,
        marginTop: 5, flexShrink: 0,
        boxShadow: active ? `0 0 0 4px ${dot === 'var(--success)' ? 'var(--success-soft)' : 'var(--accent-soft)'}` : 'none',
      }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
          {time}{actor ? ` · ${actor}` : ''}
        </div>
      </div>
    </div>
  );
}

window.DetailSheet = DetailSheet;
