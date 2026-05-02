import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import EmptyState from '../../components/shared/EmptyState';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';

const FILTERS = [
  { key: 'all',          label: 'All',          icon: 'apps-outline'         },
  { key: 'general',      label: 'General',      icon: 'information-circle-outline' },
  { key: 'health-alert', label: 'Health Alert', icon: 'warning-outline'      },
  { key: 'holiday',      label: 'Holiday',      icon: 'sunny-outline'        },
  { key: 'campaign',     label: 'Campaign',     icon: 'megaphone-outline'    },
];

const CATEGORY_ACCENT = {
  general:        '#2563EB',
  'health-alert': '#EF4444',
  holiday:        '#F97316',
  campaign:       '#7C3AED',
};

const AnnouncementFeedScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [activeFilter,  setActiveFilter]  = useState('all');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/announcements');
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load announcements. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAnnouncements(); }, [fetchAnnouncements]));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  /* Apply filter + search */
  useEffect(() => {
    let result = announcements;

    if (activeFilter !== 'all') {
      result = result.filter((a) => a.category?.toLowerCase() === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.content?.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, activeFilter, announcements]);

  /* Derived stats */
  const highPriorityCount = announcements.filter(
    (a) => a.priority?.toLowerCase() === 'high'
  ).length;

  const healthAlertCount = announcements.filter(
    (a) => a.category?.toLowerCase() === 'health-alert'
  ).length;

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ══════════════════════════════
          GRADIENT HEADER
      ══════════════════════════════ */}
      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#1E3A5F', '#1D4ED8', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Decorative circles */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.surface} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Announcements</Text>
            <View style={styles.topBarSpacer} />
          </View>

          {/* Stats banner */}
          <View style={styles.statsBanner}>
            <View style={styles.statBlock}>
              <Text style={styles.statBig}>{announcements.length}</Text>
              <Text style={styles.statSmall}>Total</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <View style={styles.statAlertRow}>
                <View style={styles.alertDot} />
                <Text style={styles.statBig}>{highPriorityCount}</Text>
              </View>
              <Text style={styles.statSmall}>High Priority</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={styles.statBig}>{healthAlertCount}</Text>
              <Text style={styles.statSmall}>Health Alerts</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search announcements..."
              placeholderTextColor={colors.textLight}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ══════════════════════════════
          FILTER CHIPS
      ══════════════════════════════ */}
      <Animated.View
        style={[styles.chipsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {FILTERS.map((f) => {
            const active      = activeFilter === f.key;
            const accentColor = CATEGORY_ACCENT[f.key] || colors.primary;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.chip,
                  active && { backgroundColor: accentColor + '18', borderColor: accentColor },
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? accentColor : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    active && { color: accentColor },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Results count */}
      {!error && (
        <Animated.View style={[styles.resultsRow, { opacity: fadeAnim }]}>
          <Text style={styles.resultsText}>
            {filtered.length} announcement{filtered.length !== 1 ? 's' : ''}
          </Text>
          {activeFilter !== 'all' && (
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
              <Text style={styles.clearFilter}>Clear filter</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {error ? (
        <View style={styles.errorWrap}><ErrorAlert message={error} /></View>
      ) : null}

      {/* ══════════════════════════════
          ANNOUNCEMENTS LIST
      ══════════════════════════════ */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AnnouncementCard
            announcement={item}
            onPress={() => navigation.navigate('AnnouncementDetail', { announcement: item })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAnnouncements(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              iconName="notifications-off-outline"
              title="No announcements"
              subtitle={
                search || activeFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Nothing to show right now'
              }
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  headerWrap: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -60, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  deco2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  deco3: {
    position: 'absolute', top: 40, left: '50%',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  screenTitle: {
    fontSize: 17, fontWeight: '700', color: colors.surface,
  },
  topBarSpacer: { width: 38 },

  /* Stats banner */
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FCA5A5',
  },
  statBig: {
    fontSize: 22, fontWeight: '800', color: colors.surface, letterSpacing: -0.5,
  },
  statSmall: {
    fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textAlign: 'center',
  },
  statSep: {
    width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.25)',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 14, height: 48, gap: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.text, padding: 0,
  },

  /* Chips */
  chipsRow: { paddingVertical: 12 },
  chipsScroll: { paddingHorizontal: 18, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 6,
  },
  resultsText: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
  },
  clearFilter: {
    fontSize: 12, fontWeight: '600', color: colors.primary,
  },

  errorWrap: { paddingHorizontal: 20, marginBottom: 8 },

  listContent: {
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 160 : 136,
  },
});

export default AnnouncementFeedScreen;
