import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';

/* ─── Helpers ─── */
const ROLE_CONFIG = {
  patient: { color: colors.accent,   bg: colors.accentFaded, label: 'Patient' },
  doctor:  { color: colors.primary,  bg: colors.primaryFaded, label: 'Doctor'  },
  admin:   { color: '#4F46E5',       bg: '#EEF2FF',           label: 'Admin'   },
};

const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.patient;

/* ─── Stat Card ─── */
const StatCard = ({ label, value, color, bg, icon }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ─── Filter Chip ─── */
const FilterChip = ({ label, count, active, onPress, color }) => (
  <TouchableOpacity
    style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    {count !== undefined && (
      <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
        <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

/* ─── User Card ─── */
const UserCard = ({ item, onPress }) => {
  const cfg = getRoleConfig(item.role);
  const initial = item.name?.charAt(0).toUpperCase() || '?';

  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[styles.avatarWrap, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
        <Text style={[styles.avatarInitial, { color: cfg.color }]}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.name || 'Unknown'}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive !== false ? colors.accent : colors.danger }]} />
          <Text style={styles.statusText}>{item.isActive !== false ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      {/* Role badge + chevron */}
      <View style={styles.cardRight}>
        <View style={[styles.roleBadge, { backgroundColor: cfg.color }]}>
          <Text style={styles.roleBadgeText}>{cfg.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );
};

/* ─── Main Screen ─── */
const UsersScreen = ({ navigation }) => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/users', {
        params: { search, role: filterRole, limit: 100 },
      });
      setUsers(res.data?.users || []);
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      console.log('Error fetching users:', err);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 400);
    return () => clearTimeout(t);
  }, [search, filterRole, fetchUsers]);

  /* ── Counts ── */
  const counts = useMemo(() => ({
    all:     users.length,
    patient: users.filter(u => u.role === 'patient').length,
    doctor:  users.filter(u => u.role === 'doctor').length,
    admin:   users.filter(u => u.role === 'admin').length,
  }), [users]);

  const FILTERS = [
    { label: 'All',      value: '',        count: counts.all,     color: '#4F46E5' },
    { label: 'Patients', value: 'patient', count: counts.patient, color: colors.accent  },
    { label: 'Doctors',  value: 'doctor',  count: counts.doctor,  color: colors.primary },
    { label: 'Admins',   value: 'admin',   count: counts.admin,   color: '#4F46E5' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#4F46E5', '#6366F1', '#818CF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>Admin Panel</Text>
            <Text style={styles.headerTitle}>User Management</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Ionicons name="people" size={22} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </LinearGradient>

      {/* ── Stats Strip (floats over header) ── */}
      <Animated.View style={[styles.statsStrip, { opacity: fadeIn }]}>
        <StatCard label="Patients" value={counts.patient} color={colors.accent}  bg={colors.accentFaded}  icon="person-outline" />
        <StatCard label="Doctors"  value={counts.doctor}  color={colors.primary} bg={colors.primaryFaded} icon="medkit-outline" />
        <StatCard label="Admins"   value={counts.admin}   color="#4F46E5"        bg="#EEF2FF"             icon="shield-outline" />
      </Animated.View>

      {/* ── Search Bar ── */}
      <View style={styles.searchSection}>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? '#4F46E5' : colors.textLight}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Filter Chips ── */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              count={f.count}
              active={filterRole === f.value}
              onPress={() => setFilterRole(f.value)}
              color={f.color}
            />
          ))}
        </View>
      </View>

      {/* ── Results label ── */}
      {!loading && (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {users.length} {users.length === 1 ? 'user' : 'users'} found
          </Text>
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <UserCard
              item={item}
              onPress={() => navigation.navigate('UserDetail', { userId: item._id, user: item })}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            users.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsers(true)}
              tintColor="#4F46E5"
              colors={['#4F46E5']}
            />
          }
          style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={40} color="#A5B4FC" />
              </View>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? `No results for "${search}"` : 'Try a different filter'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 52,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: 0.2,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Stats Strip ── */
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -28,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ── Search ── */
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  searchWrapFocused: {
    borderColor: '#4F46E5',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },

  /* ── Filters ── */
  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipBadgeTextActive: {
    color: colors.surface,
  },

  /* ── Results ── */
  resultsRow: {
    paddingHorizontal: 22,
    marginBottom: 8,
    marginTop: 4,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  /* ── User Card ── */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Loading / Empty ── */
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default UsersScreen;
