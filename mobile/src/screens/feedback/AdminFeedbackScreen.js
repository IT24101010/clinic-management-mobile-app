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
  star:        '#F5A623',
};

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

const SENTIMENT_META = {
  positive: { label: 'Positive', fg: '#0A6B55', bg: '#DDF3EA', dot: '#0F9D7A' },
  negative: { label: 'Negative', fg: '#9B2B2B', bg: '#FADBD9', dot: '#D6574F' },
  neutral:  { label: 'Neutral',  fg: '#4B5262', bg: '#ECEEF2', dot: '#8A93A6' },
};

const RATING_FILTERS = [
  { id: 'all', label: 'All' },
  { id: '5',   label: '5 ★' },
  { id: '4',   label: '4 ★' },
  { id: '3',   label: '3 ★' },
  { id: '2',   label: '2 ★' },
  { id: '1',   label: '1 ★' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toneFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';

const fmtRelative = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const avgRating = (list) => {
  if (!list.length) return '—';
  const avg = list.reduce((s, f) => s + (f.rating || 0), 0) / list.length;
  return avg.toFixed(1);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Avatar = ({ name, id, size = 40 }) => (
  <View style={[
    { width: size, height: size, borderRadius: size / 2, backgroundColor: toneFor(id || name) },
    styles.avatar,
  ]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
  </View>
);

const StarRow = ({ rating, size = 13 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={size}
        color={i <= rating ? T.star : T.muted2}
      />
    ))}
  </View>
);

const SentimentChip = ({ label }) => {
  if (!label) return null;
  const key = label.toLowerCase();
  const m   = SENTIMENT_META[key] || SENTIMENT_META.neutral;
  return (
    <View style={[styles.chip, { backgroundColor: m.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.chipText, { color: m.fg }]}>{m.label}</Text>
    </View>
  );
};

const KPI = ({ label, value, accent, sub }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, accent && { color: accent }]}>{value}</Text>
    {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
  </View>
);

const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[styles.pill, active && { backgroundColor: T.ink, borderColor: T.ink }]}
  >
    <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

const FeedbackCard = ({ item, onDelete, index }) => {
  const anim  = useRef(new Animated.Value(0)).current;
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
  const name    = typeof patient === 'object' ? (patient.name || 'Patient') : String(patient);
  const patId   = typeof patient === 'object' ? patient._id : patient;

  const isCritical = item.rating <= 2;

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
        onPressOut={() => Animated.spring(press, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start()}
        style={[styles.card, isCritical && styles.cardCritical]}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <Avatar name={name} id={String(patId)} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={styles.patientName}>{name}</Text>
              <StarRow rating={item.rating || 0} />
            </View>
            <View style={styles.tagsRow}>
              {doctor.name ? (
                <View style={styles.tag}>
                  <Ionicons name="person-outline" size={10} color={T.muted} />
                  <Text style={styles.tagText} numberOfLines={1}>
                    Dr {doctor.name.replace(/^Dr\.?\s*/i, '')}
                  </Text>
                </View>
              ) : null}
              {service.serviceName ? (
                <View style={styles.tag}>
                  <Ionicons name="medkit-outline" size={10} color={T.muted} />
                  <Text style={styles.tagText} numberOfLines={1}>{service.serviceName}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {isCritical && <View style={styles.criticalDot} />}
        </View>

        {/* Comment */}
        {item.comment ? (
          <Text numberOfLines={2} style={styles.comment}>"{item.comment}"</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFoot}>
          {item.sentimentLabel ? (
            <SentimentChip label={item.sentimentLabel} />
          ) : null}
          <View style={{ flex: 1 }} />
          <Text style={styles.timeText}>{fmtRelative(item.createdAt)}</Text>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color={T.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminFeedbackScreen({ navigation }) {
  const [feedback,   setFeedback]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [filter,     setFilter]     = useState('all');
  const [query,      setQuery]      = useState('');
  const [confirmCfg, setConfirmCfg] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/feedback');
      setFeedback(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Counts per rating for pills
  const ratingCounts = useMemo(() => {
    const c = { all: feedback.length, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach(f => { if (c[f.rating] != null) c[f.rating]++; });
    return c;
  }, [feedback]);

  const kpi = useMemo(() => ({
    total:    feedback.length,
    avg:      avgRating(feedback),
    positive: feedback.filter(f => f.sentimentLabel?.toLowerCase() === 'positive').length,
    critical: feedback.filter(f => f.rating <= 2).length,
  }), [feedback]);

  const filtered = useMemo(() => {
    let list = feedback;
    if (filter !== 'all') list = list.filter(f => f.rating === Number(filter));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(f => {
        const patient = f.patientId?.name || '';
        const doctor  = f.doctorId?.name  || '';
        const service = f.serviceId?.serviceName || '';
        const comment = f.comment || '';
        return patient.toLowerCase().includes(q)
            || doctor.toLowerCase().includes(q)
            || service.toLowerCase().includes(q)
            || comment.toLowerCase().includes(q);
      });
    }
    return list;
  }, [feedback, filter, query]);

  const handleDelete = (item) => {
    const name = item.patientId?.name || 'this patient';
    setConfirmCfg({
      title:        'Delete feedback?',
      message:      `Remove ${name}'s review permanently. This cannot be undone.`,
      confirmText:  'Delete',
      confirmColor: T.danger,
      onConfirm: async () => {
        setConfirmCfg(null);
        try {
          await api.delete(`/api/feedback/${item._id}`);
          setSuccess('Feedback deleted');
          fetchAll();
          setTimeout(() => setSuccess(''), 2500);
        } catch (e) {
          setError(e?.response?.data?.message || 'Failed to delete');
        }
      },
    });
  };

  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Feedback hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Feedback</Text>
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KPI label="Total"    value={kpi.total} />
        <KPI label="Avg. Rating" value={kpi.avg} accent={T.star}
          sub={kpi.avg !== '—' ? '★ out of 5' : null} />
        <KPI label="Positive" value={kpi.positive} accent={T.success} />
        <KPI label="Critical" value={kpi.critical} accent={T.danger} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search patient, doctor, comment…"
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

      {/* Rating filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {RATING_FILTERS.map(f => (
          <FilterPill
            key={f.id}
            label={`${f.label}${ratingCounts[f.id] !== undefined ? `  ${ratingCounts[f.id]}` : ''}`}
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
          <FeedbackCard item={item} index={index} onDelete={handleDelete} />
        )}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No feedback</Text>
            <Text style={styles.emptySub}>Nothing matches these filters.</Text>
          </View>
        }
      />

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
  titleRow: { paddingTop: 10, paddingBottom: 14 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.6 },

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
  kpiSub: { fontSize: 9.5, color: T.muted2, marginTop: 1 },

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
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  pillText: { fontSize: 12.5, fontWeight: '600', color: T.ink2 },

  // Card
  card: {
    backgroundColor: T.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: T.line,
  },
  cardCritical: {
    borderColor: '#F0C2C0',
    borderLeftWidth: 3, borderLeftColor: T.danger,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2A2F3C', fontWeight: '700', letterSpacing: 0.3 },
  rowBetween: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  patientName: { flex: 1, fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: T.bg, borderRadius: 999,
    borderWidth: 1, borderColor: T.line2,
  },
  tagText: { fontSize: 10.5, color: T.muted, fontWeight: '500' },
  criticalDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.danger, marginTop: 4,
  },

  comment: {
    fontSize: 12.5, color: T.ink2, lineHeight: 18,
    marginTop: 10, fontStyle: 'italic',
  },

  cardFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.line2, borderStyle: 'dashed',
  },
  timeText: { fontSize: 11, color: T.muted2, fontWeight: '500' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  // Chip
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontWeight: '700', fontSize: 10.5, letterSpacing: 0.1 },

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
});
