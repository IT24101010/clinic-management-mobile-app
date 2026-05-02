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
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../api/axiosConfig';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:          '#F4F5F7',
  card:        '#FFFFFF',
  line:        '#E8EAEF',
  line2:       '#E3E6EC',
  ink:         '#0E1422',
  ink2:        '#3A4254',
  muted:       '#7A8296',
  muted2:      '#A7ADBB',
  accent:      '#0B5FFF',
  accentSoft:  '#E7EFFF',
  success:     '#0F9D7A',
  successSoft: '#DDF3EA',
  danger:      '#D6574F',
  dangerSoft:  '#FADBD9',
};

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toneFor = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
};

const isValidTime = (t) => /^([0-1]\d|2[0-3]):[0-5]\d$/.test(t);

// Convert "HH:MM" string → Date (today's date, just hours/minutes set)
const timeStrToDate = (str) => {
  const d = new Date();
  if (str && isValidTime(str)) {
    const [h, m] = str.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
};

// Convert Date → "HH:MM" 24-hour string
const dateToTimeStr = (d) => {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

// ── FormField ─────────────────────────────────────────────────────────────────

const FormField = ({ label, required, children }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: T.danger }}> *</Text>}
    </Text>
    {children}
  </View>
);

// ── Doctor Picker Modal ───────────────────────────────────────────────────────

