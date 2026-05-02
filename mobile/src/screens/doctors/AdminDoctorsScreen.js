import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import api from '../../api/axiosConfig';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DoctorFormScreen from './DoctorFormScreen';

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
  warn:        '#E0A23B',
  warnSoft:    '#FBEFD6',
  danger:      '#D6574F',
  dangerSoft:  '#FADBD9',
};

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'busy',      label: 'Busy' },
];

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];
const DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const toneFor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';

// ── Doctor Card ───────────────────────────────────────────────────────────────

function DoctorCard({ doctor, index, onPress }) {
  const press = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(enter, {
      toValue: 1, delay: (index % 8) * 50,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const pressIn  = () => Animated.spring(press, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const pressOut = () => Animated.spring(press, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  const { userId, specialization, experience, consultationFee, isAvailable } = doctor;
  const name   = userId?.name || 'Doctor';
  const avatar = userId?.profileImage;
  const initials = initialsOf(name);
  const bgTone   = toneFor(doctor._id || name);

  return (
    <Animated.View style={{
      opacity: enter,
      transform: [
        { scale: press },
        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
      ],
    }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: bgTone }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={[
            styles.availDot,
            { backgroundColor: isAvailable ? T.success : T.muted2 },
          ]} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.doctorName} numberOfLines={1}>{name}</Text>
          <Text style={styles.doctorSpec} numberOfLines={1}>{specialization || 'General'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="briefcase-outline" size={11} color={T.muted2} />
            <Text style={styles.metaText}>{experience || 0} yrs</Text>
            <View style={styles.metaSep} />
            <Ionicons name="cash-outline" size={11} color={T.muted2} />
            <Text style={styles.metaText}>Rs. {consultationFee ?? '—'}</Text>
          </View>
        </View>

        {/* Right */}
        <View style={styles.cardRight}>
          <View style={[
            styles.availPill,
            { backgroundColor: isAvailable ? T.successSoft : T.bg },
          ]}>
            <View style={[styles.availPillDot, { backgroundColor: isAvailable ? T.success : T.muted2 }]} />
            <Text style={[styles.availPillText, { color: isAvailable ? '#0A6B55' : T.muted }]}>
              {isAvailable ? 'Available' : 'Busy'}
            </Text>
          </View>
          <View style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={14} color={T.muted} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Detail Bottom Sheet ───────────────────────────────────────────────────────

function DoctorDetailModal({ visible, doctor, onClose, onToggleAvail, onDelete, onEdit }) {
  if (!doctor) return null;
  const { userId, specialization, experience, consultationFee, bio, isAvailable, availableSlots = [] } = doctor;
  const name   = userId?.name || 'Doctor';
  const avatar = userId?.profileImage;
  const bgTone = toneFor(doctor._id || name);

  // Unique days from slots
  const slotDays = [...new Set(availableSlots.map(s => s.day))];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabberWrap}><View style={styles.grabber} /></View>

          {/* Header */}
          <View style={styles.sheetHead}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={18} color={T.ink2} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Doctor profile</Text>
            <View style={styles.sheetHeadActions}>
              <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={16} color={T.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={16} color={T.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Profile card */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.profileAvatar} />
                ) : (
                  <View style={[styles.profileAvatarFallback, { backgroundColor: bgTone }]}>
                    <Text style={styles.profileAvatarText}>{initialsOf(name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.profileSpec}>{specialization || 'General Practice'}</Text>
                  {userId?.email ? (
                    <Text style={styles.profileEmail} numberOfLines={1}>{userId.email}</Text>
                  ) : null}
                </View>
                {/* Toggle availability */}
                <TouchableOpacity
                  onPress={onToggleAvail}
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: isAvailable ? T.successSoft : T.accentSoft },
                  ]}
                >
                  <Ionicons
                    name={isAvailable ? 'pause-circle' : 'play-circle'}
                    size={16}
                    color={isAvailable ? T.success : T.accent}
                  />
                </TouchableOpacity>
              </View>

              {bio ? (
                <View style={styles.bioBox}>
                  <Text style={styles.bioLabel}>About</Text>
                  <Text style={styles.bioText}>{bio}</Text>
                </View>
              ) : null}
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Ionicons name="briefcase-outline" size={16} color={T.accent} />
                <Text style={styles.statValue}>{experience ?? '—'}</Text>
                <Text style={styles.statLabel}>Years exp.</Text>
              </View>
              <View style={styles.statTile}>
                <Ionicons name="cash-outline" size={16} color={T.success} />
                <Text style={styles.statValue}>Rs. {consultationFee ?? '—'}</Text>
                <Text style={styles.statLabel}>Consult fee</Text>
              </View>
              <View style={styles.statTile}>
                <Ionicons name="calendar-outline" size={16} color={T.warn} />
                <Text style={styles.statValue}>{availableSlots.length}</Text>
                <Text style={styles.statLabel}>Slots</Text>
              </View>
            </View>

            {/* Available days */}
            {slotDays.length > 0 && (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionBoxLabel}>Available days</Text>
                <View style={styles.dayChips}>
                  {DAYS.map(d => {
                    const active = slotDays.includes(d);
                    return (
                      <View
                        key={d}
                        style={[
                          styles.dayChip,
                          active ? { backgroundColor: T.accentSoft, borderColor: T.accent + '40' }
                                 : { backgroundColor: T.bg, borderColor: T.line2 },
                        ]}
                      >
                        <Text style={[styles.dayChipText, { color: active ? T.accent : T.muted2 }]}>
                          {d.slice(0, 3)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Status */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionBoxLabel}>Availability status</Text>
              <TouchableOpacity
                onPress={onToggleAvail}
                style={[
                  styles.statusToggleRow,
                  { borderColor: isAvailable ? T.success + '40' : T.line2 },
                ]}
              >
                <View style={[
                  styles.statusToggleIcon,
                  { backgroundColor: isAvailable ? T.successSoft : T.bg },
                ]}>
                  <Ionicons
                    name={isAvailable ? 'checkmark-circle' : 'time-outline'}
                    size={20}
                    color={isAvailable ? T.success : T.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusToggleTitle, { color: isAvailable ? T.success : T.ink2 }]}>
                    {isAvailable ? 'Available for appointments' : 'Not currently available'}
                  </Text>
                  <Text style={styles.statusToggleSub}>
                    Tap to {isAvailable ? 'mark as busy' : 'set available'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={T.muted2} />
              </TouchableOpacity>
            </View>

            {/* Edit */}
            <TouchableOpacity onPress={onEdit} style={styles.editBtn} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={16} color={T.accent} />
              <Text style={styles.editBtnText}>Edit profile</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={16} color={T.danger} />
              <Text style={styles.deleteBtnText}>Remove doctor</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminDoctorsScreen() {
  const [doctors, setDoctors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const [query, setQuery]           = useState('');
  const [filter, setFilter]         = useState('all');

  const [selected, setSelected]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // doctor to edit
  const [showEdit, setShowEdit]     = useState(false);
  const [confirmCfg, setConfirmCfg] = useState(null);

  // FAB scale animation
  const fabAnim = useRef(new Animated.Value(0)).current;

  const fetchDoctors = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/doctors');
      setDoctors(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchDoctors();
    Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }).start();
  }, [fetchDoctors]));

  const onRefresh = () => { setRefreshing(true); fetchDoctors(); };

  const filtered = useMemo(() => {
    let list = doctors;
    if (filter === 'available') list = list.filter(d => d.isAvailable);
    if (filter === 'busy')      list = list.filter(d => !d.isAvailable);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(d =>
        (d.userId?.name || '').toLowerCase().includes(q) ||
        (d.specialization || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, filter, query]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2500);
  };

  const toggleAvailability = async (doctor) => {
    try {
      await api.put(`/api/doctors/${doctor._id}`, { isAvailable: !doctor.isAvailable });
      showSuccess(`Dr. ${doctor.userId?.name || ''} marked as ${!doctor.isAvailable ? 'available' : 'busy'}`);
      setShowDetail(false);
      fetchDoctors();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update availability');
    }
  };

  const deleteDoctor = async (doctor) => {
    try {
      await api.delete(`/api/doctors/${doctor._id}`);
      showSuccess('Doctor removed successfully');
      setShowDetail(false);
      fetchDoctors();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to remove doctor');
    }
  };

  const openDetail = (doctor) => { setSelected(doctor); setShowDetail(true); };

  const openEdit = () => {
    setShowDetail(false);
    setTimeout(() => { setEditTarget(selected); setShowEdit(true); }, 320);
  };

  const askDelete = () => {
    // Close the bottom sheet first so the confirm dialog is not behind the modal
    setShowDetail(false);
    const target = selected; // capture before state clears
    setTimeout(() => setConfirmCfg({
      title: 'Remove doctor?',
      message: `Remove Dr. ${target?.userId?.name || 'this doctor'} from the system?`,
      confirmText: 'Remove',
      confirmColor: T.danger,
      onConfirm: () => { setConfirmCfg(null); deleteDoctor(target); },
    }), 320);
  };

  // Count chips
  const counts = useMemo(() => ({
    all:       doctors.length,
    available: doctors.filter(d => d.isAvailable).length,
    busy:      doctors.filter(d => !d.isAvailable).length,
  }), [doctors]);

  const ListHeader = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLabel}>Clinic Admin</Text>
          <Text style={styles.topName}>Doctors hub</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={T.ink2} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Doctors</Text>
        <Text style={styles.pageSub}>
          {loading ? '—' : `${doctors.length} doctors`} · management
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color={T.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or specialization"
          placeholderTextColor={T.muted2}
          style={styles.searchInput}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={15} color={T.muted2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.85}
            style={[styles.pill, filter === f.id && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f.id && styles.pillTextActive]}>{f.label}</Text>
            <View style={[styles.pillCount, filter === f.id && styles.pillCountActive]}>
              <Text style={[styles.pillCountText, filter === f.id && styles.pillCountTextActive]}>
                {counts[f.id]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={{ marginBottom: 8 }}><ErrorAlert message={error} /></View>
      ) : null}

      {success ? (
        <View style={styles.successBar}>
          <Ionicons name="checkmark-circle" size={14} color={T.success} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      <Text style={styles.resultsLabel}>
        {filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found
      </Text>
    </View>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <FlatList
        data={filtered}
        keyExtractor={it => it._id}
        renderItem={({ item, index }) => (
          <DoctorCard doctor={item} index={index} onPress={() => openDetail(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={34} color={T.muted2} />
            <Text style={styles.emptyTitle}>No doctors found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters.</Text>
          </View>
        }
      />

      {/* FAB */}
      <Animated.View style={[
        styles.fab,
        {
          transform: [
            { scale: fabAnim },
            { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          ],
        },
      ]}>
        <TouchableOpacity
          style={styles.fabBtn}
          activeOpacity={0.9}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Detail modal */}
      <DoctorDetailModal
        visible={showDetail}
        doctor={selected}
        onClose={() => setShowDetail(false)}
        onToggleAvail={() => toggleAvailability(selected)}
        onDelete={askDelete}
        onEdit={openEdit}
      />

      {/* Add doctor form */}
      <DoctorFormScreen
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          showSuccess('Doctor added successfully');
          fetchDoctors();
        }}
      />

      {/* Edit doctor form */}
      <DoctorFormScreen
        visible={showEdit}
        editDoctor={editTarget}
        onClose={() => { setShowEdit(false); setEditTarget(null); }}
        onSuccess={() => {
          setShowEdit(false);
          setEditTarget(null);
          showSuccess('Doctor profile updated');
          fetchDoctors();
        }}
      />

      {/* Confirm dialog — always mounted so Paper Portal animates properly */}
      <ConfirmDialog
        visible={!!confirmCfg}
        title={confirmCfg?.title || ''}
        message={confirmCfg?.message || ''}
        confirmText={confirmCfg?.confirmText || 'Confirm'}
        confirmColor={confirmCfg?.confirmColor}
        onConfirm={confirmCfg?.onConfirm || (() => {})}
        onCancel={() => setConfirmCfg(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },

  // Top bar
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 52,
    paddingBottom: 6,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: T.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.3 },
  topLabel: { fontSize: 11, color: T.muted, fontWeight: '500' },
  topName:  { fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.2 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.card, borderWidth: 1, borderColor: T.line2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Title
  titleRow: { paddingTop: 10, paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: T.ink, letterSpacing: -0.6 },
  pageSub: { fontSize: 13, color: T.muted, marginTop: 4 },

  // Search
  searchBox: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, gap: 8,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line2,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, padding: 0 },

  // Pills
  pillsRow: { gap: 6, paddingBottom: 14, paddingRight: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 999, backgroundColor: T.card,
    borderWidth: 1, borderColor: T.line2,
  },
  pillActive: { backgroundColor: T.ink, borderColor: T.ink },
  pillText: { fontSize: 12.5, fontWeight: '600', color: T.ink2 },
  pillTextActive: { color: '#fff' },
  pillCount: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 999, backgroundColor: T.bg, minWidth: 20, alignItems: 'center',
  },
  pillCountActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  pillCountText: { fontSize: 10.5, fontWeight: '700', color: T.muted },
  pillCountTextActive: { color: '#fff' },

  resultsLabel: {
    fontSize: 11, color: T.muted, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 2,
  },

  // Success / Error
  successBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: T.successSoft, borderRadius: 12,
  },
  successText: { fontSize: 12.5, color: '#0A6B55', fontWeight: '600' },

  // Card
  card: {
    backgroundColor: T.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: T.line,
    flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: {
    width: 52, height: 52, borderRadius: 16,
    borderWidth: 1.5, borderColor: T.line,
  },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2A2F3C', letterSpacing: 0.3 },
  availDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: T.card,
  },

  doctorName: { fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  doctorSpec: { fontSize: 12.5, color: T.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11.5, color: T.ink2, fontWeight: '500' },
  metaSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: T.muted2, marginHorizontal: 2 },

  cardRight: { alignItems: 'flex-end', gap: 8 },
  availPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  availPillDot: { width: 5, height: 5, borderRadius: 3 },
  availPillText: { fontSize: 11, fontWeight: '700' },
  arrowBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 104 : 80,
  },
  fabBtn: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16,
    elevation: 8,
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink2 },
  emptySub: { fontSize: 12.5, color: T.muted },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(14,20,34,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '90%',
  },
  grabberWrap: { alignItems: 'center', paddingVertical: 6 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.line2 },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  sheetTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  sheetHeadActions: { flexDirection: 'row', gap: 8 },

  // Detail modal internals
  profileCard: {
    backgroundColor: T.card, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: T.line,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { width: 58, height: 58, borderRadius: 18, borderWidth: 1.5, borderColor: T.line },
  profileAvatarFallback: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 21, fontWeight: '700', color: '#2A2F3C', letterSpacing: 0.4 },
  profileName: { fontSize: 18, fontWeight: '700', color: T.ink, letterSpacing: -0.3 },
  profileSpec: { fontSize: 13, color: T.muted, marginTop: 2 },
  profileEmail: { fontSize: 12, color: T.muted2, marginTop: 3 },
  toggleBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  bioBox: {
    marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: T.bg,
  },
  bioLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  bioText: { fontSize: 13, color: T.ink2, marginTop: 4, lineHeight: 19 },

  statsGrid: {
    flexDirection: 'row', gap: 8, marginTop: 10,
  },
  statTile: {
    flex: 1, backgroundColor: T.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: T.line, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginTop: 4 },
  statLabel: { fontSize: 10.5, color: T.muted, fontWeight: '500' },

  sectionBox: {
    marginTop: 10, padding: 14,
    backgroundColor: T.card, borderRadius: 16, borderWidth: 1, borderColor: T.line,
  },
  sectionBoxLabel: {
    fontSize: 10.5, color: T.muted, fontWeight: '700',
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12,
  },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  dayChipText: { fontSize: 12, fontWeight: '700' },

  statusToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    borderWidth: 1.5, backgroundColor: T.bg,
  },
  statusToggleIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statusToggleTitle: { fontSize: 13.5, fontWeight: '700' },
  statusToggleSub: { fontSize: 12, color: T.muted, marginTop: 2 },

  editBtn: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: T.accentSoft, borderWidth: 1, borderColor: T.accent + '30',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: T.accent },
  deleteBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: T.dangerSoft,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: T.danger },
});
