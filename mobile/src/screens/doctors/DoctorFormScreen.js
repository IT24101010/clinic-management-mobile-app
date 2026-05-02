import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import api from '../../api/axiosConfig';

// ── Design tokens (matches AppointmentDetailModal) ────────────────────────────

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
  inputBg:     '#F0F2F5',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const SPECIALIZATIONS = [
  'General Practice', 'Cardiology', 'Dermatology', 'Neurology',
  'Orthopedics', 'Pediatrics', 'Obstetrics', 'Psychiatry',
  'Radiology', 'Oncology', 'ENT', 'Ophthalmology',
];

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Small reusable primitives ─────────────────────────────────────────────────

const SectionCard = ({ children, style }) => (
  <View style={[styles.sectionCard, style]}>{children}</View>
);

const SectionLabel = ({ icon, text }) => (
  <View style={styles.sectionLabelRow}>
    {icon && <Ionicons name={icon} size={12} color={T.muted2} />}
    <Text style={styles.sectionLabel}>{text}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

function FieldInput({
  value, onChangeText, placeholder, keyboardType,
  secureTextEntry, multiline, returnKeyType, right,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted2}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        returnKeyType={returnKeyType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.inputMulti]}
      />
      {right}
    </View>
  );
}

function FieldRow({ label, required, error, children, hint }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <Text style={styles.fieldRequired}> *</Text>}
      </View>
      {children}
      {hint  && <Text style={styles.fieldHint}>{hint}</Text>}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── User search (for "select existing" mode) ──────────────────────────────────

