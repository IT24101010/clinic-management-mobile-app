import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../../api/axiosConfig';
import ErrorAlert from '../../components/shared/ErrorAlert';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

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

// ── Dropdown options ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'general',      label: 'General',      icon: 'megaphone-outline', color: '#2563EB' },
  { value: 'health-alert', label: 'Health Alert', icon: 'warning-outline',   color: '#EF4444' },
  { value: 'holiday',      label: 'Holiday',      icon: 'calendar-outline',  color: '#F97316' },
  { value: 'campaign',     label: 'Campaign',     icon: 'ribbon-outline',    color: '#7C3AED' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',        label: 'Everyone',  icon: 'people-outline'       },
  { value: 'patients',   label: 'Patients',  icon: 'person-outline'       },
  { value: 'doctors',    label: 'Doctors',   icon: 'medkit-outline'       },
  { value: 'high-risk',  label: 'High Risk', icon: 'alert-circle-outline' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    color: '#0F9D7A' },
  { value: 'medium', label: 'Medium', color: '#E0A23B' },
  { value: 'high',   label: 'High',   color: '#D6574F' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => {
  if (!d) return 'Select date';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2,'0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const thirtyDaysOut = () => new Date(Date.now() + 30 * 24 * 3600 * 1000);
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldLabel = ({ label, required }) => (
  <Text style={styles.fieldLabel}>
    {label}
    {required ? <Text style={{ color: T.danger }}> *</Text> : null}
  </Text>
);

const InputField = ({ label, required, value, onChangeText, placeholder, multiline, numberOfLines }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted2}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && styles.textarea,
          focused && styles.inputFocused,
        ]}
      />
    </View>
  );
};

