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
};

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toneFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const categoryIcon = (cat = '') => {
  const c = cat.toLowerCase();
  if (c.includes('lab') || c.includes('test'))           return 'flask-outline';
  if (c.includes('consult'))                             return 'chatbubble-ellipses-outline';
  if (c.includes('emergency') || c.includes('urgent'))  return 'pulse-outline';
  if (c.includes('eye') || c.includes('vision'))        return 'eye-outline';
  if (c.includes('heart') || c.includes('cardio'))      return 'heart-outline';
  if (c.includes('child') || c.includes('pediatr'))     return 'happy-outline';
  if (c.includes('physio') || c.includes('rehab'))      return 'body-outline';
  if (c.includes('xray') || c.includes('scan') || c.includes('imaging')) return 'scan-outline';
  return 'medkit-outline';
};

const fmtMoney = (n) => (n == null ? 'Rs. —' : `Rs. ${Number(n).toLocaleString()}`);

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <View style={[
        styles.pillCount,
        { backgroundColor: active ? 'rgba(255,255,255,0.16)' : T.bg },
      ]}>
        <Text style={[styles.pillCountText, { color: active ? '#fff' : T.muted }]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const ActiveChip = ({ active }) => (
  <View style={[
    styles.chip,
    { backgroundColor: active ? T.successSoft : '#ECEEF2' },
  ]}>
    <View style={[styles.chipDot, { backgroundColor: active ? T.success : T.muted2 }]} />
    <Text style={[styles.chipText, { color: active ? '#0A6B55' : '#4B5262' }]}>
      {active ? 'Active' : 'Inactive'}
    </Text>
  </View>
);

const ServiceCard = ({ item, onEdit, onDelete, index }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: (index % 8) * 50,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const bg   = toneFor(item.category || item.serviceName);
  const icon = categoryIcon(item.category || '');

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
        onPress={() => onEdit(item)}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconTile, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={20} color={T.ink2} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={styles.serviceName}>{item.serviceName}</Text>
              <ActiveChip active={item.isActive} />
            </View>
            <Text numberOfLines={1} style={styles.categoryText}>
              {item.category || 'General'}
            </Text>
            {item.description ? (
              <Text numberOfLines={1} style={styles.descText}>{item.description}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardFoot}>
          <Text style={styles.priceText}>{fmtMoney(item.price)}</Text>
          {item.duration != null && (
            <>
              <View style={styles.footSep} />
              <Ionicons name="time-outline" size={11} color={T.muted2} />
              <Text style={styles.footText}>{item.duration} min</Text>
            </>
          )}
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
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminServicesScreen({ navigation }) {
  const [services,   setServices]   = useState([]);
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
      const { data } = await api.get('/api/services/admin/all');
      setServices(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const counts = useMemo(() => ({
    all:      services.length,
    active:   services.filter(s => s.isActive).length,
    inactive: services.filter(s => !s.isActive).length,
  }), [services]);

  const categoryCount = useMemo(() =>
    new Set(services.map(s => s.category).filter(Boolean)).size,
  [services]);

  const filtered = useMemo(() => {
    let list = services;
    if (filter === 'active')   list = list.filter(s => s.isActive);
    if (filter === 'inactive') list = list.filter(s => !s.isActive);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        (s.serviceName  || '').toLowerCase().includes(q) ||
        (s.category     || '').toLowerCase().includes(q) ||
        (s.description  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [services, filter, query]);

  const handleDelete = (item) => setConfirmCfg({
    title:        'Deactivate service?',
    message:      `"${item.serviceName}" will be hidden from patients. You can reactivate it via the edit form.`,
    confirmText:  'Deactivate',
    confirmColor: T.danger,
    onConfirm: async () => {
      setConfirmCfg(null);
      try {
        await api.delete(`/api/services/${item._id}`);
        setSuccess('Service deactivated');
        fetchAll();
        setTimeout(() => setSuccess(''), 2500);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to deactivate');
      }
    },
  });

  const goAdd  = () => navigation.navigate('ServiceForm');
  const goEdit = (s) => navigation.navigate('ServiceForm', { service: s });

  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Services hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Services</Text>
        <TouchableOpacity style={styles.addBtn} onPress={goAdd} activeOpacity={0.88}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add service</Text>
        </TouchableOpacity>
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KPI label="Total"      value={counts.all} />
        <KPI label="Active"     value={counts.active}    accent={T.success} />
        <KPI label="Inactive"   value={counts.inactive}  accent={T.danger} />
        <KPI label="Categories" value={categoryCount}    accent={T.accent} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, category…"
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
          <ServiceCard
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
            <Ionicons name="cube-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No services</Text>
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
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 14,
  },
  pageTitle: { fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.6 },
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
  iconTile: {
    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  serviceName: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  categoryText: { fontSize: 12, color: T.muted, marginTop: 2, fontWeight: '500' },
  descText: { fontSize: 11.5, color: T.muted2, marginTop: 3 },

  cardFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.line2, borderStyle: 'dashed',
  },
  priceText: { fontSize: 13, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
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
