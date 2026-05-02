import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../api/axiosConfig';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:          '#F4F5F7',
  card:        '#FFFFFF',
  line:        '#E8EAEF',
  line2:       '#E3E6EC',
  ink:         '#0E1422',
  ink2:        '#3A4254',
  muted:       '#7A8296',
  muted2:      '#A7ADBB',
  accent:      '#0B5FFF',
  accentSoft:  '#E7EFFF',
  success:     '#0F9D7A',
  successSoft: '#DDF3EA',
  warn:        '#E0A23B',
  warnSoft:    '#FBEFD6',
  danger:      '#D6574F',
  dangerSoft:  '#FADBD9',
};

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

const STATUS_FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'open',   label: 'Open' },
  { id: 'booked', label: 'Booked' },
  { id: 'full',   label: 'Full' },
  { id: 'closed', label: 'Closed' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toneFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';

const fmtDayShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', day: '2-digit', month: 'short',
  });
};

const sameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear()
    && x.getMonth() === y.getMonth()
    && x.getDate() === y.getDate();
};

const getSlotStatus = (slot) => {
  if (!slot.isActive) return 'closed';
  if (slot.currentBookings >= slot.maxCapacity) return 'full';
  if (slot.currentBookings > 0) return 'booked';
  return 'open';
};

