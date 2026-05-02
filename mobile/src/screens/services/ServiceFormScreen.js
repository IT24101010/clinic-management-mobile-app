import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldLabel = ({ label, required }) => (
  <Text style={styles.fieldLabel}>
    {label}
    {required ? <Text style={{ color: T.danger }}> *</Text> : null}
  </Text>
);

const InputField = ({
  label, required, value, onChangeText, placeholder,
  keyboardType, multiline, numberOfLines, autoCapitalize, flex,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldWrap, flex && { flex }]}>
      <FieldLabel label={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted2}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize || 'sentences'}
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

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ServiceFormScreen({ navigation, route }) {
  const existing = route?.params?.service;
  const isEdit   = !!existing;

  const [form, setForm] = useState({
    serviceName: existing?.serviceName  || '',
    category:    existing?.category     || '',
    description: existing?.description  || '',
    price:       existing?.price        != null ? String(existing.price)    : '',
    duration:    existing?.duration     != null ? String(existing.duration) : '',
    imageUrl:    existing?.imageUrl     || '',
    isActive:    existing?.isActive     !== undefined ? existing.isActive   : true,
  });

  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState('');
  const [confirmCfg, setConfirmCfg] = useState(null);

  const set = (key) => (val) => {
    setError('');
    setForm(f => ({ ...f, [key]: val }));
  };

  const validate = () => {
    if (!form.serviceName.trim())                        return 'Service name is required.';
    if (!form.price.trim() || isNaN(Number(form.price))) return 'A valid price is required.';
    if (Number(form.price) < 0)                         return 'Price cannot be negative.';
    if (!form.duration.trim() || isNaN(Number(form.duration))) return 'A valid duration (minutes) is required.';
    if (Number(form.duration) <= 0)                     return 'Duration must be greater than 0.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        serviceName: form.serviceName.trim(),
        category:    form.category.trim(),
        description: form.description.trim(),
        price:       Number(form.price),
        duration:    Number(form.duration),
        imageUrl:    form.imageUrl.trim(),
        isActive:    form.isActive,
      };

      if (isEdit) {
        await api.put(`/api/services/${existing._id}`, payload);
      } else {
        await api.post('/api/services', payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save service');
      setSaving(false);
    }
  };

  const askHardDelete = () => setConfirmCfg({
    title:        'Permanently delete?',
    message:      `"${existing?.serviceName}" will be removed forever and cannot be recovered.`,
    confirmText:  'Delete permanently',
    confirmColor: T.danger,
    onConfirm: async () => {
      setConfirmCfg(null);
      setDeleting(true);
      try {
        await api.delete(`/api/services/${existing._id}/hard`);
        navigation.goBack();
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to delete');
        setDeleting(false);
      }
    },
  });

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
          <Text style={styles.headerTitle}>{isEdit ? 'Edit service' : 'New service'}</Text>
        </View>
        {isEdit && (
          <View style={[styles.chip, { backgroundColor: form.isActive ? T.successSoft : '#ECEEF2' }]}>
            <View style={[styles.chipDot, { backgroundColor: form.isActive ? T.success : T.muted2 }]} />
            <Text style={[styles.chipText, { color: form.isActive ? '#0A6B55' : '#4B5262' }]}>
              {form.isActive ? 'Active' : 'Inactive'}
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

          {/* Basic info */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="create-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Basic info</Text>
            </View>

            <InputField
              label="Service name"
              required
              value={form.serviceName}
              onChangeText={set('serviceName')}
              placeholder="e.g. Dental Checkup"
            />
            <InputField
              label="Category"
              value={form.category}
              onChangeText={set('category')}
              placeholder="e.g. Dental, General, Lab"
            />
            <InputField
              label="Description"
              value={form.description}
              onChangeText={set('description')}
              placeholder="Brief description of the service…"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Pricing & Duration */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="pricetag-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Pricing & duration</Text>
            </View>

            <View style={styles.rowFields}>
              <InputField
                label="Price (Rs.)"
                required
                value={form.price}
                onChangeText={set('price')}
                placeholder="0"
                keyboardType="numeric"
                autoCapitalize="none"
                flex={1}
              />
              <InputField
                label="Duration (min)"
                required
                value={form.duration}
                onChangeText={set('duration')}
                placeholder="30"
                keyboardType="numeric"
                autoCapitalize="none"
                flex={1}
              />
            </View>

            {/* Preview row */}
            {(form.price || form.duration) ? (
              <View style={styles.previewRow}>
                {form.price ? (
                  <View style={styles.previewChip}>
                    <Ionicons name="cash-outline" size={12} color={T.success} />
                    <Text style={styles.previewChipText}>
                      Rs. {Number(form.price || 0).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
                {form.duration ? (
                  <View style={styles.previewChip}>
                    <Ionicons name="time-outline" size={12} color={T.accent} />
                    <Text style={styles.previewChipText}>{form.duration} min</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Media */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="image-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Banner image</Text>
            </View>

            <InputField
              label="Image URL"
              value={form.imageUrl}
              onChangeText={set('imageUrl')}
              placeholder="https://example.com/image.jpg"
              keyboardType="url"
              autoCapitalize="none"
            />

            {form.imageUrl ? (
              <View style={styles.urlPreviewBox}>
                <Ionicons name="link-outline" size={13} color={T.accent} />
                <Text numberOfLines={1} style={styles.urlPreviewText}>{form.imageUrl}</Text>
                <TouchableOpacity onPress={() => set('imageUrl')('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={14} color={T.muted2} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.urlEmptyBox}>
                <Ionicons name="image-outline" size={22} color={T.muted2} />
                <Text style={styles.urlEmptyText}>No image URL set</Text>
              </View>
            )}
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="eye-outline" size={14} color={T.accent} />
              </View>
              <Text style={styles.sectionLabel}>Availability</Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Service active</Text>
                <Text style={styles.toggleSub}>
                  {form.isActive
                    ? 'Visible to patients in the services list'
                    : 'Hidden — patients cannot book this service'}
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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
            </Text>
          </TouchableOpacity>

          {/* Danger zone — edit mode only */}
          {isEdit && (
            <View style={styles.dangerZone}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIconWrap, { backgroundColor: T.dangerSoft }]}>
                  <Ionicons name="warning-outline" size={14} color={T.danger} />
                </View>
                <Text style={[styles.sectionLabel, { color: T.danger }]}>Danger zone</Text>
              </View>
              <Text style={styles.dangerNote}>
                Permanently deletes this service and all associated data. This action cannot be undone.
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
                  {deleting ? 'Deleting…' : 'Permanently delete service'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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

  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
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

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.1 },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },

  // Section
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

  // Fields
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
    height: 96, paddingTop: 12, paddingBottom: 12,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: T.accent,
    backgroundColor: T.accentSoft,
  },

  rowFields: { flexDirection: 'row', gap: 12 },

  // Preview chips
  previewRow: {
    flexDirection: 'row', gap: 8, marginTop: -2, marginBottom: 4,
  },
  previewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: T.bg,
    borderWidth: 1, borderColor: T.line2,
  },
  previewChipText: { fontSize: 11.5, fontWeight: '600', color: T.ink2 },

  // URL preview
  urlPreviewBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: -4, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: T.accentSoft, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7DBFF',
  },
  urlPreviewText: { flex: 1, fontSize: 11, color: T.accent, fontWeight: '500' },
  urlEmptyBox: {
    alignItems: 'center', gap: 6, paddingVertical: 18,
    borderRadius: 12, borderWidth: 1, borderColor: T.line2,
    borderStyle: 'dashed', marginTop: -4,
  },
  urlEmptyText: { fontSize: 12, color: T.muted2, fontWeight: '500' },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: T.ink },
  toggleSub:   { fontSize: 11.5, color: T.muted, marginTop: 3, lineHeight: 16 },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
    backgroundColor: T.ink, marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Danger zone
  dangerZone: {
    marginTop: 16, borderRadius: 18, padding: 16,
    backgroundColor: T.card,
    borderWidth: 1, borderColor: '#F0C2C0',
  },
  dangerNote: {
    fontSize: 12, color: T.muted, lineHeight: 17,
    marginBottom: 14, marginTop: -6,
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.dangerSoft,
    borderWidth: 1, borderColor: '#F0C2C0',
  },
  dangerBtnText: { fontSize: 13, fontWeight: '700', color: T.danger },
});
