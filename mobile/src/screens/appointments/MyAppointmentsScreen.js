import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';

const TAB_H = Platform.OS === 'ios' ? 88 : 64;

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
};

const FILTERS = [
  { key: 'all',       label: 'All'       },
  { key: 'upcoming',  label: 'Upcoming'  },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

/* ─── Appointment Card ─── */
const AppointmentCard = ({ item, onPress }) => {
  const cfg = STATUS_CFG[item.status] || STATUS_CFG.pending;
  const doctorName = item.doctorId?.name || 'Unknown Doctor';
  const serviceName = item.serviceId?.serviceName || 'General Consultation';
  const startTime = item.timeSlotId?.startTime || '';
  const initials = doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      {item.priorityFlag === 'red' && (
        <View style={styles.priorityFlag}>
          <Ionicons name="alert-circle" size={11} color="#FFF" />
          <Text style={styles.priorityText}>Priority</Text>
        </View>
      )}
      <View style={styles.cardRow}>
        {item.doctorId?.profileImage ? (
          <Image source={{ uri: item.doctorId.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.doctorName} numberOfLines={1}>
            {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
          </Text>
          <Text style={styles.serviceText} numberOfLines={1}>{serviceName}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={colors.textLight} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            {startTime ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="time-outline" size={11} color={colors.textLight} />
                <Text style={styles.metaText}>{startTime}</Text>
              </>
            ) : null}
          </View>
          {item.tokenNumber ? (
            <View style={styles.tokenRow}>
              <Ionicons name="ticket-outline" size={11} color={colors.accent} />
              <Text style={styles.tokenText}>Token #{item.tokenNumber}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ─── Screen ─── */
const MyAppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [filter, setFilter]             = useState('all');

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get('/api/appointments/my');
      setAppointments(res.data || []);
    } catch {
      // keep empty state on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const filtered = appointments.filter(a => {
    if (filter === 'all')      return true;
    if (filter === 'upcoming') return a.status === 'pending' || a.status === 'confirmed';
    return a.status === filter;
  });

  const counts = {
    all:       appointments.length,
    upcoming:  appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Appointments</Text>
          <Text style={styles.headerSub}>
            {appointments.length} total appointment{appointments.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('BookAppointment')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={colors.surface} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Filter Tabs ── */}
      <Animated.View style={{ opacity: fadeIn }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
              {counts[f.key] > 0 && (
                <View style={[styles.filterBadge, filter === f.key && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filter === f.key && styles.filterBadgeTextActive]}>
                    {counts[f.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── List ── */}
      <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAppointments(true); }}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
              subtitle={
                filter === 'all'
                  ? 'Tap + to book your first appointment'
                  : 'Try a different filter'
              }
            />
          }
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.surface },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },
  addBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Filters */
  filterScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: colors.accentFaded, borderColor: colors.accent },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterLabelActive: { color: colors.accent },
  filterBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: colors.accent },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  filterBadgeTextActive: { color: colors.surface },

  /* List */
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: TAB_H + 20 },
  listEmpty:   { flexGrow: 1, justifyContent: 'center' },

  /* Card */
  card: {
    backgroundColor: colors.surface, borderRadius: 18,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  priorityFlag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4,
  },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: colors.accentFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: colors.accent },
  cardBody: { flex: 1, gap: 3 },
  doctorName: { fontSize: 15, fontWeight: '700', color: colors.text },
  serviceText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  metaDot: { fontSize: 12, color: colors.disabled, marginHorizontal: 2 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  tokenText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  statusBadge: {
    alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 7,
    borderRadius: 11, minWidth: 72,
  },
  statusText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});

export default MyAppointmentsScreen;
