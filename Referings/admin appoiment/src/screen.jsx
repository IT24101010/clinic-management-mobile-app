// Main Appointments screen — safe + bolder variants

const { useMemo, useState } = React;

function Avatar({ initials, tone, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size/2,
      background: window.TONES[tone] || '#EEF0F4',
      color: '#2A2F3C', fontWeight: 600, fontSize: size*0.38,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, letterSpacing: 0.2,
    }}>{initials}</div>
  );
}

function StatusChip({ status, small = false }) {
  const m = window.STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 7px' : '4px 9px',
      borderRadius: 999, background: m.bg, color: m.fg,
      fontSize: small ? 10.5 : 11.5, fontWeight: 600, letterSpacing: 0.1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 5, background: m.dot }} />
      {m.label}
    </span>
  );
}

function KPI({ label, value, delta, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--card)', borderRadius: 14,
      padding: '10px 11px',
      border: '1px solid var(--line)',
    }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.4, fontFeatureSettings: '"tnum"' }}>{value}</div>
        {delta && <div style={{ fontSize: 10.5, color: accent || 'var(--muted)', fontWeight: 600 }}>{delta}</div>}
      </div>
    </div>
  );
}

function FilterPill({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 999,
      background: active ? 'var(--ink)' : 'var(--card)',
      color: active ? '#fff' : 'var(--ink-2)',
      border: active ? '1px solid var(--ink)' : '1px solid var(--line-2)',
      fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 120ms ease',
    }}>
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '1px 6px',
          borderRadius: 999,
          background: active ? 'rgba(255,255,255,0.16)' : 'var(--canvas)',
          color: active ? '#fff' : 'var(--muted)',
          fontFeatureSettings: '"tnum"',
        }}>{count}</span>
      )}
    </button>
  );
}

// ─────────── Safe card ───────────
function AppointmentCardSafe({ a, density, onOpen }) {
  const pad = density === 'dense' ? 12 : density === 'spacious' ? 16 : 14;
  return (
    <button onClick={onOpen} style={{
      textAlign: 'left', width: '100%',
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 18, padding: pad, cursor: 'pointer',
      fontFamily: 'inherit', color: 'inherit',
      display: 'block',
      boxShadow: '0 1px 0 rgba(16,24,40,0.02)',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar initials={a.avatar} tone={a.tone} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontFeatureSettings: '"tnum"', letterSpacing: -0.2, flexShrink: 0 }}>{a.time}</div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {a.reason}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line-2)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)' }}>
          <window.Icon.pin style={{ color: 'var(--muted-2)' }}/>
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{a.room}</span>
        </div>
        <div style={{ width: 3, height: 3, borderRadius: 3, background: 'var(--muted-2)' }}/>
        <div style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {a.doctor.replace('Dr. ', 'Dr ')}
        </div>
        <div style={{ flex: 1 }}/>
        <StatusChip status={a.status} small />
      </div>
    </button>
  );
}

// ─────────── Bolder card — left time rail + mono numerals ───────────
function AppointmentCardBold({ a, density, onOpen }) {
  const pad = density === 'dense' ? 11 : density === 'spacious' ? 15 : 13;
  const m = window.STATUS_META[a.status];
  return (
    <button onClick={onOpen} style={{
      textAlign: 'left', width: '100%',
      background: 'var(--card)', border: '1px solid var(--line)',
      borderRadius: 16, padding: 0, cursor: 'pointer',
      fontFamily: 'inherit', color: 'inherit',
      display: 'flex', overflow: 'hidden',
    }}>
      {/* time rail */}
      <div style={{
        width: 66, flexShrink: 0,
        padding: `${pad}px 8px ${pad}px 12px`,
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'relative',
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.3 }}>{a.time}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0 }}>{a.end}</div>
        <div style={{ marginTop: 6, width: 5, height: 5, borderRadius: 5, background: m.dot }}/>
      </div>
      <div style={{ flex: 1, padding: `${pad}px ${pad+1}px`, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar initials={a.avatar} tone={a.tone} size={34}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.reason}
            </div>
          </div>
          <StatusChip status={a.status} small />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11.5, color: 'var(--muted)' }}>
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{a.doctor.replace('Dr. ', 'Dr ')}</span>
          <div style={{ width: 3, height: 3, borderRadius: 3, background: 'var(--muted-2)' }}/>
          <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{a.room}</span>
        </div>
      </div>
    </button>
  );
}

