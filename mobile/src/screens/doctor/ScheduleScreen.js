import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SLOT_STATUS_FILTERS = ['All', 'Open', 'Booked', 'Full', 'Closed'];

const SLOT_STATUS_CFG = {
  open:   { label: 'Open',   color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  booked: { label: 'Booked', color: '#2563EB', bg: '#EFF6FF', icon: 'people-outline' },
  full:   { label: 'Full',   color: '#F59E0B', bg: '#FFFBEB', icon: 'alert-circle-outline' },
  closed: { label: 'Closed', color: '#94A3B8', bg: '#F1F5F9', icon: 'close-circle-outline' },
};

const APPT_STATUS_CFG = {
  pending:   { color: '#F59E0B', bg: '#FFFBEB' },
  confirmed: { color: '#2563EB', bg: '#EFF6FF' },
  completed: { color: '#059669', bg: '#ECFDF5' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const dateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getSlotStatus = (slot) => {
  if (!slot.isActive) return 'closed';
  if (slot.currentBookings >= slot.maxCapacity) return 'full';
  if (slot.currentBookings > 0) return 'booked';
  return 'open';
};

const buildDateStrip = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = -3; i <= 13; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

// ─── PatientAvatarRow ─────────────────────────────────────────────────────────
// Compact stacked avatar preview: shows up to 3 patient initials/photos

const PatientAvatarRow = ({ appointments }) => {
  const visible = appointments.slice(0, 3);
  const extra = appointments.length - 3;
  if (appointments.length === 0) return null;

  return (
    <View style={styles.avatarRowWrap}>
      {visible.map((appt, i) => {
        const name = appt.patientId?.name || 'P';
        return (
          <View
            key={appt._id}
            style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }]}
          >
            {appt.patientId?.profileImage ? (
              <Image source={{ uri: appt.patientId.profileImage }} style={styles.miniAvatarImg} />
            ) : (
              <View style={styles.miniAvatarFallback}>
                <Text style={styles.miniAvatarInitial}>{name[0]?.toUpperCase()}</Text>
              </View>
            )}
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[styles.miniAvatar, styles.miniAvatarExtra, { marginLeft: -8 }]}>
          <Text style={styles.miniAvatarExtraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

// ─── SlotCard ─────────────────────────────────────────────────────────────────

const SlotCard = ({ slot, appointments, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: (index % 10) * 55,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 50, bounciness: 2, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 50, bounciness: 2, useNativeDriver: true }).start();

  const status = getSlotStatus(slot);
  const cfg = SLOT_STATUS_CFG[status];
  const filled = slot.maxCapacity > 0 ? slot.currentBookings / slot.maxCapacity : 0;
  const filledPct = Math.min(filled * 100, 100);

  // Capacity bar color
  const barColor = status === 'full' ? '#F59E0B' : status === 'closed' ? '#94A3B8' : colors.primary;

  // Active appointments (not cancelled)
  const activeAppts = appointments.filter(a => a.status !== 'cancelled');

  const isTappable = appointments.length > 0;

  return (
    <Animated.View style={[styles.slotCardWrap, { opacity: fadeAnim, transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={isTappable ? onPress : undefined}
        onPressIn={isTappable ? onPressIn : undefined}
        onPressOut={isTappable ? onPressOut : undefined}
        activeOpacity={isTappable ? 1 : 1}
        disabled={!isTappable}
      >
        <View style={[styles.slotCard, !isTappable && styles.slotCardDim]}>
          {/* Left: time block */}
          <View style={styles.timeBlock}>
            <Text style={styles.timeStart}>{slot.startTime}</Text>
            <View style={styles.timeDivider} />
            <Text style={styles.timeEnd}>{slot.endTime}</Text>
          </View>

          {/* Center: info */}
          <View style={styles.slotInfo}>
            {/* Status badge + capacity text */}
            <View style={styles.slotTopRow}>
              <View style={[styles.slotStatusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                <Text style={[styles.slotStatusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <Text style={styles.capacityText}>
                {slot.currentBookings} / {slot.maxCapacity} booked
              </Text>
            </View>

            {/* Capacity bar */}
            <View style={styles.capacityBarBg}>
              <View
                style={[
                  styles.capacityBarFill,
                  { width: `${filledPct}%`, backgroundColor: barColor },
                ]}
              />
            </View>

            {/* Patient previews or empty message */}
            {activeAppts.length > 0 ? (
              <View style={styles.patientPreviewRow}>
                <PatientAvatarRow appointments={activeAppts} />
                <Text style={styles.patientPreviewText} numberOfLines={1}>
                  {activeAppts.map(a => a.patientId?.name?.split(' ')[0] || 'Patient').join(', ')}
                </Text>
              </View>
            ) : (
              <Text style={styles.noBookingsText}>No bookings yet</Text>
            )}
          </View>

          {/* Right: chevron */}
          <View style={styles.slotRight}>
            {isTappable && (
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Summary Chips ────────────────────────────────────────────────────────────

const SummaryChip = ({ icon, label, value, color, bg }) => (
  <View style={[styles.summaryChip, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
  </View>
);

// ─── ScheduleScreen ───────────────────────────────────────────────────────────

const ScheduleScreen = ({ navigation }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeFilter, setActiveFilter] = useState('All');

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [slotsRes, apptsRes] = await Promise.all([
        api.get('/api/timeslots/doctor/my?includePast=true'),
        api.get('/api/appointments/doctor/my'),
      ]);
      setSlots(slotsRes.data || []);
      setAppointments(apptsRes.data || []);
    } catch (err) {
      console.log('ScheduleScreen fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <LoadingSpinner />;

  const selectedKey = dateKey(selectedDate);
  const dateStrip = buildDateStrip();

  // Slots for selected date, sorted by start time
  const slotsForDay = slots
    .filter(s => dateKey(s.date) === selectedKey)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Group appointments by slotId
  const apptsBySlot = {};
  appointments.forEach(appt => {
    const slotId = appt.timeSlotId?._id || appt.timeSlotId;
    if (!slotId) return;
    if (!apptsBySlot[slotId]) apptsBySlot[slotId] = [];
    apptsBySlot[slotId].push(appt);
  });

  // Apply status filter
  const filteredSlots = slotsForDay.filter(slot => {
    if (activeFilter === 'All') return true;
    return getSlotStatus(slot) === activeFilter.toLowerCase();
  });

  // Day summary counts
  const totalSlots = slotsForDay.length;
  const totalBooked = slotsForDay.reduce((sum, s) => sum + (s.currentBookings || 0), 0);
  const fullSlots = slotsForDay.filter(s => getSlotStatus(s) === 'full').length;

  // Count days that have slots (for date strip dots)
  const slotDateKeys = new Set(slots.map(s => dateKey(s.date)));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1E3A5F', '#1D4ED8', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View style={{ opacity: headerFade }}>
          {/* Title row */}
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>My Schedule</Text>
              <Text style={styles.headerSubtitle}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.headerBadge}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.headerBadgeText}>{totalSlots} slot{totalSlots !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Summary chips */}
          {totalSlots > 0 && (
            <View style={styles.summaryRow}>
              <SummaryChip
                icon="grid-outline"
                label="Slots"
                value={totalSlots}
                color="#BAE6FD"
                bg="rgba(186,230,253,0.15)"
              />
              <SummaryChip
                icon="people-outline"
                label="Booked"
                value={totalBooked}
                color="#6EE7B7"
                bg="rgba(110,231,183,0.15)"
              />
              <SummaryChip
                icon="alert-circle-outline"
                label="Full"
                value={fullSlots}
                color="#FCD34D"
                bg="rgba(252,211,77,0.15)"
              />
            </View>
          )}

          {/* Date strip */}
          <FlatList
            data={dateStrip}
            keyExtractor={item => item.toISOString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
            initialScrollIndex={3}
            getItemLayout={(_, i) => ({ length: 58, offset: 58 * i, index: i })}
            style={{ marginTop: 16 }}
            renderItem={({ item: date }) => {
              const key = dateKey(date);
              const isSelected = key === selectedKey;
              const isToday = dateKey(date) === dateKey(today);
              const hasSlots = slotDateKeys.has(key);

              return (
                <TouchableOpacity
                  onPress={() => setSelectedDate(new Date(date))}
                  activeOpacity={0.75}
                  style={[styles.dateItem, isSelected && styles.dateItemActive]}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                    {DAY_LABELS[date.getDay()]}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>
                    {date.getDate()}
                  </Text>
                  {hasSlots ? (
                    <View style={[styles.dateDot, isSelected && styles.dateDotActive]} />
                  ) : (
                    <View style={styles.dateDotEmpty} />
                  )}
                  {isToday && !isSelected && <View style={styles.todayUnderline} />}
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      </LinearGradient>

      {/* ── Filter chips ── */}
      <Animated.View style={[styles.filterBar, { opacity: headerFade }]}>
        <FlatList
          data={SLOT_STATUS_FILTERS}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item)}
                activeOpacity={0.75}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>

      {/* ── Slot List ── */}
      <Animated.View style={[{ flex: 1 }, { opacity: contentFade }]}>
        {filteredSlots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {slotsForDay.length === 0 ? 'No slots scheduled' : `No ${activeFilter.toLowerCase()} slots`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {slotsForDay.length === 0
                ? 'Admin has not added time slots for this day'
                : 'Try a different filter'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredSlots}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            renderItem={({ item: slot, index }) => {
              const slotAppts = apptsBySlot[slot._id] || [];
              return (
                <SlotCard
                  slot={slot}
                  appointments={slotAppts}
                  index={index}
                  onPress={() =>
                    navigation.navigate('SlotPatientsSheet', {
                      slot,
                      appointments: slotAppts,
                    })
                  }
                />
              );
            }}
          />
        )}
      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 2,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  /* ── Summary Chips ── */
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },

  /* ── Date Strip ── */
  dateStrip: {
    paddingHorizontal: 16,
    gap: 4,
  },
  dateItem: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 3,
  },
  dateItemActive: {
    backgroundColor: '#fff',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayLabelActive: { color: colors.primary },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  dateNumActive: { color: colors.primary },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dateDotActive: { backgroundColor: colors.primary },
  dateDotEmpty: { width: 5, height: 5 },
  todayUnderline: {
    position: 'absolute',
    bottom: 5,
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  /* ── Filters ── */
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  /* ── List ── */
  listContent: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 148 : 124,
  },

  /* ── Slot Card ── */
  slotCardWrap: {
    marginBottom: 10,
  },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  slotCardDim: {
    opacity: 0.7,
  },

  /* Time block */
  timeBlock: {
    width: 58,
    alignItems: 'center',
    gap: 3,
  },
  timeStart: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  timeDivider: {
    width: 18,
    height: 1.5,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  timeEnd: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Slot info */
  slotInfo: {
    flex: 1,
    gap: 8,
  },
  slotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  slotStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Capacity bar */
  capacityBarBg: {
    height: 5,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Patient preview */
  patientPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  miniAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarInitial: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  miniAvatarExtra: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarExtraText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  patientPreviewText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noBookingsText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  /* Chevron */
  slotRight: {
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Empty State ── */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ScheduleScreen;
