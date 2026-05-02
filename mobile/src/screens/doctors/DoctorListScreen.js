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
import DoctorCard from '../../components/doctors/DoctorCard';

const DoctorListScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeSpec, setActiveSpec] = useState('All');
  const [specializations, setSpecializations] = useState(['All']);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchDoctors = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/doctors');
      const list = Array.isArray(data) ? data : [];
      setDoctors(list);
      const specs = ['All', ...new Set(list.map((d) => d.specialization).filter(Boolean))];
      setSpecializations(specs);
    } catch {
      setError('Failed to load doctors. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDoctors();
    }, [fetchDoctors])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  /* Filter whenever search query or active specialization changes */
  useEffect(() => {
    let result = doctors;
    if (activeSpec !== 'All') {
      result = result.filter((d) => d.specialization === activeSpec);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.userId?.name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeSpec, doctors]);

  const handleDoctorPress = (doctor) => {
    navigation.navigate('DoctorDetail', { doctor });
  };

  if (loading) return <LoadingSpinner />;

  const availableCount = filtered.filter((d) => d.isAvailable).length;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Gradient Header ── */}
      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Decorative circles */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Find a Doctor</Text>
              <Text style={styles.headerSubtitle}>
                {availableCount} specialist{availableCount !== 1 ? 's' : ''} available now
              </Text>
            </View>
            <View style={styles.headerIconBox}>
              <Ionicons name="medical" size={26} color="rgba(255,255,255,0.85)" />
            </View>
          </View>

          {/* Search bar inside gradient */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search doctors, specializations..."
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

      {/* ── Specialization Filter Chips ── */}
      <Animated.View
        style={[styles.chipsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec}
              style={[styles.chip, activeSpec === spec && styles.chipActive]}
              onPress={() => setActiveSpec(spec)}
              activeOpacity={0.7}
            >
              {activeSpec === spec && (
                <Ionicons name="checkmark" size={12} color={colors.accent} style={styles.chipCheck} />
              )}
              <Text style={[styles.chipText, activeSpec === spec && styles.chipTextActive]}>
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {error ? (
        <View style={styles.errorWrap}>
          <ErrorAlert message={error} />
        </View>
      ) : null}

      {/* ── Results count ── */}
      {!error && (
        <Animated.View style={[styles.resultsRow, { opacity: fadeAnim }]}>
          <Text style={styles.resultsText}>
            {filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found
          </Text>
          {activeSpec !== 'All' && (
            <TouchableOpacity onPress={() => setActiveSpec('All')} style={styles.clearFilter}>
              <Text style={styles.clearFilterText}>Clear filter</Text>
              <Ionicons name="close" size={12} color={colors.accent} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── Doctor List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <DoctorCard doctor={item} onPress={handleDoctorPress} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDoctors();
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              iconName="medkit-outline"
              title="No doctors found"
              subtitle={
                search || activeSpec !== 'All'
                  ? 'Try adjusting your search or filters'
                  : 'No doctors are available right now'
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
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 58,
    paddingBottom: 24,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: 8,
    right: 90,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
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
  headerIconBox: {
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
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.accentFaded,
    borderColor: colors.accent,
  },
  chipCheck: {
    marginRight: 1,
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
    paddingHorizontal: 22,
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
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  listContent: {
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 170 : 148,
  },
});

export default DoctorListScreen;
