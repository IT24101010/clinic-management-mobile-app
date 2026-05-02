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
import ServiceCard from '../../components/services/ServiceCard';

const CATEGORY_ICONS = {
  Consultation: 'chatbubbles-outline',
  Laboratory:   'flask-outline',
  Dental:       'happy-outline',
  Radiology:    'scan-outline',
  Cardiology:   'heart-outline',
  Neurology:    'pulse-outline',
  Orthopedic:   'body-outline',
  Pediatrics:   'people-outline',
  default:      'medkit-outline',
};

const ServiceListScreen = ({ navigation }) => {
  const [services,      setServices]      = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [activeCat,     setActiveCat]     = useState('All');
  const [categories,    setCategories]    = useState(['All']);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchServices = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/services');
      const list = Array.isArray(data) ? data : [];
      setServices(list);
      const cats = ['All', ...new Set(list.map((s) => s.category).filter(Boolean))];
      setCategories(cats);
    } catch {
      setError('Failed to load services. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchServices(); }, [fetchServices])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, []);

  /* Filter by category + search */
  useEffect(() => {
    let result = services;
    if (activeCat !== 'All') result = result.filter((s) => s.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.serviceName?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeCat, services]);

  const handleServicePress = (service) => {
    navigation.navigate('ServiceDetail', { service });
  };

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
          {/* Decorative shapes */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.headerTitle}>Our Services</Text>
              <Text style={styles.headerSubtitle}>
                {filtered.length} service{filtered.length !== 1 ? 's' : ''} available
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="grid" size={24} color="rgba(255,255,255,0.85)" />
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
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
          CATEGORY CHIPS
      ══════════════════════════════ */}
      <Animated.View
        style={[styles.chipsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {categories.map((cat) => {
            const icon   = CATEGORY_ICONS[cat] || CATEGORY_ICONS.default;
            const active = activeCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveCat(cat)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={icon}
                  size={13}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {error ? (
        <View style={styles.errorWrap}><ErrorAlert message={error} /></View>
      ) : null}

      {/* ══════════════════════════════
          RESULTS COUNT
      ══════════════════════════════ */}
      {!error && (
        <Animated.View style={[styles.resultsRow, { opacity: fadeAnim }]}>
          <Text style={styles.resultsText}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </Text>
          {activeCat !== 'All' && (
            <TouchableOpacity onPress={() => setActiveCat('All')} style={styles.clearFilter}>
              <Text style={styles.clearFilterText}>Clear</Text>
              <Ionicons name="close" size={12} color={colors.accent} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ══════════════════════════════
          SERVICE GRID
      ══════════════════════════════ */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        numColumns={2}
        renderItem={({ item, index }) => (
          <ServiceCard
            service={item}
            onPress={handleServicePress}
            index={index}
          />
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchServices(); }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                iconName="grid-outline"
                title="No services found"
                subtitle={
                  search || activeCat !== 'All'
                    ? 'Try adjusting your search or category filter'
                    : 'No services are available right now'
                }
              />
            </View>
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
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 58,
    paddingBottom: 24,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute',
    bottom: 0,
    right: 80,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deco3: {
    position: 'absolute',
    top: 20,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 3,
    fontWeight: '500',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },

  /* ── Chips ── */
  chipsSection: {
    paddingVertical: 14,
  },
  chipsScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentFaded,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },

  /* ── Results row ── */
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },

  errorWrap: {
    paddingHorizontal: 18,
    marginBottom: 8,
  },

  /* ── Grid ── */
  row: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 170 : 148,
  },
  emptyWrap: {
    flex: 1,
    paddingTop: 40,
  },
});

export default ServiceListScreen;