const STATUS_META = {
  open:   { label: 'Open',   fg: '#0A6B55', bg: T.successSoft, dot: T.success },
  booked: { label: 'Booked', fg: '#0A3D99', bg: T.accentSoft,  dot: T.accent  },
  full:   { label: 'Full',   fg: '#8A6318', bg: T.warnSoft,    dot: T.warn    },
  closed: { label: 'Closed', fg: '#4B5262', bg: '#ECEEF2',     dot: '#8A93A6' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Avatar = ({ name, id, size = 40 }) => (
  <View style={[
    { width: size, height: size, borderRadius: size * 0.35, backgroundColor: toneFor(id || name) },
    styles.avatar,
  ]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
  </View>
);

const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.open;
  return (
    <View style={[styles.chip, { backgroundColor: m.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.chipText, { color: m.fg }]}>{m.label}</Text>
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
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.pill, active && { backgroundColor: T.ink, borderColor: T.ink }]}
  >
    <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
    {count !== undefined && (
      <View style={[styles.pillCount, { backgroundColor: active ? 'rgba(255,255,255,0.16)' : T.bg }]}>
        <Text style={[styles.pillCountText, { color: active ? '#fff' : T.muted }]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const SlotCard = ({ item, onEdit, onDelete, index }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: (index % 8) * 50,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const doctorName = item.doctorId?.name || 'Unknown Doctor';
  const status = getSlotStatus(item);
  const filledPct = item.maxCapacity > 0
    ? Math.min((item.currentBookings / item.maxCapacity) * 100, 100)
    : 0;

  const barColor = status === 'full' ? T.warn : status === 'closed' ? T.muted2 : T.accent;

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [
        { scale: press },
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      ],
    }}>
      <View style={styles.card}>
        {/* Top row */}
        <View style={styles.cardTop}>
          <Avatar name={doctorName} id={item.doctorId?._id} size={42} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={styles.doctorName}>
                {doctorName.startsWith('Dr') ? doctorName : `Dr. ${doctorName}`}
              </Text>
              <StatusChip status={status} />
            </View>
            <Text style={styles.timeRange}>
              {item.startTime} – {item.endTime}
            </Text>
          </View>
        </View>

        {/* Capacity bar */}
        <View style={styles.capacityRow}>
          <View style={styles.capacityBarBg}>
            <View style={[styles.capacityBarFill, { width: `${filledPct}%`, backgroundColor: barColor }]} />
          </View>
          <Text style={styles.capacityLabel}>
            {item.currentBookings} / {item.maxCapacity} booked
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFoot}>
          <Ionicons name="calendar-outline" size={11} color={T.muted2} />
          <Text style={styles.footText}>{fmtDayShort(item.date)}</Text>
          <View style={styles.footSep} />
          <Ionicons name="people-outline" size={11} color={T.muted2} />
          <Text style={styles.footText}>
            {item.maxCapacity} max capacity
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={styles.actionBtnEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={13} color={T.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={styles.actionBtnDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color={T.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ManageTimeSlotsScreen({ navigation }) {
  const [slots,      setSlots]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const [filter,     setFilter]     = useState('all');
  const [query,      setQuery]      = useState('');
  const [date,       setDate]       = useState(null);
  const [showDate,   setShowDate]   = useState(false);
  const [confirmCfg, setConfirmCfg] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/timeslots');
      setSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load time slots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Derived counts
  const counts = useMemo(() => {
    const c = { all: slots.length, open: 0, booked: 0, full: 0, closed: 0 };
    slots.forEach(s => {
      const st = getSlotStatus(s);
      if (c[st] != null) c[st]++;
    });
    return c;
  }, [slots]);

  const todayCount = useMemo(() =>
    slots.filter(s => sameDay(s.date, new Date())).length,
  [slots]);

  const activeCount = useMemo(() =>
    slots.filter(s => s.isActive).length,
  [slots]);

  const filtered = useMemo(() => {
    let list = slots;
    if (date) list = list.filter(s => sameDay(s.date, date));
    if (filter !== 'all') list = list.filter(s => getSlotStatus(s) === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(s => (s.doctorId?.name || '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.date), db = new Date(b.date);
      if (da - db !== 0) return da - db;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [slots, filter, query, date]);

  const handleDelete = (item) => setConfirmCfg({
    title:        'Delete time slot?',
    message:      `This will also delete all ${item.currentBookings} appointment(s) booked in this slot. This cannot be undone.`,
    confirmText:  'Delete',
    confirmColor: T.danger,
    onConfirm: async () => {
      setConfirmCfg(null);
      try {
        await api.delete(`/api/timeslots/${item._id}`);
        setSuccess('Time slot deleted');
        fetchAll();
        setTimeout(() => setSuccess(''), 2500);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to delete');
      }
    },
  });

  const goAdd  = () => navigation.navigate('TimeSlotForm');
  const goEdit = (s) => navigation.navigate('TimeSlotForm', { slot: s });

  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Time slots hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Time Slots</Text>
          <TouchableOpacity style={styles.datePill} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={13} color={T.muted} />
            <Text style={styles.datePillText}>
              {date ? fmtDayShort(date) : 'All dates'}
            </Text>
            <Ionicons name="chevron-down" size={13} color={T.muted} />
          </TouchableOpacity>
        </View>
        <View style={styles.titleActions}>
          {date && (
            <TouchableOpacity style={styles.clearDateBtn} onPress={() => setDate(null)}>
              <Ionicons name="close" size={14} color={T.muted} />
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addBtn} onPress={goAdd} activeOpacity={0.88}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add slot</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KPI label="Total"  value={slots.length} />
        <KPI label="Today"  value={todayCount}   accent={T.accent} />
        <KPI label="Active" value={activeCount}  accent={T.success} />
        <KPI label="Full"   value={counts.full}  accent={T.warn} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by doctor name…"
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
        {STATUS_FILTERS.map(f => (
          <FilterPill
            key={f.id}
            label={f.label}
            count={f.id === 'all' ? counts.all : counts[f.id]}
            active={filter === f.id}
            onPress={() => setFilter(f.id)}
          />
        ))}
      </ScrollView>

      {error ? (
        <View style={{ paddingHorizontal: 2, marginBottom: 8 }}>
          <ErrorAlert message={error} />
        </View>
      ) : null}

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
        keyExtractor={it => it._id}
        renderItem={({ item, index }) => (
          <SlotCard
            item={item}
            index={index}
            onEdit={goEdit}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No time slots</Text>
            <Text style={styles.emptySub}>
              {filter !== 'all' || date
                ? 'Nothing matches these filters.'
                : 'Tap "Add slot" to create the first one.'}
            </Text>
          </View>
        }
      />

      {showDate && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDate(false); if (d) setDate(d); }}
        />
      )}

      {confirmCfg && (
        <ConfirmDialog
          visible
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Top bar
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingHorizontal: 2, paddingBottom: 6,
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
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  clearDateText: { fontSize: 11.5, color: T.muted, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.ink, paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

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
  rowBetween: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  doctorName: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  timeRange:  { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 2, letterSpacing: -0.2 },

  // Capacity
  capacityRow: { marginTop: 12, gap: 5 },
  capacityBarBg: {
    height: 5, backgroundColor: T.line2, borderRadius: 3, overflow: 'hidden',
  },
  capacityBarFill: { height: '100%', borderRadius: 3 },
  capacityLabel: { fontSize: 11, color: T.muted, fontWeight: '600' },

  // Footer
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.line2, borderStyle: 'dashed',
  },
  footText: { fontSize: 11.5, color: T.ink2, fontWeight: '500' },
  footSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.muted2 },
  actionBtnEdit: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDelete: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  // Chip
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontWeight: '700', fontSize: 10.5, letterSpacing: 0.1 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink2 },
  emptySub: { fontSize: 12.5, color: T.muted, textAlign: 'center', paddingHorizontal: 20 },

  // Success
  successBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 2, marginBottom: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.successSoft, borderRadius: 12,
  },
  successText: { fontSize: 12.5, color: '#0A6B55', fontWeight: '600' },
});