const DoctorPickerModal = ({ visible, doctors, loadingDoctors, selected, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHandle}><View style={styles.grabber} /></View>
        <View style={styles.pickerHead}>
          <Text style={styles.pickerTitle}>Select Doctor</Text>
          <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
            <Ionicons name="close" size={18} color={T.ink2} />
          </TouchableOpacity>
        </View>

        {loadingDoctors ? (
          <View style={styles.pickerLoading}>
            <ActivityIndicator color={T.accent} />
            <Text style={styles.pickerLoadingText}>Loading doctors…</Text>
          </View>
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={d => d._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item: doc }) => {
              const name = doc.userId?.name || doc.name || 'Unknown';
              const spec = doc.specialization || '';
              const isSelected = selected?._id === doc._id;
              return (
                <TouchableOpacity
                  onPress={() => { onSelect(doc); onClose(); }}
                  activeOpacity={0.85}
                  style={[styles.pickerRow, isSelected && styles.pickerRowActive]}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: toneFor(name) }]}>
                    <Text style={styles.pickerAvatarText}>{initialsOf(name)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.pickerDocName, isSelected && { color: T.accent }]} numberOfLines={1}>
                      {name.startsWith('Dr') ? name : `Dr. ${name}`}
                    </Text>
                    {spec ? <Text style={styles.pickerDocSpec} numberOfLines={1}>{spec}</Text> : null}
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No doctors found</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  </Modal>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TimeSlotFormScreen({ navigation, route }) {
  const editSlot = route.params?.slot || null;
  const isEdit   = !!editSlot;

  const [doctors,        setDoctors]        = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showDrPicker,        setShowDrPicker]        = useState(false);
  const [showDatePicker,      setShowDatePicker]      = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker,   setShowEndTimePicker]   = useState(false);
  const [saving,              setSaving]              = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date,           setDate]           = useState(null);
  const [startTime,      setStartTime]      = useState('');
  const [endTime,        setEndTime]        = useState('');
  const [maxCapacity,    setMaxCapacity]    = useState('');
  const [isActive,       setIsActive]       = useState(true);

  const [focusedField, setFocusedField] = useState(null);  // still used for capacity

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Prefill in edit mode
  useEffect(() => {
    if (isEdit && editSlot) {
      setSelectedDoctor(editSlot.doctorId ? { _id: editSlot.doctorId._id, userId: { name: editSlot.doctorId.name } } : null);
      setDate(editSlot.date ? new Date(editSlot.date) : null);
      setStartTime(editSlot.startTime || '');
      setEndTime(editSlot.endTime || '');
      setMaxCapacity(editSlot.maxCapacity != null ? String(editSlot.maxCapacity) : '');
      setIsActive(editSlot.isActive !== false);
    }
  }, [isEdit, editSlot]);

  // Load doctors once
  const loadDoctors = useCallback(async () => {
    if (doctors.length > 0) return;
    setLoadingDoctors(true);
    try {
      const { data } = await api.get('/api/doctors');
      setDoctors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Failed to load doctors:', e);
    } finally {
      setLoadingDoctors(false);
    }
  }, [doctors.length]);

  const openDoctorPicker = () => {
    loadDoctors();
    setShowDrPicker(true);
  };

  const validate = () => {
    if (!selectedDoctor) return 'Please select a doctor.';
    if (!date)           return 'Please select a date.';
    if (!startTime)      return 'Start time is required.';
    if (!endTime)        return 'End time is required.';
    if (endTime <= startTime) return 'End time must be after start time.';
    if (!maxCapacity || isNaN(Number(maxCapacity)) || Number(maxCapacity) < 1)
      return 'Max capacity must be at least 1.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    // Build date string as YYYY-MM-DD
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const doctorId = selectedDoctor?.userId?._id || selectedDoctor?._id;

    const payload = {
      doctorId,
      date:        dateStr,
      startTime,
      endTime,
      maxCapacity: Number(maxCapacity),
      isActive,
    };

    try {
      if (isEdit) {
        await api.put(`/api/timeslots/${editSlot._id}`, payload);
        setSuccess('Time slot updated!');
      } else {
        await api.post('/api/timeslots', payload);
        setSuccess('Time slot created!');
      }
      setTimeout(() => navigation.goBack(), 1400);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save time slot');
    } finally {
      setSaving(false);
    }
  };

  const selectedDoctorName = selectedDoctor?.userId?.name || selectedDoctor?.name || null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={T.ink2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>{isEdit ? 'Edit time slot' : 'New time slot'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveHeaderBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>
              {isEdit ? 'Edit Time Slot' : 'Add Time Slot'}
            </Text>
            <Text style={styles.pageSub}>
              {isEdit ? 'Update slot details below' : 'Fill in all required fields'}
            </Text>
          </View>

          {error   ? <View style={styles.alertWrap}><ErrorAlert   message={error}   /></View> : null}
          {success ? <View style={styles.alertWrap}><SuccessAlert message={success} /></View> : null}

          {/* ── Doctor ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="person-outline" size={13} color={T.muted} />{'  '}Assign Doctor
            </Text>

            <FormField label="Doctor" required>
              <TouchableOpacity
                style={[styles.selectRow, focusedField === 'doctor' && styles.selectRowFocused]}
                onPress={openDoctorPicker}
                activeOpacity={0.85}
              >
                {selectedDoctorName ? (
                  <View style={[styles.miniAvatar, { backgroundColor: toneFor(selectedDoctorName) }]}>
                    <Text style={styles.miniAvatarText}>{initialsOf(selectedDoctorName)}</Text>
                  </View>
                ) : (
                  <Ionicons name="person-outline" size={16} color={T.muted} />
                )}
                <Text style={[styles.selectText, !selectedDoctorName && styles.selectPlaceholder]}>
                  {selectedDoctorName
                    ? (selectedDoctorName.startsWith('Dr') ? selectedDoctorName : `Dr. ${selectedDoctorName}`)
                    : 'Tap to select a doctor…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={T.muted} />
              </TouchableOpacity>
            </FormField>
          </View>

          {/* ── Schedule ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="calendar-outline" size={13} color={T.muted} />{'  '}Schedule
            </Text>

            {/* Date */}
            <FormField label="Date" required>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={16} color={T.muted} />
                <Text style={[styles.selectText, !date && styles.selectPlaceholder]}>
                  {date ? fmtDate(date) : 'Tap to select a date…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={T.muted} />
              </TouchableOpacity>
            </FormField>

            {showDatePicker && (
              <DateTimePicker
                value={date || new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              />
            )}

            {/* Time pickers — full-width, tap to open */}
            <View style={styles.timePickerRow}>
              {/* Start Time */}
              <View style={styles.timePickerCol}>
                <Text style={styles.fieldLabel}>
                  Start Time <Text style={{ color: T.danger }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.timePickerBtn, startTime && styles.timePickerBtnFilled]}
                  onPress={() => setShowStartTimePicker(true)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.timeIconCircle, startTime && { backgroundColor: T.accentSoft }]}>
                    <Ionicons name="time-outline" size={16} color={startTime ? T.accent : T.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {startTime ? (
                      <>
                        <Text style={styles.timePickerLabel}>Start</Text>
                        <Text style={styles.timePickerValue}>{startTime}</Text>
                      </>
                    ) : (
                      <Text style={styles.timePickerPlaceholder}>Set start time</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={14} color={T.muted2} />
                </TouchableOpacity>
              </View>

              {/* Arrow divider */}
              <View style={styles.timeArrowWrap}>
                <Ionicons name="arrow-forward" size={16} color={T.muted2} />
              </View>

              {/* End Time */}
              <View style={styles.timePickerCol}>
                <Text style={styles.fieldLabel}>
                  End Time <Text style={{ color: T.danger }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.timePickerBtn, endTime && styles.timePickerBtnFilled]}
                  onPress={() => setShowEndTimePicker(true)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.timeIconCircle, endTime && { backgroundColor: T.accentSoft }]}>
                    <Ionicons name="time-outline" size={16} color={endTime ? T.accent : T.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {endTime ? (
                      <>
                        <Text style={styles.timePickerLabel}>End</Text>
                        <Text style={styles.timePickerValue}>{endTime}</Text>
                      </>
                    ) : (
                      <Text style={styles.timePickerPlaceholder}>Set end time</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={14} color={T.muted2} />
                </TouchableOpacity>
              </View>
            </View>

            {showStartTimePicker && (
              <DateTimePicker
                value={timeStrToDate(startTime)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowStartTimePicker(false);
                  if (d) setStartTime(dateToTimeStr(d));
                }}
              />
            )}

            {showEndTimePicker && (
              <DateTimePicker
                value={timeStrToDate(endTime)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowEndTimePicker(false);
                  if (d) setEndTime(dateToTimeStr(d));
                }}
              />
            )}
          </View>

          {/* ── Capacity & Status ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Ionicons name="settings-outline" size={13} color={T.muted} />{'  '}Capacity & Status
            </Text>

            <FormField label="Max Capacity" required>
              <View style={[styles.inputRow, focusedField === 'cap' && styles.inputRowFocused]}>
                <Ionicons
                  name="people-outline" size={15}
                  color={focusedField === 'cap' ? T.accent : T.muted}
                />
                <TextInput
                  style={styles.input}
                  value={maxCapacity}
                  onChangeText={v => setMaxCapacity(v.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 5"
                  placeholderTextColor={T.muted2}
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => setFocusedField('cap')}
                  onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.inputSuffix}>patients</Text>
              </View>
            </FormField>

            {/* Active toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Active slot</Text>
                <Text style={styles.toggleSub}>
                  {isActive ? 'Visible to patients for booking' : 'Hidden — patients cannot book this slot'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsActive(v => !v)}
                activeOpacity={0.85}
                style={[styles.toggle, isActive && styles.toggleOn]}
              >
                <View style={[styles.toggleThumb, isActive && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Save button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {isEdit ? 'Save Changes' : 'Create Time Slot'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      <DoctorPickerModal
        visible={showDrPicker}
        doctors={doctors}
        loadingDoctors={loadingDoctors}
        selected={selectedDoctor}
        onSelect={setSelectedDoctor}
        onClose={() => setShowDrPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingHorizontal: 16 },

  // Top bar
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingHorizontal: 16, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.bg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  topLabel: { fontSize: 11, color: T.muted, fontWeight: '500' },
  topName:  { fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  saveHeaderBtn: {
    backgroundColor: T.ink, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 10, minWidth: 52, alignItems: 'center',
  },
  saveHeaderBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Title
  titleRow: { paddingTop: 8, paddingBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: T.ink, letterSpacing: -0.6 },
  pageSub:   { fontSize: 13, color: T.muted, marginTop: 4 },

  alertWrap: { marginBottom: 12 },

  // Card sections
  card: {
    backgroundColor: T.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: T.line,
    marginBottom: 12, gap: 14,
  },
  cardTitle: {
    fontSize: 11, color: T.muted, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  // Field
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11.5, color: T.ink2, fontWeight: '700',
    letterSpacing: 0.2,
  },
  fieldHint: {
    fontSize: 11, color: T.muted2, fontWeight: '500',
    marginTop: -8,
  },

  // Select row (doctor, date)
  selectRow: {
    height: 46, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12,
    backgroundColor: T.bg, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2,
  },
  selectRowFocused: { borderColor: T.accent, backgroundColor: T.card },
  selectText: { flex: 1, fontSize: 13.5, color: T.ink, fontWeight: '500' },
  selectPlaceholder: { color: T.muted2 },

  miniAvatar: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 10, fontWeight: '700', color: '#2A2F3C' },

  // Input row
  inputRow: {
    height: 46, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12,
    backgroundColor: T.bg, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2,
  },
  inputRowFocused: { borderColor: T.accent, backgroundColor: T.card },
  input: { flex: 1, fontSize: 14, color: T.ink, padding: 0 },
  inputSuffix: { fontSize: 11.5, color: T.muted, fontWeight: '600' },

  // Time picker row (full-width side-by-side pickers)
  timePickerRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 0,
  },
  timePickerCol: { flex: 1, gap: 6 },
  timeArrowWrap: {
    paddingBottom: 13, paddingHorizontal: 8, alignItems: 'center',
  },
  timePickerBtn: {
    height: 58, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12,
    backgroundColor: T.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.line2,
  },
  timePickerBtnFilled: {
    borderColor: T.accent, backgroundColor: '#F0F5FF',
  },
  timeIconCircle: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  timePickerLabel: {
    fontSize: 10, fontWeight: '600', color: T.muted, letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timePickerValue: {
    fontSize: 17, fontWeight: '800', color: T.ink, letterSpacing: -0.4,
    marginTop: 1,
  },
  timePickerPlaceholder: {
    fontSize: 13, color: T.muted2, fontWeight: '500',
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 4,
  },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: T.ink },
  toggleSub:   { fontSize: 11.5, color: T.muted, marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: T.line2, padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: T.accent },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14,
    backgroundColor: T.ink,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 5,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Doctor picker modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(14,20,34,0.42)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '70%',
  },
  pickerHandle: { alignItems: 'center', paddingVertical: 10 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line2 },
  pickerHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 14,
  },
  pickerTitle: {
    flex: 1, fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2,
  },
  pickerClose: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center',
  },
  pickerList: { gap: 6, paddingBottom: 8 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    backgroundColor: T.bg,
    borderWidth: 1, borderColor: 'transparent',
  },
  pickerRowActive: { borderColor: T.accent, backgroundColor: T.accentSoft },
  pickerAvatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerAvatarText: { fontSize: 14, fontWeight: '700', color: '#2A2F3C' },
  pickerDocName: { fontSize: 14, fontWeight: '600', color: T.ink },
  pickerDocSpec: { fontSize: 12, color: T.muted, marginTop: 2 },
  pickerLoading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 32,
  },
  pickerLoadingText: { fontSize: 13, color: T.muted },
  pickerEmpty: { alignItems: 'center', paddingVertical: 32 },
  pickerEmptyText: { fontSize: 13, color: T.muted },
});
