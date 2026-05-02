import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const StatChip = ({ label, value, valueColor, chipBg }) => (
  <View style={[styles.statChip, { backgroundColor: chipBg }]}>
    <Text style={[styles.statChipValue, { color: valueColor }]}>{value}</Text>
    <Text style={styles.statChipLabel}>{label}</Text>
  </View>
);

const NextApptCard = ({ appt, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const patientName = appt.patientId?.name || 'Patient';
  const startTime = appt.timeSlotId?.startTime || '';
  const endTime = appt.timeSlotId?.endTime || '';
  const serviceName = appt.serviceId?.serviceName || 'General Consultation';
  const isRed = appt.priorityFlag === 'red';
  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.nextCardWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <LinearGradient
          colors={['#1D4ED8', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nextCard}
        >
          <View style={styles.nextTopRow}>
            <View style={styles.patientAvatarContainer}>
              {appt.patientId?.profileImage ? (
                <Image source={{ uri: appt.patientId.profileImage }} style={styles.patientAvatar} />
              ) : (
                <View style={styles.patientAvatarFallback}>
                  <Text style={styles.patientInitial}>{patientName[0]?.toUpperCase() || 'P'}</Text>
                </View>
              )}
            </View>
            <View style={styles.nextPatientInfo}>
              <Text style={styles.nextPatientName} numberOfLines={1}>{patientName}</Text>
              <Text style={styles.nextServiceName} numberOfLines={1}>{serviceName}</Text>
            </View>
            <View style={styles.nextStatusBadge}>
              <Ionicons name={cfg.icon} size={11} color="#fff" />
              <Text style={styles.nextStatusText}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.nextDivider} />

          <View style={styles.nextMetaRow}>
            <View style={styles.nextMetaItem}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.nextMetaText}>{formatDate(appt.date)}</Text>
            </View>
            {startTime ? (
              <View style={styles.nextMetaItem}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.nextMetaText}>{startTime}{endTime ? ` – ${endTime}` : ''}</Text>
              </View>
            ) : null}
            {appt.tokenNumber ? (
              <View style={styles.nextMetaItem}>
                <Ionicons name="ticket-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={styles.nextMetaText}>#{appt.tokenNumber}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.nextBottomRow}>
            {isRed ? (
              <View style={styles.priorityFlag}>
                <Ionicons name="alert-circle" size={13} color="#FCA5A5" />
                <Text style={styles.priorityFlagText}>High Risk Patient</Text>
              </View>
            ) : <View />}
            <TouchableOpacity style={styles.viewDetailsBtn} onPress={onPress}>
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ApptCard = ({ appt, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: (index % 8) * 70,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: true }).start();

  const cfg = STATUS_CFG[appt.status] || STATUS_CFG.pending;
  const patientName = appt.patientId?.name || 'Patient';
  const startTime = appt.timeSlotId?.startTime || '—';
  const serviceName = appt.serviceId?.serviceName || 'General';
  const isRed = appt.priorityFlag === 'red';

  return (
    <Animated.View style={[styles.apptCardWrap, { opacity: fadeAnim, transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={styles.apptCard}>
          <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />

          <View style={styles.apptAvatarWrap}>
            {appt.patientId?.profileImage ? (
              <Image source={{ uri: appt.patientId.profileImage }} style={styles.apptAvatar} />
            ) : (
              <View style={[styles.apptAvatar, styles.apptAvatarFallback]}>
                <Text style={styles.apptAvatarInitial}>{patientName[0]?.toUpperCase() || 'P'}</Text>
              </View>
            )}
          </View>

          <View style={styles.apptInfo}>
            <Text style={styles.apptPatientName} numberOfLines={1}>{patientName}</Text>
            <Text style={styles.apptService} numberOfLines={1}>{serviceName}</Text>
            <View style={styles.apptTimeRow}>
              <Ionicons name="time-outline" size={11} color={colors.textLight} />
              <Text style={styles.apptTime}>{startTime}</Text>
              {appt.tokenNumber ? (
                <View style={styles.tokenPill}>
                  <Text style={styles.tokenText}>#{appt.tokenNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.apptRight}>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {isRed && (
              <View style={styles.redFlag}>
                <Ionicons name="alert-circle" size={15} color={colors.danger} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.get('/api/appointments/doctor/my');
      const today = todayDateStr();
      const todayAppts = (res.data || []).filter(a => {
        const d = new Date(a.date);
        const aStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return aStr === today;
      });
      todayAppts.sort((a, b) =>
        (a.timeSlotId?.startTime || '').localeCompare(b.timeSlotId?.startTime || '')
      );
      setAppointments(todayAppts);
    } catch (err) {
      console.log('Doctor HomeScreen fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchToday(); }, [fetchToday]));

  const onRefresh = () => { setRefreshing(true); fetchToday(); };

  if (loading) return <LoadingSpinner />;

  const total = appointments.length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const nextAppt = appointments.find(a => a.status === 'pending' || a.status === 'confirmed');
  const firstName = user?.name?.split(' ')[0] || 'Doctor';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgba(255,255,255,0.8)"
          />
        }
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#1E3A5F', '#1D4ED8', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.doctorNameText}>Dr. {user?.name || 'Doctor'}</Text>
              <View style={styles.todayPill}>
                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.todayLabel}>{todayLabel}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.85}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase() || 'D'}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatChip label="Total" value={total} valueColor="#fff" chipBg="rgba(255,255,255,0.15)" />
            <StatChip label="Pending" value={pending} valueColor="#FCD34D" chipBg="rgba(252,211,77,0.15)" />
            <StatChip label="Confirmed" value={confirmed} valueColor="#6EE7B7" chipBg="rgba(110,231,183,0.15)" />
            <StatChip label="Done" value={completed} valueColor="#BAE6FD" chipBg="rgba(186,230,253,0.15)" />
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* ── Next Appointment ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Appointment</Text>
          </View>

          {nextAppt ? (
            <NextApptCard
              appt={nextAppt}
              onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment: nextAppt })}
            />
          ) : (
            <View style={styles.emptyNextCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="checkmark-circle-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No pending appointments for today</Text>
            </View>
          )}

          {/* ── Today's Schedule ── */}
          {appointments.length > 0 && (
            <>
              <View style={[styles.sectionHeader, styles.sectionRow]}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ScheduleTab')}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>

              {appointments.slice(0, 5).map((appt, index) => (
                <ApptCard
                  key={appt._id}
                  appt={appt}
                  index={index}
                  onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment: appt })}
                />
              ))}
            </>
          )}

          {appointments.length === 0 && (
            <View style={styles.noApptWrap}>
              <Ionicons name="sunny-outline" size={40} color={colors.textLight} />
              <Text style={styles.noApptTitle}>No appointments today</Text>
              <Text style={styles.noApptSub}>Check your full schedule for upcoming days</Text>
            </View>
          )}

          <View style={{ height: Platform.OS === 'ios' ? 100 : 76 }} />
        </Animated.View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greetingLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  doctorNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  todayLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  avatarBtn: {
    position: 'relative',
    marginLeft: 12,
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: '#2563EB',
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  statChipValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statChipLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ── Section Headers ── */
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.1,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  /* ── Next Appointment Card ── */
  nextCardWrap: {
    marginHorizontal: 20,
    borderRadius: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  nextCard: {
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  nextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatarContainer: {},
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  patientAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  patientInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  nextPatientInfo: {
    flex: 1,
    gap: 3,
  },
  nextPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  nextServiceName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  nextStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  nextStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  nextDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  nextMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nextMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  nextBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  priorityFlagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ── Empty Next Card ── */
  emptyNextCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* ── Appointment List Cards ── */
  apptCardWrap: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  apptCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  apptAvatarWrap: {
    padding: 14,
    paddingRight: 12,
  },
  apptAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  apptAvatarFallback: {
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apptAvatarInitial: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  apptInfo: {
    flex: 1,
    paddingVertical: 14,
    gap: 3,
  },
  apptPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  apptService: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  apptTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  apptTime: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
  },
  tokenPill: {
    backgroundColor: colors.primaryFaded,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tokenText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  apptRight: {
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    gap: 6,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  redFlag: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── No Appointments ── */
  noApptWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noApptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  noApptSub: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default HomeScreen;