function UserSearchField({ selectedUser, onSelect }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/users?search=${encodeURIComponent(q)}&limit=8`);
      setResults(data?.users || data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (text) => {
    setQuery(text);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(text), 380);
  };

  if (selectedUser) {
    return (
      <View style={styles.selectedUser}>
        <View style={styles.selectedUserAvatar}>
          <Text style={styles.selectedUserInitials}>
            {selectedUser.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
          <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
        </View>
        <TouchableOpacity onPress={() => onSelect(null)} style={styles.clearBtn}>
          <Ionicons name="close" size={15} color={T.muted} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.inputWrap, query && styles.inputWrapFocused]}>
        <Ionicons name="search" size={15} color={T.muted2} style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={onChange}
          placeholder="Search by name or email"
          placeholderTextColor={T.muted2}
          style={[styles.input, { flex: 1 }]}
        />
        {loading && <ActivityIndicator size="small" color={T.accent} />}
      </View>
      {results.length > 0 && (
        <View style={styles.searchResults}>
          {results.map((u, i) => (
            <React.Fragment key={u._id}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                style={styles.searchResultRow}
                onPress={() => { onSelect(u); setQuery(''); setResults([]); }}
                activeOpacity={0.7}
              >
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultInitials}>
                    {u.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{u.name}</Text>
                  <Text style={styles.resultEmail}>{u.email}</Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Weekly slot row ───────────────────────────────────────────────────────────

function SlotRow({ slot, onChange, onRemove }) {
  const [dayOpen, setDayOpen] = useState(false);

  const setDay   = (d) => { onChange({ ...slot, day: DAY_FULL[d] }); setDayOpen(false); };
  const setStart = (v) => onChange({ ...slot, startTime: v });
  const setEnd   = (v) => onChange({ ...slot, endTime: v });

  const shortDay = Object.keys(DAY_FULL).find(k => DAY_FULL[k] === slot.day) || null;

  return (
    <View style={styles.slotCard}>
      {/* Day selector */}
      <TouchableOpacity
        style={styles.daySelector}
        onPress={() => setDayOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={[styles.daySelectorText, !slot.day && { color: T.muted2 }]}>
          {shortDay || 'Day'}
        </Text>
        <Ionicons name={dayOpen ? 'chevron-up' : 'chevron-down'} size={13} color={T.muted} />
      </TouchableOpacity>

      {/* Time row */}
      <View style={styles.slotTimes}>
        <View style={styles.slotTimeField}>
          <Text style={styles.slotTimeLabel}>From</Text>
          <TextInput
            value={slot.startTime}
            onChangeText={setStart}
            placeholder="09:00"
            placeholderTextColor={T.muted2}
            style={styles.slotTimeInput}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <Ionicons name="arrow-forward" size={12} color={T.muted2} style={{ marginTop: 18 }} />
        <View style={styles.slotTimeField}>
          <Text style={styles.slotTimeLabel}>To</Text>
          <TextInput
            value={slot.endTime}
            onChangeText={setEnd}
            placeholder="17:00"
            placeholderTextColor={T.muted2}
            style={styles.slotTimeInput}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.slotRemoveBtn}>
          <Ionicons name="close" size={14} color={T.danger} />
        </TouchableOpacity>
      </View>

      {/* Day picker dropdown */}
      {dayOpen && (
        <View style={styles.dayDropdown}>
          <View style={styles.dayChips}>
            {DAYS.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setDay(d)}
                style={[
                  styles.dayChip,
                  shortDay === d && styles.dayChipActive,
                ]}
              >
                <Text style={[styles.dayChipText, shortDay === d && styles.dayChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main form modal ───────────────────────────────────────────────────────────

export default function DoctorFormScreen({ visible, onClose, onSuccess, editDoctor = null }) {
  const isEdit = !!editDoctor;

  // Mode (only relevant for create)
  const [mode, setMode] = useState('new'); // 'new' | 'existing'

  // Loading & errors
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [errors, setErrors]     = useState({});

  // New account fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  // Existing user
  const [selectedUser, setSelectedUser] = useState(null);

  // Doctor profile fields
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience]         = useState('');
  const [fee, setFee]                       = useState('');
  const [bio, setBio]                       = useState('');

  // Dynamic lists
  const [qualifications, setQualifications] = useState([]);
  const [newQual, setNewQual]               = useState('');
  const [slots, setSlots]                   = useState([]);

  const resetForm = () => {
    setMode('new'); setError(''); setErrors({});
    setName(''); setEmail(''); setPassword(''); setShowPwd(false);
    setSelectedUser(null);
    setSpecialization(''); setExperience(''); setFee(''); setBio('');
    setQualifications([]); setNewQual('');
    setSlots([]);
  };

  // Pre-fill when opening in edit mode; clear when opening create mode
  useEffect(() => {
    if (!visible) return;
    if (isEdit && editDoctor) {
      setError(''); setErrors({});
      setSpecialization(editDoctor.specialization || '');
      setExperience(editDoctor.experience != null ? String(editDoctor.experience) : '');
      setFee(editDoctor.consultationFee != null ? String(editDoctor.consultationFee) : '');
      setBio(editDoctor.bio || '');
      setQualifications(
        (editDoctor.qualifications || []).map(q => ({ id: uid(), value: q }))
      );
      setSlots(
        (editDoctor.availableSlots || []).map(s => ({
          id: uid(), day: s.day || '', startTime: s.startTime || '', endTime: s.endTime || '',
        }))
      );
    } else {
      resetForm();
    }
  }, [visible, isEdit]);

  // ── Qualifications helpers ──────────────────────────────────────────────────

  const addQual = () => {
    const v = newQual.trim();
    if (!v) return;
    setQualifications(prev => [...prev, { id: uid(), value: v }]);
    setNewQual('');
  };

  const removeQual = (id) => setQualifications(prev => prev.filter(q => q.id !== id));

  // ── Slot helpers ────────────────────────────────────────────────────────────

  const addSlot   = () => setSlots(prev => [...prev, { id: uid(), day: '', startTime: '', endTime: '' }]);
  const removeSlot = (id) => setSlots(prev => prev.filter(s => s.id !== id));
  const updateSlot = (id, updated) => setSlots(prev => prev.map(s => s.id === id ? updated : s));

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!isEdit) {
      if (mode === 'new') {
        if (!name.trim())  e.name  = 'Full name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
        if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
      } else {
        if (!selectedUser) e.selectedUser = 'Please select an existing user';
      }
    }
    if (!specialization.trim()) e.specialization = 'Specialization is required';
    if (experience && isNaN(Number(experience))) e.experience = 'Must be a number';
    if (fee && isNaN(Number(fee))) e.fee = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const profilePayload = {
        specialization: specialization.trim(),
        experience:     experience ? Number(experience) : 0,
        consultationFee: fee ? Number(fee) : 0,
        bio:            bio.trim() || undefined,
        qualifications: qualifications.map(q => q.value).filter(Boolean),
        availableSlots: slots
          .filter(s => s.day && s.startTime && s.endTime)
          .map(s => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })),
      };

      if (isEdit) {
        // Update existing doctor profile
        await api.put(`/api/doctors/${editDoctor._id}`, profilePayload);
      } else {
        let userId;
        if (mode === 'new') {
          const regRes = await api.post('/api/users/register', {
            name:     name.trim(),
            email:    email.trim().toLowerCase(),
            password,
            role:     'doctor',
          });
          userId = regRes.data?.user?._id || regRes.data?._id;
        } else {
          userId = selectedUser._id;
        }
        await api.post('/api/doctors', { ...profilePayload, userId, isAvailable: true });
      }

      onSuccess?.();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        (isEdit ? 'Failed to update doctor profile.' : 'Failed to create doctor profile.')
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

          <View style={styles.sheet}>
            {/* Grabber */}
            <View style={styles.grabberWrap}><View style={styles.grabber} /></View>

            {/* Header */}
            <View style={styles.sheetHead}>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="chevron-down" size={18} color={T.ink2} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{isEdit ? 'Edit Doctor Profile' : 'Add Doctor Profile'}</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {/* Global error */}
              {error ? (
                <View style={styles.errorBar}>
                  <Ionicons name="alert-circle" size={14} color={T.danger} />
                  <Text style={styles.errorBarText}>{error}</Text>
                </View>
              ) : null}

              {/* ── Mode toggle (create only) ── */}
              {!isEdit && (
                <View style={styles.modeToggle}>
                  {[
                    { id: 'existing', label: 'Select Existing User' },
                    { id: 'new',      label: 'Create New User Account' },
                  ].map(m => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setMode(m.id)}
                      style={styles.modeOption}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radio, mode === m.id && styles.radioActive]}>
                        {mode === m.id && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Account section ── */}
              <SectionCard>
                <SectionLabel icon="person-outline" text="Account Details" />
                <Divider />

                {isEdit ? (
                  /* Read-only linked user card */
                  <View style={styles.linkedUserCard}>
                    <View style={styles.linkedUserAvatar}>
                      <Text style={styles.linkedUserInitials}>
                        {(editDoctor?.userId?.name || 'D')
                          .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkedUserName}>
                        {editDoctor?.userId?.name || 'Doctor'}
                      </Text>
                      <Text style={styles.linkedUserEmail}>
                        {editDoctor?.userId?.email || '—'}
                      </Text>
                    </View>
                    <View style={styles.linkedBadge}>
                      <Ionicons name="lock-closed-outline" size={12} color={T.muted} />
                      <Text style={styles.linkedBadgeText}>Linked</Text>
                    </View>
                  </View>
                ) : mode === 'new' ? (
                  <>
                    {/* Name — full width */}
                    <FieldRow label="Doctor's Name" required error={errors.name}>
                      <FieldInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Dr. John Doe"
                      />
                    </FieldRow>

                    {/* Email — full width */}
                    <FieldRow label="Email Address" required error={errors.email}>
                      <FieldInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="dr@clinic.lk"
                        keyboardType="email-address"
                      />
                    </FieldRow>

                    <FieldRow label="Password" required error={errors.password}
                      hint='A "doctor" role account will automatically be created.'>
                      <FieldInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Minimum 6 characters"
                        secureTextEntry={!showPwd}
                        right={
                          <TouchableOpacity onPress={() => setShowPwd(p => !p)} style={styles.eyeBtn}>
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={T.muted} />
                          </TouchableOpacity>
                        }
                      />
                    </FieldRow>
                  </>
                ) : (
                  <FieldRow label="Search User" required error={errors.selectedUser}>
                    <UserSearchField selectedUser={selectedUser} onSelect={setSelectedUser} />
                  </FieldRow>
                )}
              </SectionCard>

              {/* ── Professional details ── */}
              <SectionCard>
                <SectionLabel icon="medical-outline" text="Professional Details" />
                <Divider />

                <FieldRow label="Specialization" required error={errors.specialization}>
                  <FieldInput
                    value={specialization}
                    onChangeText={setSpecialization}
                    placeholder="e.g. Cardiology"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.specRow}
                  >
                    {SPECIALIZATIONS.map(s => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSpecialization(s)}
                        style={[styles.specChip, specialization === s && styles.specChipActive]}
                      >
                        <Text style={[styles.specChipText, specialization === s && styles.specChipTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </FieldRow>

                <View style={styles.twoCol}>
                  <FieldRow label="Experience (Years)" error={errors.experience} style={{ flex: 1 }}>
                    <FieldInput
                      value={experience}
                      onChangeText={setExperience}
                      placeholder="5"
                      keyboardType="numeric"
                    />
                  </FieldRow>
                  <FieldRow label="Consultation Fee (Rs.)" error={errors.fee} style={{ flex: 1 }}>
                    <FieldInput
                      value={fee}
                      onChangeText={setFee}
                      placeholder="2000"
                      keyboardType="numeric"
                    />
                  </FieldRow>
                </View>

                <FieldRow label="Biography">
                  <FieldInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Brief introduction about the doctor..."
                    multiline
                  />
                </FieldRow>
              </SectionCard>

              {/* ── Qualifications ── */}
              <SectionCard>
                <View style={styles.sectionHeadRow}>
                  <SectionLabel icon="ribbon-outline" text="Qualifications" />
                  <TouchableOpacity onPress={addQual} style={styles.addLinkBtn}>
                    <Ionicons name="add" size={13} color={T.accent} />
                    <Text style={styles.addLinkText}>Add</Text>
                  </TouchableOpacity>
                </View>
                <Divider />

                {/* Existing qualification tags */}
                {qualifications.length > 0 && (
                  <View style={styles.qualTags}>
                    {qualifications.map(q => (
                      <View key={q.id} style={styles.qualTag}>
                        <Text style={styles.qualTagText}>{q.value}</Text>
                        <TouchableOpacity onPress={() => removeQual(q.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Ionicons name="close" size={13} color={T.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add input */}
                <View style={styles.qualInputRow}>
                  <FieldInput
                    value={newQual}
                    onChangeText={setNewQual}
                    placeholder="e.g. MBBS, MD"
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={addQual}
                    style={[styles.qualAddBtn, !newQual.trim() && { opacity: 0.4 }]}
                    disabled={!newQual.trim()}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </SectionCard>

              {/* ── Weekly routine ── */}
              <SectionCard>
                <View style={styles.sectionHeadRow}>
                  <SectionLabel icon="time-outline" text="Weekly Routine (Available Time)" />
                  <TouchableOpacity onPress={addSlot} style={styles.addLinkBtn}>
                    <Ionicons name="add" size={13} color={T.accent} />
                    <Text style={styles.addLinkText}>Add Time</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.routineHint}>
                  Generic weekly schedule layout. Actual appointment slots are managed separately.
                </Text>
                <Divider />

                {slots.length === 0 ? (
                  <TouchableOpacity onPress={addSlot} style={styles.emptySlot}>
                    <Ionicons name="add-circle-outline" size={20} color={T.muted2} />
                    <Text style={styles.emptySlotText}>Tap "+ Add Time" to add schedule</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 10 }}>
                    {slots.map(slot => (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        onChange={updated => updateSlot(slot.id, updated)}
                        onRemove={() => removeSlot(slot.id)}
                      />
                    ))}
                  </View>
                )}
              </SectionCard>

              <View style={{ height: 8 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.9}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={isEdit ? 'save-outline' : 'checkmark-circle'} size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>{isEdit ? 'Save Changes' : 'Create Profile'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,20,34,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
  },
  grabberWrap: { alignItems: 'center', paddingVertical: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line2 },

  // Header (matches AppointmentDetailModal sheetHead)
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetTitle: {
    flex: 1, fontSize: 15, fontWeight: '700',
    color: T.ink, letterSpacing: -0.2, textAlign: 'center',
  },

  body: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, gap: 10,
  },

  // Error bar
  errorBar: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 14, backgroundColor: T.dangerSoft,
  },
  errorBarText: { flex: 1, fontSize: 12.5, color: '#9B2B2B', fontWeight: '500', lineHeight: 18 },

  // Mode toggle
  modeToggle: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
    padding: 14, gap: 10,
  },
  modeOption: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: T.accent },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent,
  },
  modeLabel: { fontSize: 13.5, fontWeight: '600', color: T.muted },
  modeLabelActive: { color: T.ink },

  // Section card (matches activityBox / feeBar pattern)
  sectionCard: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
    padding: 14, gap: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  sectionLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  divider: { height: 1, backgroundColor: T.line2 },

  // Add link
  addLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, backgroundColor: T.accentSoft,
  },
  addLinkText: { fontSize: 12, fontWeight: '700', color: T.accent },

  // Field
  fieldRow: { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: T.ink2 },
  fieldRequired: { fontSize: 12, fontWeight: '700', color: T.danger },
  fieldHint: { fontSize: 11.5, color: T.accent, marginTop: 4, fontStyle: 'italic' },
  fieldError: { fontSize: 11.5, color: T.danger, marginTop: 3, fontWeight: '500' },

  twoCol: { flexDirection: 'row', gap: 10 },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.inputBg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputWrapFocused: { borderColor: T.accent, backgroundColor: T.card },
  input: { flex: 1, fontSize: 13.5, color: T.ink, padding: 0 },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 4 },
  eyeBtn: { padding: 4 },

  // Spec chips
  specRow: { gap: 6, paddingTop: 6, paddingBottom: 2, paddingRight: 4 },
  specChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: T.bg,
    borderWidth: 1, borderColor: T.line2,
  },
  specChipActive: { backgroundColor: T.accentSoft, borderColor: T.accent + '50' },
  specChipText: { fontSize: 11.5, fontWeight: '600', color: T.ink2 },
  specChipTextActive: { color: T.accent },

  // Qualification tags
  qualTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qualTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 999, backgroundColor: T.accentSoft,
    borderWidth: 1, borderColor: T.accent + '30',
  },
  qualTagText: { fontSize: 12.5, fontWeight: '600', color: T.accent },
  qualInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  qualAddBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },

  // Slot
  routineHint: { fontSize: 11.5, color: T.muted, marginTop: -8 },
  emptySlot: {
    alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 20,
  },
  emptySlotText: { fontSize: 12.5, color: T.muted2 },
  slotCard: {
    backgroundColor: T.bg, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2,
    padding: 12, gap: 8,
  },
  daySelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.card, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: T.line2,
  },
  daySelectorText: { fontSize: 13, fontWeight: '600', color: T.ink },
  slotTimes: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  slotTimeField: { flex: 1, gap: 4 },
  slotTimeLabel: { fontSize: 10.5, color: T.muted, fontWeight: '600', letterSpacing: 0.2 },
  slotTimeInput: {
    backgroundColor: T.card, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 14, color: T.ink, fontWeight: '600',
    borderWidth: 1, borderColor: T.line2,
    textAlign: 'center',
  },
  slotRemoveBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: T.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  dayDropdown: {
    backgroundColor: T.card, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2, padding: 10,
  },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, backgroundColor: T.bg,
    borderWidth: 1, borderColor: T.line2,
  },
  dayChipActive: { backgroundColor: T.accentSoft, borderColor: T.accent + '50' },
  dayChipText: { fontSize: 12, fontWeight: '700', color: T.ink2 },
  dayChipTextActive: { color: T.accent },

  // Linked user card (edit mode read-only)
  linkedUserCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.bg, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: T.line2,
  },
  linkedUserAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  linkedUserInitials: { fontSize: 14, fontWeight: '700', color: T.accent },
  linkedUserName: { fontSize: 14, fontWeight: '700', color: T.ink },
  linkedUserEmail: { fontSize: 12, color: T.muted, marginTop: 2 },
  linkedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  linkedBadgeText: { fontSize: 11, color: T.muted, fontWeight: '600' },

  // User search
  selectedUser: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.accentSoft, borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: T.accent + '30',
  },
  selectedUserAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.accent + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  selectedUserInitials: { fontSize: 13, fontWeight: '700', color: T.accent },
  selectedUserName: { fontSize: 13.5, fontWeight: '700', color: T.ink },
  selectedUserEmail: { fontSize: 11.5, color: T.muted },
  clearBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.card, alignItems: 'center', justifyContent: 'center',
  },
  searchResults: {
    backgroundColor: T.card, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2, marginTop: 6,
    overflow: 'hidden',
  },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  resultAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  resultInitials: { fontSize: 11, fontWeight: '700', color: T.accent },
  resultName: { fontSize: 13, fontWeight: '600', color: T.ink },
  resultEmail: { fontSize: 11.5, color: T.muted },

  // Footer
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: T.line,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: T.ink2 },
  primaryBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: T.success,
    shadowColor: T.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