// Self-contained dropdown — manages its own open state via a zIndex prop for stacking
const DropdownField = ({ label, required, value, options, onSelect, zIndex = 10 }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={[styles.fieldWrap, { zIndex: open ? zIndex : 1 }]}>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        style={[styles.dropdownBtn, open && styles.dropdownBtnOpen]}
        activeOpacity={0.85}
      >
        {selected?.icon ? (
          <Ionicons name={selected.icon} size={15} color={selected.color || T.muted} />
        ) : null}
        <Text style={[styles.dropdownValue, !selected && { color: T.muted2 }]}>
          {selected?.label || 'Select…'}
        </Text>
        <View style={{ flex: 1 }} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={T.muted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.dropdownMenu, { elevation: zIndex }]}>
          {options.map((opt, i) => {
            const isSelected = value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                style={[
                  styles.dropdownItem,
                  isSelected && styles.dropdownItemActive,
                  i < options.length - 1 && styles.dropdownItemBorder,
                ]}
                activeOpacity={0.85}
              >
                {opt.icon ? (
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={isSelected ? (opt.color || T.accent) : T.muted}
                  />
                ) : null}
                <Text style={[
                  styles.dropdownItemText,
                  isSelected && { color: opt.color || T.accent, fontWeight: '700' },
                ]}>
                  {opt.label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={14} color={opt.color || T.accent} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// iOS-only Modal date picker that renders above the tab bar
const IOSDateSheet = ({ visible, value, minimumDate, onDone, onCancel }) => {
  const [tempDate, setTempDate] = useState(value);
  React.useEffect(() => { if (visible) setTempDate(value); }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible statusBarTranslucent>
      <View style={styles.pickerBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onCancel} style={styles.pickerActionBtn}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDone(tempDate)} style={styles.pickerActionBtn}>
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            onChange={(_, d) => { if (d) setTempDate(d); }}
            style={{ width: '100%', height: 200 }}
          />
        </View>
      </View>
    </Modal>
  );
};

const DateField = ({ label, required, value, onPress }) => (
  <View style={styles.fieldWrap}>
    <FieldLabel label={label} required={required} />
    <TouchableOpacity onPress={onPress} style={styles.dateBtn} activeOpacity={0.85}>
      <Ionicons name="calendar-outline" size={15} color={T.accent} />
      <Text numberOfLines={1} style={[styles.dateBtnText, !value && { color: T.muted2 }]}>
        {fmtDate(value)}
      </Text>
      <Ionicons name="chevron-down" size={14} color={T.muted} />
    </TouchableOpacity>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AnnouncementFormScreen({ navigation, route }) {
  const existing = route?.params?.announcement;
  const isEdit   = !!existing;

  const [form, setForm] = useState({
    title:          existing?.title          || '',
    content:        existing?.content        || '',
    category:       existing?.category       || 'general',
    targetAudience: existing?.targetAudience || 'all',
    priority:       existing?.priority       || 'low',
    isActive:       existing?.isActive       !== undefined ? existing.isActive : true,
    publishDate:    existing?.publishDate    ? new Date(existing.publishDate) : new Date(),
    expiryDate:     existing?.expiryDate     ? new Date(existing.expiryDate)  : thirtyDaysOut(),
  });

  const [saving,          setSaving]          = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [error,           setError]           = useState('');
  const [confirmCfg,      setConfirmCfg]      = useState(null);
  const [showPublishPick, setShowPublishPick] = useState(false);
  const [showExpiryPick,  setShowExpiryPick]  = useState(false);

  const set = (key) => (val) => {
    setError('');
    setForm(f => ({ ...f, [key]: val }));
  };

  const validate = () => {
    if (!form.title.trim())   return 'Title is required.';
    if (!form.content.trim()) return 'Content is required.';
    if (!form.expiryDate)                    return 'Expiry date is required.';
    if (form.expiryDate <= new Date())       return 'Expiry date must be a future date.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        title:          form.title.trim(),
        content:        form.content.trim(),
        category:       form.category,
        targetAudience: form.targetAudience,
        priority:       form.priority,
        isActive:       form.isActive,
        publishDate:    form.publishDate.toISOString(),
        expiryDate:     form.expiryDate.toISOString(),
      };
      if (isEdit) {
        await api.put(`/api/announcements/${existing._id}`, payload);
      } else {
        await api.post('/api/announcements', payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save announcement');
      setSaving(false);
    }
  };

  const askHardDelete = () => setConfirmCfg({
    title:        'Permanently delete?',
    message:      `"${existing?.title}" will be removed forever and cannot be recovered.`,
    confirmText:  'Delete permanently',
    confirmColor: T.danger,
    onConfirm: async () => {
      setConfirmCfg(null);
      setDeleting(true);
      try {
        await api.delete(`/api/announcements/${existing._id}/hard`);
        navigation.goBack();
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to delete');
        setDeleting(false);
      }
    },
  });

  const selectedCat = CATEGORY_OPTIONS.find(o => o.value === form.category);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={18} color={T.ink2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Clinic Admin</Text>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Edit announcement' : 'New announcement'}
          </Text>
        </View>
        {selectedCat && (
          <View style={[styles.catBadge, { backgroundColor: selectedCat.color + '1A' }]}>
            <Ionicons name={selectedCat.icon} size={13} color={selectedCat.color} />
            <Text style={[styles.catBadgeText, { color: selectedCat.color }]}>
              {selectedCat.label}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={{ marginBottom: 12 }}>
              <ErrorAlert message={error} />
            </View>
          ) : null}

          {/* Content section */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="create-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Content</Text>
            </View>

            <InputField
              label="Title"
              required
              value={form.title}
              onChangeText={set('title')}
              placeholder="e.g. New COVID-19 Guidelines"
            />
            <InputField
              label="Content"
              required
              value={form.content}
              onChangeText={set('content')}
              placeholder="Write the full announcement here…"
              multiline
              numberOfLines={5}
            />
          </View>

          {/* Settings section — dropdowns need higher zIndex to overlap sections below */}
          <View style={[styles.section, { zIndex: 30, overflow: 'visible' }]}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="options-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Settings</Text>
            </View>

            <DropdownField
              label="Category"
              required
              value={form.category}
              options={CATEGORY_OPTIONS}
              onSelect={set('category')}
              zIndex={30}
            />
            <DropdownField
              label="Target audience"
              required
              value={form.targetAudience}
              options={AUDIENCE_OPTIONS}
              onSelect={set('targetAudience')}
              zIndex={20}
            />
            <DropdownField
              label="Priority"
              required
              value={form.priority}
              options={PRIORITY_OPTIONS}
              onSelect={set('priority')}
              zIndex={10}
            />
          </View>

          {/* Schedule section */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="calendar-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Schedule</Text>
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Publish date"
                  required
                  value={form.publishDate}
                  onPress={() => setShowPublishPick(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DateField
                  label="Expiry date"
                  required
                  value={form.expiryDate}
                  onPress={() => setShowExpiryPick(true)}
                />
              </View>
            </View>

            {/* Date range preview */}
            {form.publishDate && form.expiryDate ? (
              <View style={styles.dateRangePreview}>
                <Ionicons name="time-outline" size={12} color={T.accent} />
                <Text style={styles.dateRangeText}>
                  {fmtDate(form.publishDate)}  →  {fmtDate(form.expiryDate)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Visibility section */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="eye-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Visibility</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Announcement active</Text>
                <Text style={styles.toggleSub}>
                  {form.isActive
                    ? 'Visible to the target audience'
                    : 'Hidden — not shown to any users'}
                </Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={set('isActive')}
                trackColor={{ false: T.line2, true: T.success }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={18} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish announcement'}
            </Text>
          </TouchableOpacity>

          {/* Danger zone — edit only */}
          {isEdit && (
            <View style={styles.dangerZone}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIconWrap, { backgroundColor: T.dangerSoft }]}>
                  <Ionicons name="warning-outline" size={14} color={T.danger} />
                </View>
                <Text style={[styles.sectionLabel, { color: T.danger }]}>Danger zone</Text>
              </View>
              <Text style={styles.dangerNote}>
                Permanently removes this announcement and all its data. This action cannot be undone.
              </Text>
              <TouchableOpacity
                onPress={askHardDelete}
                disabled={deleting}
                style={[styles.dangerBtn, deleting && { opacity: 0.7 }]}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={T.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={15} color={T.danger} />
                )}
                <Text style={styles.dangerBtnText}>
                  {deleting ? 'Deleting…' : 'Permanently delete announcement'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date pickers — Android shows system dialog, iOS uses Modal sheet above tab bar */}
      {showPublishPick && Platform.OS === 'android' && (
        <DateTimePicker
          value={form.publishDate || new Date()}
          mode="date"
          display="default"
          onChange={(_, d) => { setShowPublishPick(false); if (d) set('publishDate')(d); }}
        />
      )}
      {showExpiryPick && Platform.OS === 'android' && (
        <DateTimePicker
          value={form.expiryDate || thirtyDaysOut()}
          mode="date"
          display="default"
          minimumDate={tomorrow()}
          onChange={(_, d) => { setShowExpiryPick(false); if (d) set('expiryDate')(d); }}
        />
      )}

      <IOSDateSheet
        visible={showPublishPick && Platform.OS === 'ios'}
        value={form.publishDate || new Date()}
        onDone={(d) => { set('publishDate')(d); setShowPublishPick(false); }}
        onCancel={() => setShowPublishPick(false)}
      />
      <IOSDateSheet
        visible={showExpiryPick && Platform.OS === 'ios'}
        value={form.expiryDate || thirtyDaysOut()}
        minimumDate={tomorrow()}
        onDone={(d) => { set('expiryDate')(d); setShowExpiryPick(false); }}
        onCancel={() => setShowExpiryPick(false)}
      />

      {confirmCfg && (
        <ConfirmDialog
          visible
          title={confirmCfg.title}
          message={confirmCfg.message}
          confirmText={confirmCfg.confirmText}
          confirmColor={confirmCfg.confirmColor}
          onConfirm={confirmCfg.onConfirm}
          onCancel={() => setConfirmCfg(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.bg,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub:   { fontSize: 10.5, color: T.muted, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.3 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700' },

  scrollContent: {
    paddingHorizontal: 16, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  section: {
    backgroundColor: T.card, borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: T.line,
  },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  sectionIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: T.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11.5, color: T.ink2, fontWeight: '700',
    letterSpacing: 0.3, textTransform: 'uppercase',
  },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11.5, color: T.ink2, fontWeight: '600',
    marginBottom: 6, letterSpacing: 0.1,
  },
  input: {
    height: 46, backgroundColor: T.bg, borderRadius: 12,
    borderWidth: 1, borderColor: T.line2,
    paddingHorizontal: 14, fontSize: 13.5, color: T.ink,
  },
  textarea: {
    height: 110, paddingTop: 12, paddingBottom: 12,
    textAlignVertical: 'top',
  },
  inputFocused: { borderColor: T.accent, backgroundColor: T.accentSoft },

  // Dropdown
  dropdownBtn: {
    height: 46, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, backgroundColor: T.bg,
    borderRadius: 12, borderWidth: 1, borderColor: T.line2,
  },
  dropdownBtnOpen: { borderColor: T.accent, backgroundColor: T.accentSoft },
  dropdownValue: { fontSize: 13.5, color: T.ink, fontWeight: '500' },
  dropdownMenu: {
    position: 'absolute', top: 80, left: 0, right: 0,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  dropdownItemActive: { backgroundColor: T.accentSoft },
  dropdownItemText: { flex: 1, fontSize: 13.5, color: T.ink2, fontWeight: '500' },

  // Date
  rowFields: { flexDirection: 'row', gap: 12 },
  dateBtn: {
    height: 46, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, backgroundColor: T.bg,
    borderRadius: 12, borderWidth: 1, borderColor: T.line2,
  },
  dateBtnText: { fontSize: 12.5, color: T.ink, fontWeight: '600', flex: 1, flexShrink: 1 },

  // iOS date picker sheet
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(14,20,34,0.42)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: T.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 20,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  pickerActionBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  pickerCancelText: { fontSize: 15, color: T.muted, fontWeight: '600' },
  pickerDoneText:   { fontSize: 15, color: T.accent, fontWeight: '700' },
  dateRangePreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: T.accentSoft, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7DBFF', marginTop: -4,
  },
  dateRangeText: { fontSize: 11.5, color: T.accent, fontWeight: '600' },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: T.ink },
  toggleSub:   { fontSize: 11.5, color: T.muted, marginTop: 3, lineHeight: 16 },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
    backgroundColor: T.ink, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Danger zone
  dangerZone: {
    marginTop: 16, borderRadius: 18, padding: 16,
    backgroundColor: T.card, borderWidth: 1, borderColor: '#F0C2C0',
  },
  dangerNote: {
    fontSize: 12, color: T.muted, lineHeight: 17,
    marginBottom: 14, marginTop: -6,
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.dangerSoft, borderWidth: 1, borderColor: '#F0C2C0',
  },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: T.danger },
});
