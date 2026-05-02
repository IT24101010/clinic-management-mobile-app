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

const CATEGORY_META = {
  'general':      { label: 'General',      icon: 'megaphone-outline', color: '#2563EB', bg: '#EFF6FF' },
  'health-alert': { label: 'Health Alert', icon: 'warning-outline',   color: '#EF4444', bg: '#FEF2F2' },
  'holiday':      { label: 'Holiday',      icon: 'calendar-outline',  color: '#F97316', bg: '#FFF7ED' },
  'campaign':     { label: 'Campaign',     icon: 'ribbon-outline',    color: '#7C3AED', bg: '#F5F3FF' },
};

const PRIORITY_META = {
  high:   { label: 'High',   fg: '#9B2B2B', bg: '#FADBD9', dot: T.danger  },
  medium: { label: 'Medium', fg: '#8A6318', bg: '#FBEFD6', dot: T.warn    },
  low:    { label: 'Low',    fg: '#0A6B55', bg: '#DDF3EA', dot: T.success },
};

const AUDIENCE_META = {
  all:         { label: 'Everyone',  icon: 'people-outline'       },
  patients:    { label: 'Patients',  icon: 'person-outline'       },
  doctors:     { label: 'Doctors',   icon: 'medkit-outline'       },
  'high-risk': { label: 'High Risk', icon: 'alert-circle-outline' },
};

const STATUS_FILTERS = [
  { id: 'all',      label: 'All'      },
  { id: 'active',   label: 'Active'   },
  { id: 'inactive', label: 'Inactive' },
];

const CATEGORY_FILTERS = [
  { id: 'all',          label: 'All Categories' },
  { id: 'general',      label: 'General'        },
  { id: 'health-alert', label: 'Health Alert'   },
  { id: 'holiday',      label: 'Holiday'        },
  { id: 'campaign',     label: 'Campaign'       },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateShort = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const isExpired = (expiryDate) =>
  expiryDate && new Date(expiryDate) < new Date();

const statusOf = (item) => {
  if (isExpired(item.expiryDate)) return 'expired';
  return item.isActive ? 'active' : 'inactive';
};

// ── Sub-components ────────────────────────────────────────────────────────────

const KPI = ({ label, value, accent }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={[styles.kpiValue, accent && { color: accent }]}>{value}</Text>
  </View>
);

const FilterPill = ({ label, active, onPress, accentColor }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[
      styles.pill,
      active && { backgroundColor: accentColor || T.ink, borderColor: accentColor || T.ink },
    ]}
  >
    <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);

