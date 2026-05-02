import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const TOTAL_STEPS = 4;

const STEP_META = [
  { icon: 'person-outline',    label: 'Doctor'  },
  { icon: 'calendar-outline',  label: 'Date'    },
  { icon: 'grid-outline',      label: 'Service' },
  { icon: 'checkmark-outline', label: 'Review'  },
];

const CATEGORY_META = {
  Consultation: { icon: 'chatbubbles-outline', color: '#059669', bg: '#ECFDF5' },
  Laboratory:   { icon: 'flask-outline',       color: '#7C3AED', bg: '#F5F3FF' },
  Dental:       { icon: 'happy-outline',       color: '#EC4899', bg: '#FDF2F8' },
  Radiology:    { icon: 'scan-outline',        color: '#F59E0B', bg: '#FFFBEB' },
  Cardiology:   { icon: 'heart-outline',       color: '#EF4444', bg: '#FEF2F2' },
  Neurology:    { icon: 'pulse-outline',       color: '#3B82F6', bg: '#EFF6FF' },
  Orthopedic:   { icon: 'body-outline',        color: '#14B8A6', bg: '#F0FDFA' },
  Pediatrics:   { icon: 'people-outline',      color: '#F97316', bg: '#FFF7ED' },
  default:      { icon: 'medkit-outline',      color: '#059669', bg: '#ECFDF5' },
};
const getCatMeta = cat => CATEGORY_META[cat] || CATEGORY_META.default;

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getUpcomingDates = (n = 14) => {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const toISO = (d) => {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const upcomingDates = getUpcomingDates(14);

/* ─── Step Indicator ─── */
const StepIndicator = ({ step }) => (
  <View style={styles.stepRow}>
    {STEP_META.map((s, i) => {
      const n      = i + 1;
      const done   = n < step;
      const active = n === step;
      return (
        <React.Fragment key={n}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
              {done ? (
                <Ionicons name="checkmark" size={13} color={colors.surface} />
              ) : (
                <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{n}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{s.label}</Text>
          </View>
          {i < STEP_META.length - 1 && (
            <View style={[styles.stepLine, done && styles.stepLineDone]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

/* ─── Screen ─── */
const BookAppointmentScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);

  /* Data */
  const [doctors,  setDoctors]  = useState([]);
  const [services, setServices] = useState([]);
  const [slots,    setSlots]    = useState([]);

  /* Selections */
  const [selectedDoctor,  setSelectedDoctor]  = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate,    setSelectedDate]    = useState(null);
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [notes, setNotes] = useState('');

  /* UI */
  const [search,          setSearch]          = useState('');
  const [loadingDoctors,  setLoadingDoctors]  = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [booking,  setBooking]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const fadeIn = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  /* Fetch doctors on mount */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/doctors');
        setDoctors(res.data || []);
      } catch {
        setError('Failed to load doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };
    load();
  }, []);

  /* Fetch services when step 3 opens */
  useEffect(() => {
    if (step !== 3 || services.length > 0) return;
    const load = async () => {
      setLoadingServices(true);
      try {
        const res = await api.get('/api/services');
        setServices(res.data || []);
      } catch {
        setError('Failed to load services');
      } finally {
        setLoadingServices(false);
      }
    };
    load();
  }, [step]);

  const fetchSlots = useCallback(async (iso) => {
    if (!selectedDoctor) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const doctorUserId = selectedDoctor.userId?._id;
      const res = await api.get(`/api/timeslots?date=${iso}&doctorId=${doctorUserId}`);
      setSlots(res.data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor]);

  const handleDateSelect = (d) => {
    const iso = toISO(d);
    setSelectedDate(iso);
    fetchSlots(iso);
  };

  const animateTransition = (dir) => {
    slideX.setValue(dir * 40);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    setError('');
    if (step === 1 && !selectedDoctor)  { setError('Please select a doctor to continue');        return; }
    if (step === 2 && !selectedDate)    { setError('Please select a date to continue');          return; }
    if (step === 2 && !selectedSlot)    { setError('Please select a time slot to continue');     return; }
    // step 3 (service) is optional — no validation
    animateTransition(1);
    setStep(s => s + 1);
  };

  const goBack = () => {
    setError('');
    if (step === 1) { navigation.goBack(); return; }
    animateTransition(-1);
    setStep(s => s - 1);
  };

  const handleBook = async () => {
    setBooking(true);
    setError('');
    try {
      await api.post('/api/appointments', {
        doctorId:   selectedDoctor.userId?._id,
        date:       selectedDate,
        timeSlotId: selectedSlot._id,
        ...(selectedService && { serviceId: selectedService._id }),
        notes:      notes.trim() || undefined,
      });
      setSuccess('Appointment booked successfully!');
      setTimeout(() => navigation.goBack(), 1600);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    const q    = search.toLowerCase();
    const name = (doc.userId?.name || '').toLowerCase();
    const spec = (doc.specialization || '').toLowerCase();
    return name.includes(q) || spec.includes(q);
  });

  /* ── Step 1: Doctor Selection ── */
  const renderStep1 = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or specialization..."
          placeholderTextColor={colors.disabled}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loadingDoctors ? (
        <LoadingSpinner />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
          {filteredDoctors.map(doc => {
            const name       = doc.userId?.name || 'Unknown';
            const initials   = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isSelected = selectedDoctor?._id === doc._id;
            return (
              <TouchableOpacity
                key={doc._id}
                style={[styles.doctorOption, isSelected && styles.doctorOptionSelected]}
                onPress={() => setSelectedDoctor(doc)}
                activeOpacity={0.82}
              >
                {doc.userId?.profileImage ? (
                  <Image source={{ uri: doc.userId.profileImage }} style={styles.docAvatar} />
                ) : (
                  <View style={[styles.docAvatar, styles.docAvatarFallback]}>
                    <Text style={styles.docInitials}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.docName}>
                    {name.startsWith('Dr.') ? name : `Dr. ${name}`}
                  </Text>
                  <Text style={styles.docSpec}>{doc.specialization || 'General Practice'}</Text>
                  <View style={styles.docMeta}>
                    {doc.experience ? (
                      <View style={styles.docMetaItem}>
                        <Ionicons name="time-outline" size={11} color={colors.textLight} />
                        <Text style={styles.docMetaText}>{doc.experience}y exp</Text>
                      </View>
                    ) : null}
                    {doc.consultationFee ? (
                      <View style={styles.docMetaItem}>
                        <Ionicons name="cash-outline" size={11} color={colors.textLight} />
                        <Text style={styles.docMetaText}>Rs. {doc.consultationFee}</Text>
                      </View>
                    ) : null}
                    {doc.isAvailable ? (
                      <View style={styles.availableDot}>
                        <View style={styles.greenDot} />
                        <Text style={styles.availableText}>Available</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            );
          })}
          {filteredDoctors.length === 0 && !loadingDoctors && (
            <Text style={styles.emptyMsg}>No doctors found</Text>
          )}
        </ScrollView>
      )}
    </View>
  );

  /* ── Step 2: Date + Time Slots ── */
  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Day */}
      <Text style={styles.sectionHeading}>Day</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {upcomingDates.map((d, i) => {
          const iso        = toISO(d);
          const isSelected = selectedDate === iso;
          const isToday    = i === 0;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.datePill, isSelected && styles.datePillSelected]}
              onPress={() => handleDateSelect(d)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateDayName, isSelected && styles.dateDayNameSel]}>
                {isToday ? 'Today' : DAY_NAMES[d.getDay()]}
              </Text>
              <Text style={[styles.dateDayNum, isSelected && styles.dateDayNumSel]}>
                {d.getDate()} {MONTH_NAMES[d.getMonth()]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time */}
      <View style={styles.timeSectionHeader}>
        <Text style={styles.sectionHeading}>Time</Text>
        {selectedDate && slots.length > 0 && (
          <Text style={styles.slotsAvailableText}>{slots.filter(s => s.status === 'open').length} slots available</Text>
        )}
      </View>

      {!selectedDate ? (
        <View style={styles.slotsHint}>
          <Ionicons name="calendar-outline" size={32} color={colors.disabled} />
          <Text style={styles.slotsHintText}>Select a date to see available time slots</Text>
        </View>
      ) : loadingSlots ? (
        <View style={styles.slotsHint}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.slotsHintText}>Loading available slots…</Text>
        </View>
      ) : slots.length === 0 ? (
        <View style={styles.slotsHint}>
          <Ionicons name="time-outline" size={32} color={colors.disabled} />
          <Text style={styles.slotsHintText}>No available slots for this date</Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {slots.map(slot => {
            const isOpen      = slot.status === 'open';
            const isSelected  = selectedSlot?._id === slot._id;
            const nextToken = (slot.currentBookings || 0) + 1;
            return (
              <TouchableOpacity
                key={slot._id}
                style={[
                  styles.slotChip,
                  isSelected && styles.slotChipSelected,
                  !isOpen && styles.slotChipFull,
                ]}
                onPress={() => isOpen && setSelectedSlot(slot)}
                activeOpacity={isOpen ? 0.8 : 1}
                disabled={!isOpen}
              >
                <Text style={[
                  styles.slotChipTime,
                  isSelected && styles.slotChipTextSelected,
                  !isOpen && styles.slotChipTextFull,
                ]}>
                  {slot.startTime}
                </Text>
                <View style={[styles.tokenBadge, isSelected && styles.tokenBadgeSel, !isOpen && styles.tokenBadgeFull]}>
                  <Ionicons
                    name="ticket-outline"
                    size={10}
                    color={isOpen ? (isSelected ? colors.surface : colors.accent) : colors.disabled}
                  />
                  <Text style={[styles.tokenBadgeText, isSelected && styles.tokenBadgeTextSel, !isOpen && styles.tokenBadgeTextFull]}>
                    {isOpen ? `Token #${nextToken}` : 'Full'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  /* ── Step 3: Service (Optional) ── */
  const renderStep3 = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.optionalBanner}>
        <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
        <Text style={styles.optionalBannerText}>Service selection is optional. You can skip this step.</Text>
      </View>

      {loadingServices ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.serviceGrid}>
          {services.map(svc => {
            const meta       = getCatMeta(svc.category);
            const isSelected = selectedService?._id === svc._id;
            return (
              <TouchableOpacity
                key={svc._id}
                style={[
                  styles.serviceCard,
                  isSelected && { borderColor: meta.color, backgroundColor: meta.bg },
                ]}
                onPress={() =>
                  setSelectedService(prev => prev?._id === svc._id ? null : svc)
                }
                activeOpacity={0.82}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: isSelected ? meta.color : meta.bg }]}>
                  <Ionicons name={meta.icon} size={20} color={isSelected ? colors.surface : meta.color} />
                </View>
                <Text style={styles.serviceCardName} numberOfLines={2}>{svc.serviceName}</Text>
                <Text style={[styles.serviceCardPrice, isSelected && { color: meta.color }]}>
                  Rs. {svc.price}
                </Text>
                {isSelected && (
                  <View style={[styles.serviceCheck, { backgroundColor: meta.color }]}>
                    <Ionicons name="checkmark" size={10} color={colors.surface} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  /* ── Step 4: Review & Confirm ── */
  const renderStep4 = () => {
    const doctorName = selectedDoctor?.userId?.name || '';
    const displayDate = selectedDate
      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        })
      : '';
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryDivider} />
          {[
            { label: 'Doctor',  value: doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}` },
            { label: 'Date',    value: displayDate },
            { label: 'Time',    value: selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : '' },
            { label: 'Service', value: selectedService?.serviceName || 'Not selected' },
          ].map(row => (
            <View key={row.label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text
                style={[
                  styles.summaryValue,
                  row.label === 'Service' && !selectedService && { color: colors.textLight },
                ]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
          {selectedDoctor?.consultationFee ? (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryFeeLabel}>Consultation Fee</Text>
                <Text style={styles.summaryFeeValue}>Rs. {selectedDoctor.consultationFee}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesCardLabel}>Notes  <Text style={styles.notesOptional}>(Optional)</Text></Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requests or medical notes..."
            placeholderTextColor={colors.disabled}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={goBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSub}>Step {step} of {TOTAL_STEPS}</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* ── Step Indicator ── */}
      <StepIndicator step={step} />

      {/* ── Content ── */}
      <Animated.View
        style={[styles.stepContent, { opacity: fadeIn, transform: [{ translateX: slideX }] }]}
      >
        {error   ? <ErrorAlert   message={error}   /> : null}
        {success ? <SuccessAlert message={success} /> : null}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </Animated.View>

      {/* ── Bottom Navigation ── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={17} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomRight}>
          {/* Skip button — only on step 3 */}
          {step === 3 && (
            <TouchableOpacity style={styles.skipBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}

          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{step === 3 ? 'Next' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, styles.confirmBtn, booking && { opacity: 0.6 }]}
              onPress={handleBook}
              disabled={booking}
              activeOpacity={0.85}
            >
              {booking ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.surface} />
                  <Text style={styles.nextBtnText}>Confirm Booking</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 20,
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: colors.surface },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 2, fontWeight: '500' },

  /* Step Indicator */
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  stepItem:  { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepActive: { borderColor: colors.accent, backgroundColor: colors.accentFaded },
  stepDone:   { borderColor: colors.accent, backgroundColor: colors.accent },
  stepNum:         { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  stepNumActive:   { color: colors.accent },
  stepLabel:       { fontSize: 10, fontWeight: '600', color: colors.textLight },
  stepLabelActive: { color: colors.accent },
  stepLine: {
    flex: 1, height: 2, backgroundColor: colors.border,
    marginHorizontal: 4, marginBottom: 16,
  },
  stepLineDone: { backgroundColor: colors.accent },

  /* Step Content */
  stepContent: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  /* Bottom Nav */
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 100 : 76,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  bottomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: colors.background,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  skipBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  skipBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14, backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 5,
  },
  confirmBtn: { paddingHorizontal: 18 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: colors.surface },

  /* Step 1 — Doctor */
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1.5, borderColor: colors.border,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, height: '100%' },
  doctorOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
  },
  doctorOptionSelected: { borderColor: colors.accent, backgroundColor: colors.accentFaded },
  docAvatar: { width: 52, height: 52, borderRadius: 16 },
  docAvatarFallback: {
    backgroundColor: colors.accentFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  docInitials: { fontSize: 17, fontWeight: '700', color: colors.accent },
  docName:     { fontSize: 15, fontWeight: '700', color: colors.text },
  docSpec:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  docMeta:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  docMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  docMetaText: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  availableDot:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  availableText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  emptyMsg: { textAlign: 'center', color: colors.textLight, fontSize: 14, marginTop: 24 },

  /* Step 2 — Date + Time */
  sectionHeading: {
    fontSize: 15, fontWeight: '700', color: colors.text,
    marginBottom: 12,
  },
  timeSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22, marginBottom: 12,
  },
  slotsAvailableText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  dateRow: { gap: 10, paddingVertical: 4, paddingBottom: 6 },
  datePill: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    minWidth: 72, gap: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 2,
  },
  datePillSelected: {
    backgroundColor: colors.accent, borderColor: colors.accent,
    shadowColor: colors.accent, shadowOpacity: 0.3,
  },
  dateDayName:    { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  dateDayNum:     { fontSize: 13, fontWeight: '800', color: colors.text },
  dateDayNameSel: { color: 'rgba(255,255,255,0.85)' },
  dateDayNumSel:  { color: colors.surface },

  /* Slots */
  slotsHint: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, gap: 10,
  },
  slotsHintText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 2,
    minWidth: 108, alignItems: 'center', gap: 6,
  },
  slotChipSelected: {
    backgroundColor: colors.accent, borderColor: colors.accent,
    shadowColor: colors.accent, shadowOpacity: 0.3,
  },
  slotChipFull:         { backgroundColor: colors.background, borderColor: colors.borderLight, opacity: 0.5 },
  slotChipTime:         { fontSize: 14, fontWeight: '700', color: colors.text },
  slotChipTextSelected: { color: colors.surface },
  slotChipTextFull:     { color: colors.disabled },
  tokenBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.accentFaded,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  tokenBadgeSel:  { backgroundColor: 'rgba(255,255,255,0.22)' },
  tokenBadgeFull: { backgroundColor: colors.borderLight },
  tokenBadgeText:     { fontSize: 10, fontWeight: '700', color: colors.accent },
  tokenBadgeTextSel:  { color: colors.surface },
  tokenBadgeTextFull: { color: colors.disabled },

  /* Step 3 — Service */
  optionalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accentFaded, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  optionalBannerText: { fontSize: 12, color: colors.accent, fontWeight: '600', flex: 1 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: {
    width: '47%', backgroundColor: colors.surface,
    borderRadius: 16, padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  serviceIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  serviceCardName:  { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  serviceCardPrice: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  serviceCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Step 4 — Review */
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  summaryTitle:    { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  summaryDivider:  { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel:    { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  summaryValue:    { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'right' },
  summaryFeeLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryFeeValue: { fontSize: 16, fontWeight: '800', color: colors.accent },
  notesCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10,
    elevation: 3,
  },
  notesCardLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  notesOptional:  { fontSize: 12, color: colors.textLight, fontWeight: '400' },
  notesInput: {
    fontSize: 14, color: colors.text,
    backgroundColor: colors.inputBg,
    borderRadius: 12, padding: 12,
    minHeight: 100, borderWidth: 1, borderColor: colors.borderLight,
  },
});

export default BookAppointmentScreen;
