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
import FeedbackCard from '../../components/feedback/FeedbackCard';
import StarRating from '../../components/feedback/StarRating';

const FILTERS = [
  { key: 'all',      label: 'All Reviews',  icon: 'list-outline'    },
  { key: 'doctors',  label: 'Doctors',      icon: 'medical-outline' },
  { key: 'services', label: 'Services',     icon: 'grid-outline'    },
];

const FeedbackListScreen = ({ navigation }) => {
  const [feedback,   setFeedback]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchFeedback = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/feedback');
      setFeedback(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load reviews. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchFeedback(); }, [fetchFeedback]));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  /* Apply filter + search */
  useEffect(() => {
    let result = feedback;

    if (activeFilter === 'doctors')  result = result.filter((f) => f.doctorId);
    if (activeFilter === 'services') result = result.filter((f) => f.serviceId);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.patientId?.name?.toLowerCase().includes(q) ||
          f.doctorId?.name?.toLowerCase().includes(q)  ||
          f.serviceId?.serviceName?.toLowerCase().includes(q) ||
          f.comment?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeFilter, feedback]);

  /* Derived stats */
  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length)
      : 0;

  const fiveStarCount = feedback.filter((f) => f.rating === 5).length;

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ══════════════════════════════
          GRADIENT HEADER
      ══════════════════════════════ */}
      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.deco1} />
          <View style={styles.deco2} />

          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.surface} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Patient Reviews</Text>
            <View style={styles.topBarSpacer} />
          </View>

          {/* Stats banner */}
          <View style={styles.statsBanner}>
            <View style={styles.statBlock}>
              <Text style={styles.statBig}>{avgRating.toFixed(1)}</Text>
              <StarRating rating={avgRating} size={14} color="rgba(255,255,255,0.95)" />
              <Text style={styles.statSmall}>Average Rating</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={styles.statBig}>{feedback.length}</Text>
              <Text style={styles.statSmall}>Total Reviews</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={styles.statBig}>{fiveStarCount}</Text>
              <Text style={styles.statSmall}>★ 5-Star Reviews</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reviews, doctors..."
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
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
            {filtered.length} review{filtered.length !== 1 ? 's' : ''}
          </Text>
        </Animated.View>
      )}

      {error ? (
        <View style={styles.errorWrap}><ErrorAlert message={error} /></View>
      ) : null}

      {/* ══════════════════════════════
          FEEDBACK LIST
      ══════════════════════════════ */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <FeedbackCard feedback={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchFeedback(); }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              iconName="chatbubbles-outline"
              title="No reviews yet"
              subtitle={
                search || activeFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Be the first to share your experience!'
              }
            />
          ) : null
        }
      />

      {/* ══════════════════════════════
          WRITE REVIEW FAB
      ══════════════════════════════ */}
      <Animated.View style={[styles.fabWrap, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('SubmitFeedback')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabGradient}
          >
            <Ionicons name="create-outline" size={20} color={colors.surface} />
            <Text style={styles.fabText}>Write a Review</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  deco2: {
    position: 'absolute', bottom: 0, left: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  screenTitle: {
    fontSize: 17, fontWeight: '700', color: colors.surface,
  },
  topBarSpacer: { width: 38 },

  /* Stats banner */
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
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
  statBig: {
    fontSize: 22, fontWeight: '800', color: colors.surface, letterSpacing: -0.5,
  },
  statSmall: {
    fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center',
  },
  statSep: {
    width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)',
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
  chipActive: { backgroundColor: colors.accentFaded, borderColor: colors.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.accent },

  resultsRow: {
    paddingHorizontal: 22, marginBottom: 6,
  },
  resultsText: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
  },

  errorWrap: { paddingHorizontal: 20, marginBottom: 8 },

  listContent: {
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 180 : 156,
  },

  /* FAB */
  fabWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 80,
    left: 20, right: 20,
  },
  fab: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 14, elevation: 8,
  },
  fabGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 16, gap: 10,
  },
  fabText: {
    fontSize: 15, fontWeight: '700', color: colors.surface, letterSpacing: 0.2,
  },
});

export default FeedbackListScreen;