function AppointmentCard(props) {
  return props.variant === 'bold'
    ? <AppointmentCardBold {...props}/>
    : <AppointmentCardSafe {...props}/>;
}

// ─────────── Grouped list helper ───────────
function groupAppointments(list, style) {
  if (style === 'grouped') {
    const g = { Morning: [], Afternoon: [], Evening: [] };
    list.forEach(a => {
      const h = parseInt(a.time.split(':')[0], 10);
      if (h < 12) g.Morning.push(a);
      else if (h < 17) g.Afternoon.push(a);
      else g.Evening.push(a);
    });
    return Object.entries(g).filter(([_, v]) => v.length);
  }
  return [['', list]];
}

// ─────────── Screen ───────────
function AppointmentsScreen({ tweaks, onOpen }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const variant = tweaks.variant;
  const showStats = tweaks.show_stats;
  const density = tweaks.density;
  const listStyle = tweaks.list_style;

  const filters = [
    { id: 'all', label: 'All', count: window.APPOINTMENTS.length },
    { id: 'confirmed', label: 'Confirmed', count: window.APPOINTMENTS.filter(a=>a.status==='confirmed').length },
    { id: 'checked-in', label: 'Checked-in', count: window.APPOINTMENTS.filter(a=>a.status==='checked-in').length },
    { id: 'pending', label: 'Pending', count: window.APPOINTMENTS.filter(a=>a.status==='pending').length },
    { id: 'no-show', label: 'No-show', count: window.APPOINTMENTS.filter(a=>a.status==='no-show').length },
  ];

  const list = useMemo(() => {
    let l = window.APPOINTMENTS;
    if (filter !== 'all') l = l.filter(a => a.status === filter);
    if (query) {
      const q = query.toLowerCase();
      l = l.filter(a => a.patient.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q) || a.reason.toLowerCase().includes(q));
    }
    return l;
  }, [filter, query]);

  const grouped = groupAppointments(list, listStyle);

  const gap = density === 'dense' ? 6 : density === 'spacious' ? 12 : 8;
  const sectionPad = density === 'dense' ? 10 : density === 'spacious' ? 16 : 12;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 88 }}>
      {/* ── Top bar ── */}
      <div style={{ padding: '56px 18px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: -0.3, fontSize: 14 }}>R</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Clinic Manager</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.2 }}>Rasul · Victoria Island</div>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--card)', border: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)', cursor: 'pointer', position: 'relative',
        }}>
          <window.Icon.bell/>
          <div style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 7, background: 'var(--accent)', border: '1.5px solid var(--card)' }}/>
        </button>
      </div>

      {/* ── Title row ── */}
      <div style={{ padding: '8px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.6, lineHeight: 1.15 }}>Appointments</div>
            <button style={{
              marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px 4px 8px', borderRadius: 999,
              background: 'var(--card)', border: '1px solid var(--line-2)',
              fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              <window.Icon.calendar style={{ color: 'var(--muted)' }}/>
              Mon, 20 Apr
              <window.Icon.chevronDown style={{ color: 'var(--muted)' }}/>
            </button>
          </div>
          <button style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 0, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(11,95,255,0.28)',
          }}>
            <window.Icon.plus/>
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      {showStats && (
        <div style={{ padding: '0 18px 12px', display: 'flex', gap: 8 }}>
          <KPI label="Today" value={window.STATS.total}/>
          <KPI label="Checked-in" value={window.STATS.checkedIn} delta="+2" accent="var(--success)"/>
          <KPI label="Pending" value={window.STATS.pending} accent="var(--warn)"/>
          <KPI label="No-show" value={window.STATS.noShow} accent="var(--danger)"/>
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ padding: '2px 18px 12px', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 14px', height: 42,
          background: 'var(--card)', borderRadius: 14, border: '1px solid var(--line-2)',
        }}>
          <window.Icon.search style={{ color: 'var(--muted)' }}/>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search patient, doctor, reason"
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)',
            }}/>
        </div>
        <button style={{
          width: 42, height: 42, borderRadius: 14,
          background: 'var(--card)', border: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)', cursor: 'pointer',
        }}>
          <window.Icon.filter/>
        </button>
      </div>

      {/* ── Filter pills ── */}
      <div style={{
        padding: '0 18px 14px', display: 'flex', gap: 6,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {filters.map(f => (
          <FilterPill key={f.id} label={f.label} count={f.count}
            active={filter === f.id} onClick={() => setFilter(f.id)}/>
        ))}
      </div>

      {/* ── List ── */}
      <div style={{ padding: '0 18px' }}>
        {grouped.map(([label, items]) => (
          <div key={label || 'x'} style={{ marginBottom: sectionPad }}>
            {label && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 2px 10px',
              }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
                <div style={{ flex: 1, height: 1, background: 'var(--line-2)' }}/>
                <div style={{ fontSize: 11, color: 'var(--muted-2)', fontFeatureSettings: '"tnum"' }}>{items.length}</div>
              </div>
            )}
            {listStyle === 'timeline' ? (
              <TimelineList items={items} variant={variant} density={density} onOpen={onOpen}/>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: gap }}>
                {items.map(a => (
                  <AppointmentCard key={a.id} a={a} variant={variant} density={density} onOpen={() => onOpen(a)}/>
                ))}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center',
            color: 'var(--muted)', fontSize: 13,
          }}>
            No appointments match these filters.
          </div>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '8px 16px 24px',
        background: 'linear-gradient(to bottom, rgba(244,245,247,0) 0%, var(--bg) 30%)',
      }}>
        <div style={{
          background: 'var(--card)', borderRadius: 20,
          border: '1px solid var(--line-2)',
          display: 'flex', padding: '6px 4px',
          boxShadow: '0 6px 20px rgba(16,24,40,0.06)',
        }}>
          {[
            { id: 'overview', icon: 'home', label: 'Overview' },
            { id: 'appts',    icon: 'list', label: 'Appointments', active: true },
            { id: 'stats',    icon: 'chart', label: 'Reports' },
            { id: 'me',       icon: 'user', label: 'Me' },
          ].map(t => (
            <div key={t.id} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 0', borderRadius: 14,
              color: t.active ? 'var(--accent)' : 'var(--muted)',
              background: t.active ? 'var(--accent-soft)' : 'transparent',
              fontSize: 10.5, fontWeight: 600,
            }}>
              {React.createElement(window.Icon[t.icon])}
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────── Timeline list variant ───────────
function TimelineList({ items, variant, density, onOpen }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 48 }}>
      <div style={{
        position: 'absolute', left: 30, top: 6, bottom: 6,
        width: 1.5, background: 'var(--line-2)',
      }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'dense' ? 8 : density === 'spacious' ? 14 : 10 }}>
        {items.map(a => {
          const m = window.STATUS_META[a.status];
          return (
            <div key={a.id} style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: -26, top: 12,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                fontWeight: 600, color: 'var(--ink-2)',
                transform: 'translateX(-100%)', paddingRight: 8,
                textAlign: 'right', lineHeight: 1,
              }}>
                {a.time}
              </div>
              <div style={{
                position: 'absolute', left: -18.5, top: 14,
                width: 11, height: 11, borderRadius: 11,
                background: '#fff', border: `2px solid ${m.dot}`,
              }}/>
              <AppointmentCard a={a} variant={variant} density={density} onOpen={() => onOpen(a)}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { AppointmentsScreen });
