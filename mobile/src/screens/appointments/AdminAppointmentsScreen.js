import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../api/axiosConfig';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

// ── Design tokens (mockup palette) ───────────────────────────────────────────

const T = {
  bg:        '#F4F5F7',
  card:      '#FFFFFF',
  line:      '#E8EAEF',
  line2:     '#E3E6EC',
  ink:       '#0E1422',
  ink2:      '#3A4254',
  muted:     '#7A8296',
  muted2:    '#A7ADBB',
  accent:    '#0B5FFF',
  accentSoft:'#E7EFFF',
  success:   '#0F9D7A',
  successSoft:'#DDF3EA',
  warn:      '#E0A23B',
  warnSoft:  '#FBEFD6',
  danger:    '#D6574F',
  dangerSoft:'#FADBD9',
};

const STATUS_META = {
  pending:   { label: 'Pending',   fg: '#8A6318', bg: T.warnSoft,    dot: T.warn },
  confirmed: { label: 'Confirmed', fg: '#0A3D99', bg: T.accentSoft,  dot: T.accent },
  completed: { label: 'Completed', fg: '#0A6B55', bg: T.successSoft, dot: T.success },
  cancelled: { label: 'Cancelled', fg: '#4B5262', bg: '#ECEEF2',     dot: '#8A93A6' },
};

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'pending',   label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const toneFor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';

const ageFrom = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const sameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear()
      && x.getMonth() === y.getMonth()
      && x.getDate() === y.getDate();
};

const fmtTime = (d) => {
  if (!d) return '--:--';
  const date = new Date(d);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const fmtDayShort = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
};

const fmtDayLong = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtMoney = (n) => (n == null ? 'Rs. —' : `Rs. ${Number(n).toLocaleString()}`);

// ── Sub-components ───────────────────────────────────────────────────────────

const Avatar = ({ name, id, size = 42 }) => (
  <View style={[
    { width: size, height: size, borderRadius: size / 2, backgroundColor: toneFor(id || name) },
    styles.avatar,
  ]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
  </View>
);

const StatusChip = ({ status, small }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={[
      styles.chip,
      { backgroundColor: m.bg, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 3 : 4 },
    ]}>
      <View style={[styles.chipDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.chipText, { color: m.fg, fontSize: small ? 10.5 : 11.5 }]}>{m.label}</Text>
    </View>
  );
};

const KPI = ({ label, value, accent }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, accent && { color: accent }]}>{value}</Text>
  </View>
);

const FilterPill = ({ label, count, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[
    styles.pill,
    active ? { backgroundColor: T.ink, borderColor: T.ink } : null,
  ]}>
    <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
    {count !== undefined && (
      <View style={[
        styles.pillCount,
        { backgroundColor: active ? 'rgba(255,255,255,0.16)' : T.bg },
      ]}>
        <Text style={[styles.pillCountText, { color: active ? '#fff' : T.muted }]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const AppointmentCard = ({ item, onPress, index }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: (index % 8) * 50,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const patient = item.patientId || {};
  const doctor  = item.doctorId  || {};
  const service = item.serviceId || {};

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [
        { scale: press },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      ],
    }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(press, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 2 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start()}
        onPress={onPress}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <Avatar name={patient.name} id={patient._id} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={styles.patientName}>
                {patient.name || 'Patient'}
              </Text>
              <Text style={styles.timeMono}>{fmtTime(item.date)}</Text>
            </View>
            <Text numberOfLines={1} style={styles.reasonText}>
              {service.serviceName || 'Consultation'}
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
          </View>
          {item.priorityFlag === 'red' && (
            <View style={styles.priorityDot} />
          )}
        </View>

        <View style={styles.cardFoot}>
          <Ionicons name="medkit-outline" size={12} color={T.muted2} />
          <Text style={styles.footText} numberOfLines={1}>
            {doctor.name ? `Dr ${doctor.name.replace(/^Dr\.?\s*/i, '')}` : 'Unassigned'}
          </Text>
          {item.tokenNumber != null && (
            <>
              <View style={styles.footSep} />
              <Text style={styles.footText}>Token #{item.tokenNumber}</Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <StatusChip status={item.status} small />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Detail modal (bottom sheet) ──────────────────────────────────────────────

const MetaTile = ({ label, value, sub, icon, custom }) => (
  <View style={styles.metaTile}>
    <View style={styles.metaHead}>
      {icon ? <Ionicons name={icon} size={12} color={T.muted2} /> : null}
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
    {custom || (
      <>
        <Text style={styles.metaValue} numberOfLines={1}>{value || '—'}</Text>
        {sub ? <Text style={styles.metaSub} numberOfLines={1}>{sub}</Text> : null}
      </>
    )}
  </View>
);

const ActivityRow = ({ dot, label, time, active }) => (
  <View style={styles.activityRow}>
    <View style={[
      styles.activityDot,
      { backgroundColor: dot },
      active && { shadowColor: dot, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
    ]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.activityLabel}>{label}</Text>
      <Text style={styles.activitySub}>{time}</Text>
    </View>
  </View>
);

const DetailModal = ({ visible, appt, onClose, onConfirm, onComplete, onCancel, onDelete }) => {
  if (!appt) return null;
  const patient = appt.patientId || {};
  const doctor  = appt.doctorId  || {};
  const service = appt.serviceId || {};
  const m = STATUS_META[appt.status] || STATUS_META.pending;

  const age = ageFrom(patient.dateOfBirth);
  const sex = patient.gender ? patient.gender[0].toUpperCase() : null;
  const metaLine = [sex, age != null ? `${age} yrs` : null, appt.tokenNumber != null ? `PT-${String(appt.tokenNumber).padStart(3, '0')}` : null]
    .filter(Boolean).join(' · ') || '—';

  const primary = (() => {
    if (appt.status === 'pending')   return { label: 'Confirm appointment', icon: 'checkmark-circle', bg: T.accent, onPress: onConfirm };
    if (appt.status === 'confirmed') return { label: 'Mark as completed',    icon: 'checkmark-done',  bg: T.success, onPress: onComplete };
    return null;
  })();

  const callPatient = () => {
    if (patient.phone) Linking.openURL(`tel:${patient.phone}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Grabber */}
          <View style={styles.grabberWrap}><View style={styles.grabber} /></View>

          {/* Header */}
          <View style={styles.sheetHead}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={18} color={T.ink2} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Appointment details</Text>
            <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={T.danger} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
            {/* Patient block */}
            <View style={styles.patientBlock}>
              <View style={styles.patientRow}>
                <Avatar name={patient.name} id={patient._id} size={56} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.patientBigName} numberOfLines={1}>{patient.name || 'Patient'}</Text>
                  <Text style={styles.patientMeta}>{metaLine}</Text>
                </View>
                {patient.phone ? (
                  <TouchableOpacity style={styles.roundBtn} onPress={callPatient}>
                    <Ionicons name="call" size={16} color={T.accent} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.metaLabel}>Reason for visit</Text>
                <Text style={styles.reasonValue}>{service.serviceName || 'Consultation'}</Text>
                {appt.notes ? <Text style={styles.reasonNote}>{appt.notes}</Text> : null}
              </View>
            </View>

            {/* Meta grid */}
            <View style={styles.metaGrid}>
              <MetaTile
                label="When"
                value={fmtTime(appt.date)}
                sub={fmtDayLong(appt.date)}
                icon="time-outline"
              />
              <MetaTile
                label="Status"
                custom={<View style={{ marginTop: 6 }}><StatusChip status={appt.status} /></View>}
              />
              <MetaTile
                label="Doctor"
                value={doctor.name ? `Dr ${doctor.name.replace(/^Dr\.?\s*/i, '')}` : '—'}
                sub={appt.doctorId?.email || null}
                icon="person-outline"
              />
              <MetaTile
                label="Service"
                value={service.serviceName || '—'}
                sub={service.category || null}
                icon="medkit-outline"
              />
            </View>

            {/* Fee */}
            <View style={styles.feeBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Consult fee</Text>
                <Text style={styles.feeValue}>{fmtMoney(service.price)}</Text>
              </View>
              {appt.priorityFlag === 'red' && (
                <View style={[styles.chip, { backgroundColor: T.dangerSoft }]}>
                  <View style={[styles.chipDot, { backgroundColor: T.danger }]} />
                  <Text style={[styles.chipText, { color: '#9B2B2B' }]}>High priority</Text>
                </View>
              )}
            </View>

            {/* Activity — static 3-step */}
            <View style={styles.activityBox}>
              <Text style={styles.metaLabel}>Activity</Text>
              <View style={{ marginTop: 12, gap: 12 }}>
                <ActivityRow
                  dot={T.muted2}
                  label="Appointment booked"
                  time={new Date(appt.createdAt || appt.date).toLocaleDateString()}
                />
                <ActivityRow
                  dot={T.accent}
                  label={appt.status === 'pending' ? 'Awaiting confirmation' : 'Appointment confirmed'}
                  time={appt.status === 'pending' ? 'Pending review' : fmtDayShort(appt.date)}
                  active={appt.status === 'confirmed'}
                />
                <ActivityRow
                  dot={appt.status === 'completed' ? T.success : (appt.status === 'cancelled' ? T.danger : T.muted2)}
                  label={
                    appt.status === 'completed' ? 'Visit completed' :
                    appt.status === 'cancelled' ? 'Appointment cancelled' :
                    'Visit pending'
                  }
                  time={m.label}
                  active={appt.status === 'completed' || appt.status === 'cancelled'}
                />
              </View>
            </View>

            {/* Actions */}
            {(appt.status === 'pending' || appt.status === 'confirmed') && (
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.outlineBtn, { borderColor: T.dangerSoft, marginTop: 16 }]}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={16} color={T.danger} />
                <Text style={[styles.outlineBtnText, { color: T.danger }]}>Cancel appointment</Text>
              </TouchableOpacity>
            )}

            {primary && (
              <TouchableOpacity
                onPress={primary.onPress}
                style={[styles.primaryBtn, { backgroundColor: primary.bg, marginTop: 8 }]}
                activeOpacity={0.9}
              >
                <Ionicons name={primary.icon} size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{primary.label}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminAppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]      = useState('');
  const [success, setSuccess]  = useState('');

  const [filter, setFilter]    = useState('all');
  const [query, setQuery]      = useState('');
  const [date, setDate]        = useState(null);
  const [showDate, setShowDate]= useState(false);

  const [selected, setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/appointments');
      setAppointments(Array.isArray(data) ? data : data?.appointments || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Derived
  const counts = useMemo(() => {
    const c = { all: appointments.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appointments.forEach(a => { if (c[a.status] != null) c[a.status]++; });
    return c;
  }, [appointments]);

  const todayCount = useMemo(() =>
    appointments.filter(a => sameDay(a.date, new Date())).length,
  [appointments]);

  const filtered = useMemo(() => {
    let list = appointments;
    if (date) list = list.filter(a => sameDay(a.date, date));
    if (filter !== 'all') list = list.filter(a => a.status === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        (a.patientId?.name || '').toLowerCase().includes(q) ||
        (a.doctorId?.name  || '').toLowerCase().includes(q) ||
        (a.serviceId?.serviceName || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [appointments, filter, query, date]);

  // Mutations
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/appointments/${id}/status`, { status });
      setSuccess(`Status updated to ${status}`);
      setShowDetail(false);
      fetchAll();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const deleteAppt = async (id) => {
    try {
      await api.delete(`/api/appointments/${id}`);
      setSuccess('Appointment deleted');
      setShowDetail(false);
      fetchAll();
      setTimeout(() => setSuccess(''), 2500);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete');
    }
  };

  // Detail handlers
  const openDetail = (a) => { setSelected(a); setShowDetail(true); };
  const askConfirm = () => setConfirmCfg({
    title: 'Confirm appointment?',
    message: `Mark ${selected?.patientId?.name || 'this appointment'} as confirmed.`,
    confirmText: 'Confirm', confirmColor: T.accent,
    onConfirm: () => { setConfirmCfg(null); updateStatus(selected._id, 'confirmed'); },
  });
  const askComplete = () => setConfirmCfg({
    title: 'Mark as completed?',
    message: 'This will close out the appointment.',
    confirmText: 'Complete', confirmColor: T.success,
    onConfirm: () => { setConfirmCfg(null); updateStatus(selected._id, 'completed'); },
  });
  const askCancel = () => setConfirmCfg({
    title: 'Cancel appointment?',
    message: 'This cannot be undone by the patient.',
    confirmText: 'Cancel it', confirmColor: T.danger,
    onConfirm: () => { setConfirmCfg(null); updateStatus(selected._id, 'cancelled'); },
  });
  const askDelete = () => setConfirmCfg({
    title: 'Delete appointment?',
    message: 'This permanently removes the record.',
    confirmText: 'Delete', confirmColor: T.danger,
    onConfirm: () => { setConfirmCfg(null); deleteAppt(selected._id); },
  });

  // Header
  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Appointments hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Appointments</Text>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={13} color={T.muted} />
            <Text style={styles.datePillText}>
              {date ? fmtDayShort(date) : 'All dates'}
            </Text>
            <Ionicons name="chevron-down" size={13} color={T.muted} />
          </TouchableOpacity>
        </View>
        {date && (
          <TouchableOpacity style={styles.clearDateBtn} onPress={() => setDate(null)}>
            <Ionicons name="close" size={14} color={T.muted} />
            <Text style={styles.clearDateText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KPI label="Today"     value={todayCount} />
        <KPI label="Confirmed" value={counts.confirmed} accent={T.accent} />
        <KPI label="Pending"   value={counts.pending}   accent={T.warn} />
        <KPI label="Cancelled" value={counts.cancelled} accent={T.danger} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search patient, doctor, service"
            placeholderTextColor={T.muted2}
            style={styles.searchInput}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={15} color={T.muted2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTERS.map(f => (
          <FilterPill
            key={f.id}
            label={f.label}
            count={counts[f.id]}
            active={filter === f.id}
            onPress={() => setFilter(f.id)}
          />
        ))}
      </ScrollView>

      {error ? <View style={{ paddingHorizontal: 18, marginBottom: 8 }}><ErrorAlert message={error} /></View> : null}
      {success ? (
        <View style={styles.successBar}>
          <Ionicons name="checkmark-circle" size={14} color={T.success} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <FlatList
        data={filtered}
        keyExtractor={(it) => it._id}
        renderItem={({ item, index }) => (
          <AppointmentCard item={item} index={index} onPress={() => openDetail(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No appointments</Text>
            <Text style={styles.emptySub}>Nothing matches these filters.</Text>
          </View>
        }
      />

      {showDate && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowDate(false);
            if (d) setDate(d);
          }}
        />
      )}

      <DetailModal
        visible={showDetail}
        appt={selected}
        onClose={() => setShowDetail(false)}
        onConfirm={askConfirm}
        onComplete={askComplete}
        onCancel={askCancel}
        onDelete={askDelete}
      />

      {confirmCfg && (
        <ConfirmDialog
          title={confirmCfg.title}
          message={confirmCfg.message}
          confirmText={confirmCfg.confirmText}
          confirmColor={confirmCfg.confirmColor}
          onConfirm={confirmCfg.onConfirm}
          onCancel={() => setConfirmCfg(null)}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Top bar
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingHorizontal: 2,
    paddingBottom: 6,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: T.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.3 },
  topLabel: { fontSize: 11, color: T.muted, fontWeight: '500' },
  topName:  { fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Title
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingTop: 10, paddingBottom: 14, gap: 10,
  },
  pageTitle: { fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.6 },
  datePill: {
    marginTop: 6, alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  datePillText: { fontSize: 12, fontWeight: '600', color: T.ink2 },
  clearDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  clearDateText: { fontSize: 11.5, color: T.muted, fontWeight: '600' },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: {
    flex: 1, minWidth: 0,
    backgroundColor: T.card, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 11,
    borderWidth: 1, borderColor: T.line,
  },
  kpiLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '500',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20, fontWeight: '700', color: T.ink,
    letterSpacing: -0.4, marginTop: 3,
  },

  // Search
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchBox: {
    flex: 1, height: 42, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line2,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, padding: 0 },

  // Pills
  pillsRow: { gap: 6, paddingBottom: 14, paddingRight: 16 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  pillText: { fontSize: 12.5, fontWeight: '600', color: T.ink2 },
  pillCount: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 999, minWidth: 20, alignItems: 'center',
  },
  pillCountText: { fontSize: 10.5, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: T.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: T.line,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2A2F3C', fontWeight: '700', letterSpacing: 0.3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  patientName: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  timeMono: {
    fontSize: 13.5, fontWeight: '700', color: T.ink, letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  reasonText: { fontSize: 12.5, color: T.muted, marginTop: 2 },
  priorityDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.danger,
    marginTop: 4,
  },
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.line2, borderStyle: 'dashed',
  },
  footText: { fontSize: 11.5, color: T.ink2, fontWeight: '500' },
  footSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.muted2 },

  // Chip
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, alignSelf: 'flex-start',
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontWeight: '700', letterSpacing: 0.1 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink2 },
  emptySub: { fontSize: 12.5, color: T.muted },

  // Success
  successBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 2, marginBottom: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.successSoft, borderRadius: 12,
  },
  successText: { fontSize: 12.5, color: '#0A6B55', fontWeight: '600' },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(14,20,34,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '92%',
  },
  grabberWrap: { alignItems: 'center', paddingVertical: 6 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line2 },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  sheetTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },

  patientBlock: {
    backgroundColor: T.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: T.line,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  patientBigName: { fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 },
  patientMeta: { fontSize: 12.5, color: T.muted, marginTop: 2 },
  roundBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  reasonBox: {
    marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: T.bg,
  },
  reasonValue: { fontSize: 14, fontWeight: '600', color: T.ink, marginTop: 4 },
  reasonNote: { fontSize: 12.5, color: T.ink2, marginTop: 6, lineHeight: 18 },

  // Meta grid
  metaGrid: {
    marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  metaTile: {
    width: '48.5%', flexGrow: 1,
    backgroundColor: T.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: T.line,
  },
  metaHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13.5, fontWeight: '700', color: T.ink,
    marginTop: 4, letterSpacing: -0.2,
  },
  metaSub: { fontSize: 11, color: T.muted, marginTop: 2 },

  // Fee
  feeBar: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: T.line,
  },
  feeValue: {
    fontSize: 18, fontWeight: '700', color: T.ink,
    letterSpacing: -0.4, marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  // Activity
  activityBox: {
    marginTop: 10, padding: 14,
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
  },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityLabel: { fontSize: 12.5, color: T.ink, fontWeight: '600' },
  activitySub: { fontSize: 11, color: T.muted, marginTop: 2 },

  // Buttons
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    shadowColor: '#0B5FFF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
