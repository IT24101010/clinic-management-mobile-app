import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────

const APPT_STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
};

const RISK_CFG = {
  Low:    { color: '#059669', bg: '#ECFDF5', icon: 'shield-checkmark-outline' },
  Medium: { color: '#F59E0B', bg: '#FFFBEB', icon: 'warning-outline' },
  High:   { color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle-outline' },
};

// ─── PatientRow ───────────────────────────────────────────────────────────────

const PatientRow = ({ appt, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: true }).start();

  const cfg = APPT_STATUS_CFG[appt.status] || APPT_STATUS_CFG.pending;
  const patientName = appt.patientId?.name || 'Patient';
  const riskLevel = appt.patientId?.riskLevel;
  const riskCfg = riskLevel ? RISK_CFG[riskLevel] : null;
  const serviceName = appt.serviceId?.serviceName || 'General';
  const isRed = appt.priorityFlag === 'red';

  return (
    <Animated.View style={[styles.patientRowWrap, { opacity: fadeAnim, transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={styles.patientRow}>
          {/* Token badge */}
          {appt.tokenNumber ? (
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenNum}>#{appt.tokenNumber}</Text>
            </View>
          ) : (
            <View style={styles.tokenBadgePlaceholder} />
          )}

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {appt.patientId?.profileImage ? (
              <Image source={{ uri: appt.patientId.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{patientName[0]?.toUpperCase() || 'P'}</Text>
              </View>
            )}
            {isRed && (
              <View style={styles.priorityDot}>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.patientInfo}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
              {riskCfg && riskLevel !== 'Low' && (
                <View style={[styles.riskPill, { backgroundColor: riskCfg.bg }]}>
                  <Text style={[styles.riskPillText, { color: riskCfg.color }]}>{riskLevel}</Text>
                </View>
              )}
            </View>
            <Text style={styles.serviceText} numberOfLines={1}>{serviceName}</Text>
          </View>

          {/* Status + chevron */}
          <View style={styles.patientRight}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textLight} style={{ marginTop: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── SlotPatientsSheet ────────────────────────────────────────────────────────

const SlotPatientsSheet = ({ navigation, route }) => {
  const { slot } = route.params;

  const [appointments, setAppointments] = useState(route.params.appointments || []);
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Open animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  // Refresh appointments when returning from AppointmentDetailScreen
  const refreshAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/appointments/doctor/my');
      const all = res.data || [];
      const slotId = slot._id;
      const filtered = all.filter(a => {
        const aSlotId = a.timeSlotId?._id || a.timeSlotId;
        return aSlotId === slotId;
      });
      setAppointments(filtered);
    } catch (err) {
      console.log('SlotPatientsSheet refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [slot._id]);

  useFocusEffect(useCallback(() => { refreshAppointments(); }, [refreshAppointments]));

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  };

  // Slot computed values
  const filledPct = slot.maxCapacity > 0
    ? Math.min((slot.currentBookings / slot.maxCapacity) * 100, 100)
    : 0;

  const activeAppts = appointments.filter(a => a.status !== 'cancelled');
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled');

  const pendingCount   = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  const renderHeader = () => (
    <>
      {/* ── Slot summary ── */}
      <View style={styles.slotSummary}>
        <View style={styles.slotTimeRow}>
          <View style={styles.slotTimeBlock}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.slotTime}>
              {slot.startTime} – {slot.endTime}
            </Text>
          </View>
          <Text style={styles.slotDate}>{formatDate(slot.date)}</Text>
        </View>

        {/* Capacity bar */}
        <View style={styles.capacityRow}>
          <View style={styles.capacityBarBg}>
            <View style={[styles.capacityBarFill, { width: `${filledPct}%` }]} />
          </View>
          <Text style={styles.capacityLabel}>
            {slot.currentBookings} / {slot.maxCapacity} slots filled
          </Text>
        </View>

        {/* Mini stat chips */}
        <View style={styles.miniStatsRow}>
          <View style={[styles.miniStat, { backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.miniStatVal, { color: '#F59E0B' }]}>{pendingCount}</Text>
            <Text style={[styles.miniStatLabel, { color: '#F59E0B' }]}>Pending</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.miniStatVal, { color: '#2563EB' }]}>{confirmedCount}</Text>
            <Text style={[styles.miniStatLabel, { color: '#2563EB' }]}>Confirmed</Text>
          </View>
          <View style={[styles.miniStat, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.miniStatVal, { color: '#059669' }]}>{completedCount}</Text>
            <Text style={[styles.miniStatLabel, { color: '#059669' }]}>Completed</Text>
          </View>
        </View>
      </View>

      {/* ── Section label ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          Patients ({activeAppts.length})
        </Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
    </>
  );

  const renderFooter = () => {
    if (cancelledAppts.length === 0) return <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />;
    return (
      <View style={styles.cancelledSection}>
        <Text style={styles.cancelledLabel}>Cancelled ({cancelledAppts.length})</Text>
        {cancelledAppts.map((appt, i) => (
          <PatientRow
            key={appt._id}
            appt={appt}
            index={i}
            onPress={() => navigation.navigate('DoctorAppointmentDetail', { appointment: appt })}
          />
        ))}
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Dim overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle + close */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {activeAppts.length === 0 && !loading ? (
          <>
            {renderHeader()}
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No patients booked</Text>
              <Text style={styles.emptySubtitle}>This time slot has no active bookings</Text>
            </View>
          </>
        ) : (
          <FlatList
            data={activeAppts}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            renderItem={({ item: appt, index }) => (
              <PatientRow
                appt={appt}
                index={index}
                onPress={() =>
                  navigation.navigate('DoctorAppointmentDetail', { appointment: appt })
                }
              />
            )}
          />
        )}
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  /* ── Overlay ── */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 20, 50, 0.65)',
  },
  overlayTouch: {
    flex: 1,
  },

  /* ── Sheet ── */
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
  },

  /* ── Slot Summary ── */
  slotSummary: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTime: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  slotDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  capacityRow: {
    gap: 6,
  },
  capacityBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  capacityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  miniStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ── Section ── */
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  /* ── Patient Row ── */
  patientRowWrap: {
    marginBottom: 8,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  tokenBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenNum: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  tokenBadgePlaceholder: {
    width: 32,
    height: 32,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarFallback: {
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  priorityDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  patientInfo: {
    flex: 1,
    gap: 3,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  riskPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  serviceText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  patientRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* ── Cancelled Section ── */
  cancelledSection: {
    marginTop: 16,
    gap: 8,
  },
  cancelledLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 2,
  },

  /* ── Empty State ── */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
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
    paddingHorizontal: 20,
  },
});

export default SlotPatientsSheet;