const StatusChip = ({ item }) => {
  const s = statusOf(item);
  const cfg = {
    expired:  { label: 'Expired',  fg: '#6B3A3A', bg: '#F5E0E0', dot: '#C0474F' },
    active:   { label: 'Active',   fg: '#0A6B55', bg: '#DDF3EA', dot: T.success },
    inactive: { label: 'Inactive', fg: '#4B5262', bg: '#ECEEF2', dot: '#8A93A6' },
  }[s];
  return (
    <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.chipText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};

const AnnouncementCard = ({ item, onEdit, onDelete, index }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: (index % 8) * 50,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const cat = CATEGORY_META[item.category] || CATEGORY_META.general;
  const pri = PRIORITY_META[item.priority] || PRIORITY_META.low;
  const aud = AUDIENCE_META[item.targetAudience] || AUDIENCE_META.all;

  const pubDate = fmtDateShort(item.publishDate);
  const expDate = fmtDateShort(item.expiryDate);

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
        style={[styles.card, { borderLeftColor: cat.color, borderLeftWidth: 3 }]}
      >
        {/* Category row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.catIconBox, { backgroundColor: cat.bg }]}>
            <Ionicons name={cat.icon} size={15} color={cat.color} />
          </View>
          <Text style={[styles.catLabel, { color: cat.color }]}>
            {cat.label.toUpperCase()}
          </Text>
          <View style={{ flex: 1 }} />
          <StatusChip item={item} />
        </View>

        {/* Title & content */}
        <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
        {item.content ? (
          <Text numberOfLines={2} style={styles.cardContent}>{item.content}</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFoot}>
          <View style={styles.footTag}>
            <Ionicons name={aud.icon} size={10} color={T.muted} />
            <Text style={styles.footTagText}>{aud.label}</Text>
          </View>

          <View style={[styles.chip, { backgroundColor: pri.bg }]}>
            <View style={[styles.chipDot, { backgroundColor: pri.dot }]} />
            <Text style={[styles.chipText, { color: pri.fg }]}>{pri.label}</Text>
          </View>

          {pubDate ? (
            <Text style={styles.dateText}>
              {pubDate}{expDate ? ` → ${expDate}` : ''}
            </Text>
          ) : null}

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

export default function AdminAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [catFilter,     setCatFilter]     = useState('all');
  const [query,         setQuery]         = useState('');
  const [confirmCfg,    setConfirmCfg]    = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/announcements/admin/all');
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const kpi = useMemo(() => ({
    total:   announcements.length,
    active:  announcements.filter(a => a.isActive && !isExpired(a.expiryDate)).length,
    highPri: announcements.filter(a => a.priority === 'high').length,
    expired: announcements.filter(a => isExpired(a.expiryDate)).length,
  }), [announcements]);

  const statusCounts = useMemo(() => ({
    all:      announcements.length,
    active:   announcements.filter(a => a.isActive && !isExpired(a.expiryDate)).length,
    inactive: announcements.filter(a => !a.isActive).length,
  }), [announcements]);

  const filtered = useMemo(() => {
    let list = announcements;
    if (statusFilter === 'active')   list = list.filter(a => a.isActive && !isExpired(a.expiryDate));
    if (statusFilter === 'inactive') list = list.filter(a => !a.isActive);
    if (catFilter !== 'all')         list = list.filter(a => a.category === catFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        (a.title   || '').toLowerCase().includes(q) ||
        (a.content || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [announcements, statusFilter, catFilter, query]);

  const handleDelete = (item) => setConfirmCfg({
    title:        'Deactivate announcement?',
    message:      `"${item.title}" will be hidden from all users. You can reactivate it via the edit form.`,
    confirmText:  'Deactivate',
    confirmColor: T.danger,
    onConfirm: async () => {
      setConfirmCfg(null);
      try {
        await api.delete(`/api/announcements/${item._id}`);
        setSuccess('Announcement deactivated');
        fetchAll();
        setTimeout(() => setSuccess(''), 2500);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to deactivate');
      }
    },
  });

  const goAdd  = () => navigation.navigate('AnnouncementForm');
  const goEdit = (a) => navigation.navigate('AnnouncementForm', { announcement: a });

  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Announcements hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Announcements</Text>
        <TouchableOpacity style={styles.addBtn} onPress={goAdd} activeOpacity={0.88}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KPI label="Total"    value={kpi.total} />
        <KPI label="Active"   value={kpi.active}   accent={T.success} />
        <KPI label="High Pri" value={kpi.highPri}  accent={T.danger}  />
        <KPI label="Expired"  value={kpi.expired}  accent={T.muted}   />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={T.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title or content…"
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

      {/* Status filter pills */}
      <Text style={styles.filterGroupLabel}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
        {STATUS_FILTERS.map(f => (
          <FilterPill
            key={f.id}
            label={`${f.label}  ${statusCounts[f.id] ?? ''}`}
            active={statusFilter === f.id}
            onPress={() => setStatusFilter(f.id)}
          />
        ))}
      </ScrollView>

      {/* Category filter pills */}
      <Text style={styles.filterGroupLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.pillsRow, { paddingBottom: 14 }]}
      >
        {CATEGORY_FILTERS.map(f => (
          <FilterPill
            key={f.id}
            label={f.label}
            active={catFilter === f.id}
            onPress={() => setCatFilter(f.id)}
            accentColor={CATEGORY_META[f.id]?.color}
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
          <AnnouncementCard
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
            <Ionicons name="megaphone-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No announcements</Text>
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

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchBox: {
    flex: 1, height: 42, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line2,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, padding: 0 },

  filterGroupLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 6, marginTop: 2,
  },
  pillsRow: { gap: 6, paddingBottom: 10, paddingRight: 16 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  pillText: { fontSize: 12.5, fontWeight: '600', color: T.ink2 },

  card: {
    backgroundColor: T.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: T.line,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catIconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: T.ink,
    letterSpacing: -0.2, marginBottom: 4,
  },
  cardContent: { fontSize: 12.5, color: T.muted, lineHeight: 18 },
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: T.line2, borderStyle: 'dashed',
    flexWrap: 'wrap',
  },
  footTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: T.bg, borderRadius: 999,
    borderWidth: 1, borderColor: T.line2,
  },
  footTagText: { fontSize: 10.5, color: T.muted, fontWeight: '500' },
  dateText: { fontSize: 11, color: T.muted2, fontWeight: '500' },
  actionBtnEdit: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDelete: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: T.dangerSoft, alignItems: 'center', justifyContent: 'center',
  },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontWeight: '700', fontSize: 10.5, letterSpacing: 0.1 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink2 },
  emptySub: { fontSize: 12.5, color: T.muted },

  successBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 2, marginBottom: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.successSoft, borderRadius: 12,
  },
  successText: { fontSize: 12.5, color: '#0A6B55', fontWeight: '600' },
});
