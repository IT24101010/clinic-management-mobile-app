import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const STATUS_CFG = {
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

const InfoRow = ({ icon, label, value, valueColor, last }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={14} color={colors.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value || '—'}</Text>
    </View>
  </View>
);

const DoctorAppointmentDetailScreen = ({ navigation, route }) => {
  const { appointment: initialAppt } = route.params;
  const [appointment, setAppointment] = useState(initialAppt);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    setError('');
    setConfirmAction(null);
    try {
      await api.put(`/api/appointments/${appointment._id}/status`, { status: newStatus });
      setAppointment(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const cfg = STATUS_CFG[appointment.status] || STATUS_CFG.pending;
  const patientName = appointment.patientId?.name || 'Patient';
  const patientPhone = appointment.patientId?.phone || null;
  const patientEmail = appointment.patientId?.email || null;
  const patientRisk = appointment.patientId?.riskLevel;
  const riskCfg = patientRisk ? RISK_CFG[patientRisk] : null;
  const serviceName = appointment.serviceId?.serviceName || 'General Consultation';
  const startTime = appointment.timeSlotId?.startTime || '';
  const endTime = appointment.timeSlotId?.endTime || '';
  const isRed = appointment.priorityFlag === 'red';
  const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const canConfirm = appointment.status === 'pending';
  const canComplete = appointment.status === 'confirmed';

  const bloodReports = appointment.patientId?.bloodReports || [];

  const openReport = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      // silently fail — URL wasn't openable
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Dim Overlay ── */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.sheetContent}
        >
          {/* ── Patient Card ── */}
          <View style={styles.patientCard}>
            <View style={styles.patientAvatarWrap}>
              {appointment.patientId?.profileImage ? (
                <Image source={{ uri: appointment.patientId.profileImage }} style={styles.patientAvatar} />
              ) : (
                <View style={[styles.patientAvatar, styles.patientAvatarFallback]}>
                  <Text style={styles.patientInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patientName}</Text>
              {patientPhone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={12} color={colors.textLight} />
                  <Text style={styles.contactText}>{patientPhone}</Text>
                </View>
              )}
              {patientEmail && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={12} color={colors.textLight} />
                  <Text style={styles.contactText} numberOfLines={1}>{patientEmail}</Text>
                </View>
              )}
            </View>
            <View style={styles.patientRight}>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              {isRed && (
                <View style={styles.priorityBadge}>
                  <Ionicons name="alert-circle" size={11} color="#EF4444" />
                  <Text style={styles.priorityBadgeText}>Priority</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Risk Level ── */}
          {riskCfg && (
            <View style={[styles.riskBanner, { backgroundColor: riskCfg.bg }]}>
              <View style={styles.riskLeft}>
                <Ionicons name={riskCfg.icon} size={16} color={riskCfg.color} />
                <Text style={[styles.riskText, { color: riskCfg.color }]}>
                  Patient Risk Level: {patientRisk}
                </Text>
              </View>
              {patientRisk === 'High' && (
                <Text style={styles.riskNote}>Requires extra attention</Text>
              )}
            </View>
          )}

          {/* ── Error banner ── */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Appointment Details ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Appointment Details</Text>
            </View>

            <InfoRow icon="calendar-outline" label="Date" value={formatDate(appointment.date)} />
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
                valueColor={colors.primary}
              />
            ) : null}
            <InfoRow
              icon="medical-outline"
              label="Service"
              value={serviceName}
            />
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
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Doctor's Notes</Text>
              </View>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}

          {/* ── Blood Reports ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="document-attach-outline" size={14} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Blood Reports</Text>
              <View style={styles.reportCountBadge}>
                <Text style={styles.reportCountText}>{bloodReports.length}</Text>
              </View>
            </View>

            {bloodReports.length === 0 ? (
              <View style={styles.reportsEmpty}>
                <Ionicons name="folder-open-outline" size={22} color={colors.textLight} />
                <Text style={styles.reportsEmptyText}>No blood reports uploaded</Text>
              </View>
            ) : (
              bloodReports.map((report, i) => (
                <View
                  key={report._id || i}
                  style={[styles.reportRow, i < bloodReports.length - 1 && styles.reportRowBorder]}
                >
                  <View style={styles.reportIconWrap}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName} numberOfLines={1}>
                      {report.fileName || `Report ${i + 1}`}
                    </Text>
                    <Text style={styles.reportDate}>
                      {report.uploadDate ? formatDate(report.uploadDate) : '—'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => openReport(report.fileUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="open-outline" size={13} color={colors.primary} />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* ── Action Buttons ── */}
          {(canConfirm || canComplete) && (
            <View style={styles.actionsRow}>
              {canConfirm && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn, updating && styles.btnDisabled]}
                  onPress={() => setConfirmAction('confirmed')}
                  disabled={updating}
                  activeOpacity={0.85}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Confirm</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {canComplete && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn, updating && styles.btnDisabled]}
                  onPress={() => setConfirmAction('completed')}
                  disabled={updating}
                  activeOpacity={0.85}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Mark as Done</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>
      </Animated.View>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        visible={!!confirmAction}
        title={confirmAction === 'confirmed' ? 'Confirm Appointment' : 'Complete Appointment'}
        message={
          confirmAction === 'confirmed'
            ? `Confirm appointment for ${patientName}?`
            : `Mark this appointment as completed for ${patientName}?`
        }
        onConfirm={() => handleStatusUpdate(confirmAction)}
        onCancel={() => setConfirmAction(null)}
        confirmText={confirmAction === 'confirmed' ? 'Confirm' : 'Mark Done'}
        confirmColor={confirmAction === 'confirmed' ? colors.primary : colors.accent}
      />
    </View>
  );
};

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
    paddingBottom: 4,
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
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90,
  },

  /* ── Patient Card ── */
  patientCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  patientAvatarWrap: {},
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  patientAvatarFallback: {
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  patientRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },

  /* ── Risk Banner ── */
  riskBanner: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '700',
  },
  riskNote: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  /* ── Error Banner ── */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },

  /* ── Info Card ── */
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  /* ── Info Row ── */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  /* ── Notes ── */
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingBottom: 12,
  },

  /* ── Blood Reports ── */
  reportCountBadge: {
    marginLeft: 6,
    backgroundColor: colors.primaryFaded,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reportCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  reportsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  reportsEmptyText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  reportRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  reportIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
    gap: 2,
  },
  reportName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reportDate: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFaded,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ── Actions ── */
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  completeBtn: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default DoctorAppointmentDetailScreen;
