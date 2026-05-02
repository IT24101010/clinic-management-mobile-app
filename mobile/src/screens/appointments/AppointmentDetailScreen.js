import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', icon: 'checkmark-circle-outline' },
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
};

/* ─── Info Row ─── */
const InfoRow = ({ icon, label, value, valueColor, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={14} color={colors.accent} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value || '—'}</Text>
    </View>
  </View>
);

/* ─── Screen ─── */
const AppointmentDetailScreen = ({ navigation, route }) => {
  const { appointment: initialAppt } = route.params;
  const [appointment, setAppointment] = useState(initialAppt);
  const [cancelling, setCancelling]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const cfg = STATUS_CFG[appointment.status] || STATUS_CFG.pending;
  const doctorName = appointment.doctorId?.name || 'Unknown Doctor';
  const serviceName = appointment.serviceId?.serviceName || 'General Consultation';
  const serviceCategory = appointment.serviceId?.category || '';
  const startTime = appointment.timeSlotId?.startTime || '';
  const endTime = appointment.timeSlotId?.endTime || '';
  const initials = doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    setShowConfirm(false);
    try {
      await api.put(`/api/appointments/${appointment._id}`, { status: 'cancelled' });
      setAppointment(prev => ({ ...prev, status: 'cancelled' }));
      setSuccess('Appointment cancelled successfully');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

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
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <View style={styles.statusPill}>
            <Ionicons name={cfg.icon} size={11} color={colors.surface} />
            <Text style={styles.statusPillText}>{cfg.label}</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {error   ? <ErrorAlert   message={error}   /> : null}
          {success ? <SuccessAlert message={success} /> : null}

          {/* ── Doctor Card ── */}
          <View style={styles.doctorCard}>
            <View style={styles.doctorAvatarWrap}>
              {appointment.doctorId?.profileImage ? (
                <Image source={{ uri: appointment.doctorId.profileImage }} style={styles.doctorAvatar} />
              ) : (
                <View style={[styles.doctorAvatar, styles.doctorAvatarFallback]}>
                  <Text style={styles.doctorInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorNameText}>
                {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
              </Text>
              <Text style={styles.serviceNameText}>{serviceName}</Text>
              {serviceCategory ? (
                <View style={styles.catPill}>
                  <Text style={styles.catPillText}>{serviceCategory}</Text>
                </View>
              ) : null}
            </View>
            {appointment.priorityFlag === 'red' && (
              <View style={styles.priorityBadge}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.priorityLabel}>Priority</Text>
              </View>
            )}
          </View>

          {/* ── Appointment Info ── */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Appointment Info</Text>
            </View>

            <InfoRow icon="calendar-outline" label="Date"    value={formatDate(appointment.date)} />
            <InfoRow
              icon="time-outline"
              label="Time"
              value={startTime && endTime ? `${startTime} – ${endTime}` : startTime || '—'}
            />
            {appointment.tokenNumber ? (
              <InfoRow
                icon="ticket-outline"
                label="Token Number"
                value={`#${appointment.tokenNumber}`}
                valueColor={colors.accent}
              />
            ) : null}
            <InfoRow icon="medical-outline" label="Service" value={serviceName} />
            <InfoRow
              icon="ellipse-outline"
              label="Status"
              value={cfg.label}
              valueColor={cfg.color}
              last
            />
          </View>

          {/* ── Notes ── */}
          {appointment.notes ? (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="document-text-outline" size={14} color={colors.accent} />
                </View>
                <Text style={styles.sectionTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}

          {/* ── Cancel Button ── */}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
              onPress={() => setShowConfirm(true)}
              disabled={cancelling}
              activeOpacity={0.85}
            >
              {cancelling ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={colors.danger}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel your appointment on ${formatDate(appointment.date)}? This action cannot be undone.`}
        onConfirm={handleCancel}
        onCancel={() => setShowConfirm(false)}
        confirmText="Yes, Cancel"
        confirmColor={colors.danger}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: colors.surface },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.surface },

  /* Scroll */
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  /* Doctor Card */
  doctorCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 18, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  doctorAvatarWrap: {},
  doctorAvatar: { width: 64, height: 64, borderRadius: 20 },
  doctorAvatarFallback: {
    backgroundColor: colors.accentFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  doctorInitials: { fontSize: 22, fontWeight: '800', color: colors.accent },
  doctorInfo: { flex: 1, gap: 4 },
  doctorNameText: { fontSize: 16, fontWeight: '700', color: colors.text },
  serviceNameText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 2,
  },
  catPillText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  priorityBadge: {
    alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#FEF2F2', borderRadius: 10,
  },
  priorityLabel: { fontSize: 10, fontWeight: '700', color: '#EF4444' },

  /* Info Card */
  card: {
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  /* Info Row */
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2,
  },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  /* Notes */
  notesText: {
    fontSize: 14, color: colors.textSecondary, lineHeight: 22,
    paddingBottom: 14,
  },

  /* Cancel Button */
  cancelBtn: {
    flexDirection: 'row', height: 52, borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5, borderColor: '#FCA5A5',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});

export default AppointmentDetailScreen;
