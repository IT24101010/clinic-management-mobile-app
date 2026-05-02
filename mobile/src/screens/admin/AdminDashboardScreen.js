import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import ErrorAlert from '../../components/shared/ErrorAlert';

// ── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg:         '#F4F5F7',
  card:       '#FFFFFF',
  line:       '#E8EAEF',
  line2:      '#E3E6EC',
  ink:        '#0E1422',
  ink2:       '#3A4254',
  muted:      '#7A8296',
  muted2:     '#A7ADBB',
  accent:     '#0B5FFF',
  accentSoft: '#E7EFFF',
  success:    '#0F9D7A',
  successSoft:'#DDF3EA',
  warn:       '#E0A23B',
  warnSoft:   '#FBEFD6',
  danger:     '#D6574F',
  dangerSoft: '#FADBD9',
  // Hero
  heroBg:     '#0E1422',
  heroInk:    '#FFFFFF',
  heroMuted:  '#8A90A3',
  heroLine:   '#1E2534',
  heroAccent: '#5A8BFF',
};

const STATUS_META = {
  pending:   { label: 'Pending',   fg: '#8A6318', bg: T.warnSoft,    dot: T.warn },
  confirmed: { label: 'Confirmed', fg: '#0A3D99', bg: T.accentSoft,  dot: T.accent },
  completed: { label: 'Completed', fg: '#0A6B55', bg: T.successSoft, dot: T.success },
  cancelled: { label: 'Cancelled', fg: '#4B5262', bg: '#ECEEF2',     dot: '#8A93A6' },
};

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const toneFor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};
const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || '?';
const fmtTime = (d) => {
  if (!d) return '--:--';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};
const fmtDayShort = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

const sameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() &&
         x.getMonth() === y.getMonth() &&
         x.getDate() === y.getDate();
};

const relTime = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDayShort(d);
};

// ── Screen ───────────────────────────────────────────────────────────────────

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [appointments, setAppointments]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [totalUsers, setTotalUsers]       = useState(0);
  const [activeDoctors, setActiveDoctors] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState('');

  const contentAnim = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const todayAppts = appointments.filter(a => sameDay(a.date, today));

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    todayAppts.forEach(a => { if (counts[a.status] != null) counts[a.status]++; });
    return counts;
  }, [appointments]);

  const completionRate = useMemo(() => {
    const done = appointments.filter(a => a.status === 'completed').length;
    const finished = appointments.filter(a => ['completed', 'cancelled'].includes(a.status)).length;
    if (finished === 0) return 0;
    return Math.round((done / finished) * 100);
  }, [appointments]);

  // 7-day sparkline (oldest → today)
  const sparkData = useMemo(() => {
    const buckets = Array(7).fill(0);
    const base = new Date(); base.setHours(0, 0, 0, 0);
    appointments.forEach(a => {
      const ad = new Date(a.date); ad.setHours(0, 0, 0, 0);
      const diff = Math.floor((base - ad) / 86400000);
      if (diff >= 0 && diff < 7) buckets[6 - diff]++;
    });
    return buckets;
  }, [appointments]);

  const upNext = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter(a => new Date(a.date).getTime() >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }, [appointments]);

  const activity = useMemo(() => {
    const apptEvents = appointments
      .filter(a => a.createdAt)
      .map(a => ({
        id: `a-${a._id}`,
        kind: 'appointment',
        icon: 'calendar-outline',
        tint: T.accent,
        tintBg: T.accentSoft,
        title: `${a.patientId?.name || 'Patient'} booked with ${a.doctorId?.name ? 'Dr ' + a.doctorId.name.replace(/^Dr\.?\s*/i, '') : 'a doctor'}`,
        time: a.createdAt,
      }));
    const annEvents = announcements
      .filter(n => n.publishDate || n.createdAt)
      .map(n => ({
        id: `n-${n._id}`,
        kind: 'announcement',
        icon: 'megaphone-outline',
        tint: '#7C3AED',
        tintBg: '#F5F3FF',
        title: `Announcement · ${n.title}`,
        time: n.publishDate || n.createdAt,
      }));
    return [...apptEvents, ...annEvents]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);
  }, [appointments, announcements]);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [apptRes, doctorRes, userRes, annRes] = await Promise.all([
        api.get('/api/appointments'),
        api.get('/api/doctors'),
        api.get('/api/users?page=1&limit=1'),
        api.get('/api/announcements').catch(() => ({ data: [] })),
      ]);
      setAppointments(apptRes.data || []);
      setActiveDoctors((doctorRes.data || []).filter(d => d.isAvailable !== false).length);
      setTotalUsers(userRes.data?.totalUsers ?? (userRes.data?.users?.length ?? 0));
      setAnnouncements(Array.isArray(annRes.data) ? annRes.data : (annRes.data?.announcements || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      contentAnim.setValue(0);
      Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, [fetchData]),
  );

  const goToManage = (screen, params) =>
    navigation.getParent()?.navigate('ManageTab', { screen, params });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'Admin').split(' ')[0];

  const QUICK_ACTIONS = [
    { key: 'newDoctor',   label: 'New doctor',       icon: 'medkit-outline',      screen: 'ManageDoctors',       params: { openForm: true } },
    { key: 'newUser',     label: 'New user',         icon: 'person-add-outline',  screen: 'ManageUsers',         params: { openForm: true } },
    { key: 'newAnn',      label: 'New announcement', icon: 'megaphone-outline',   screen: 'ManageAnnouncements', params: { openForm: true } },
    { key: 'bookings',    label: 'View bookings',    icon: 'calendar-outline',    screen: 'ManageAppointments' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={T.accent}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topLabel}>Clinic Admin</Text>
            <Text style={styles.topName} numberOfLines={1}>Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setRefreshing(true); fetchData(); }}
          >
            <Ionicons name="refresh" size={16} color={T.ink2} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          {/* Editorial greeting */}
          <View style={styles.headerBlock}>
            <Text style={styles.greetingThin}>{greeting},</Text>
            <Text style={styles.displayName} numberOfLines={1}>{firstName}.</Text>
            <Text style={styles.headerSub}>Here’s what’s happening today.</Text>
          </View>

          {!!error && <View style={styles.errorWrap}><ErrorAlert message={error} /></View>}

          {/* Hero card */}
          <HeroCard
            loading={loading}
            count={todayAppts.length}
            data={sparkData}
            statusCounts={statusCounts}
            date={today}
            onPress={() => goToManage('ManageAppointments')}
          />

          {/* Stat strip */}
          <View style={styles.statStrip}>
            <StatCard label="Users"           value={loading ? '—' : totalUsers} icon="people-outline" tint={T.accent} tintBg={T.accentSoft} />
            <StatCard label="Doctors"         value={loading ? '—' : activeDoctors} icon="medical-outline" tint={T.success} tintBg={T.successSoft} />
            <StatCard label="Completion"      value={loading ? '—' : `${completionRate}%`} icon="checkmark-done-outline" tint="#7C3AED" tintBg="#F5F3FF" />
          </View>

          {/* Quick actions */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Quick actions</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {QUICK_ACTIONS.map((a, i) => (
                <ActionChip
                  key={a.key}
                  action={a}
                  index={i}
                  onPress={() => goToManage(a.screen, a.params)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Up next */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Up next</Text>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => goToManage('ManageAppointments')}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color={T.accent} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2].map(i => <View key={i} style={styles.skeletonRow} />)}
              </View>
            ) : upNext.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-clear-outline" size={30} color={T.muted2} />
                <Text style={styles.emptyText}>No upcoming appointments</Text>
              </View>
            ) : (
              <View style={styles.upNextList}>
                {upNext.map((appt, i) => (
                  <UpNextRow
                    key={appt._id}
                    appt={appt}
                    isLast={i === upNext.length - 1}
                    onPress={() => goToManage('ManageAppointments')}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Recent activity</Text>
            </View>

            {loading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2].map(i => <View key={i} style={styles.skeletonRow} />)}
              </View>
            ) : activity.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={30} color={T.muted2} />
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {activity.map((ev, i) => (
                  <ActivityRow key={ev.id} ev={ev} isLast={i === activity.length - 1} />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({ loading, count, data, statusCounts, date, onPress }) {
  const max = Math.max(1, ...data);
  const dateLabel = new Date(date).toLocaleDateString(undefined, {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.hero}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroDatePill}>
          <Ionicons name="calendar-outline" size={12} color={T.heroMuted} />
          <Text style={styles.heroDateText}>{dateLabel}</Text>
        </View>
        <Text style={styles.heroMicroLabel}>TODAY</Text>
      </View>

      <View style={styles.heroStatRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroBigNum}>{loading ? '—' : count}</Text>
          <Text style={styles.heroBigLabel}>appointments scheduled</Text>
        </View>

        {/* Sparkline bars */}
        <View style={styles.spark}>
          {data.map((v, i) => {
            const h = 6 + Math.round((v / max) * 38);
            const isToday = i === data.length - 1;
            return (
              <View
                key={i}
                style={[
                  styles.sparkBar,
                  { height: h, backgroundColor: isToday ? T.heroAccent : '#2A3142' },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* status dots row */}
      <View style={styles.heroStatusRow}>
        <HeroDot color={T.accent}  label="Confirmed" value={statusCounts.confirmed} />
        <HeroDot color={T.warn}    label="Pending"   value={statusCounts.pending} />
        <HeroDot color={T.success} label="Completed" value={statusCounts.completed} />
        <HeroDot color="#8A93A6"   label="Cancelled" value={statusCounts.cancelled} />
      </View>

      <View style={styles.heroCta}>
        <Text style={styles.heroCtaText}>View schedule</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function HeroDot({ color, label, value }) {
  return (
    <View style={styles.heroDotItem}>
      <View style={[styles.heroDot, { backgroundColor: color }]} />
      <Text style={styles.heroDotVal}>{value}</Text>
      <Text style={styles.heroDotLabel}>{label}</Text>
    </View>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tint, tintBg }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Action chip ──────────────────────────────────────────────────────────────

function ActionChip({ action, index, onPress }) {
  const press = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(enter, {
      toValue: 1, delay: index * 60,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const pressIn  = () => Animated.spring(press, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const pressOut = () => Animated.spring(press, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  return (
    <Animated.View style={{
      opacity: enter,
      transform: [
        { scale: press },
        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      ],
    }}>
      <TouchableOpacity
        style={styles.actionChip}
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        <View style={styles.actionChipIcon}>
          <Ionicons name={action.icon} size={15} color={T.ink} />
        </View>
        <Text style={styles.actionChipLabel}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Up next row ──────────────────────────────────────────────────────────────

function UpNextRow({ appt, isLast, onPress }) {
  const patient = appt.patientId || {};
  const doctor  = appt.doctorId  || {};
  const m = STATUS_META[appt.status] || STATUS_META.pending;
  const isRed = appt.priorityFlag === 'red';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.upNextRow, !isLast && styles.rowBorder]}
    >
      <View style={[styles.avatar, { backgroundColor: toneFor(patient._id || patient.name) }]}>
        <Text style={styles.avatarText}>{initialsOf(patient.name || 'P')}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowName} numberOfLines={1}>
            {patient.name || 'Unknown'}
          </Text>
          {isRed && <View style={styles.priorityDot} />}
        </View>
        <Text style={styles.rowSub} numberOfLines={1}>
          {doctor.name ? `Dr ${doctor.name.replace(/^Dr\.?\s*/i, '')}` : 'Unassigned'}
          {' · '}{fmtDayShort(appt.date)} · {fmtTime(appt.date)}
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: m.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: m.dot }]} />
        <Text style={[styles.statusText, { color: m.fg }]}>{m.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ ev, isLast }) {
  return (
    <View style={[styles.activityRow, !isLast && styles.rowBorder]}>
      <View style={[styles.activityIcon, { backgroundColor: ev.tintBg }]}>
        <Ionicons name={ev.icon} size={14} color={ev.tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.activityTitle} numberOfLines={2}>{ev.title}</Text>
        <Text style={styles.activityTime}>{relTime(ev.time)}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scrollContent: {
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

  // Header
  headerBlock: { paddingTop: 18, paddingBottom: 20 },
  greetingThin: {
    fontSize: 26, color: T.ink2, fontWeight: '300',
    letterSpacing: -0.6,
  },
  displayName: {
    fontSize: 34, color: T.ink, fontWeight: '800',
    letterSpacing: -1.2, marginTop: -2,
  },
  headerSub: {
    fontSize: 13.5, color: T.muted, fontWeight: '500',
    marginTop: 8, letterSpacing: -0.1,
  },

  // Error
  errorWrap: { marginBottom: 12 },

  // Hero
  hero: {
    backgroundColor: T.heroBg, borderRadius: 24,
    padding: 20, paddingBottom: 16,
    marginBottom: 18,
    shadowColor: '#0E1422',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18, shadowRadius: 26,
    elevation: 12,
  },
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroDatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1, borderColor: T.heroLine,
  },
  heroDateText: { fontSize: 11.5, color: T.heroMuted, fontWeight: '600' },
  heroMicroLabel: {
    fontSize: 10, color: T.heroMuted, fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroStatRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginTop: 22, marginBottom: 20,
  },
  heroBigNum: {
    fontSize: 56, color: T.heroInk, fontWeight: '800',
    letterSpacing: -2.2, lineHeight: 60,
    fontVariant: ['tabular-nums'],
  },
  heroBigLabel: {
    fontSize: 13, color: T.heroMuted, fontWeight: '500',
    marginTop: 4, letterSpacing: -0.1,
  },
  spark: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 5, height: 46, paddingLeft: 16,
  },
  sparkBar: {
    width: 6, borderRadius: 3,
  },
  heroStatusRow: {
    flexDirection: 'row', gap: 10,
    paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.heroLine,
  },
  heroDotItem: { flex: 1 },
  heroDot: {
    width: 7, height: 7, borderRadius: 4,
    marginBottom: 6,
  },
  heroDotVal: {
    fontSize: 17, color: T.heroInk, fontWeight: '700',
    letterSpacing: -0.4, fontVariant: ['tabular-nums'],
  },
  heroDotLabel: {
    fontSize: 10.5, color: T.heroMuted, fontWeight: '500',
    marginTop: 1,
  },
  heroCta: {
    marginTop: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 6,
  },
  heroCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Stat strip
  statStrip: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  statCard: {
    flex: 1, minWidth: 0,
    backgroundColor: T.card, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: T.line,
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22, color: T.ink, fontWeight: '700',
    letterSpacing: -0.6, fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11, color: T.muted, fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase',
    marginTop: 2,
  },

  // Section
  section: { marginBottom: 22 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12, paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11, color: T.muted, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12.5, color: T.accent, fontWeight: '600' },

  // Action chips
  chipScroll: { gap: 10, paddingHorizontal: 2, paddingRight: 16 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: T.card, borderRadius: 14,
    borderWidth: 1, borderColor: T.line,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  actionChipIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#F0F2F5',
    alignItems: 'center', justifyContent: 'center',
  },
  actionChipLabel: {
    fontSize: 13, fontWeight: '600', color: T.ink,
    letterSpacing: -0.2,
  },

  // Up next
  upNextList: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
    paddingHorizontal: 14,
  },
  skeletonRow: { height: 58, backgroundColor: '#EDEFF3', borderRadius: 14 },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { fontSize: 13, color: T.muted },
  upNextRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: T.line2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13, fontWeight: '700',
    color: '#2A2F3C', letterSpacing: 0.3,
  },
  rowBetween: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 6,
  },
  rowName: {
    flex: 1, fontSize: 14, fontWeight: '600',
    color: T.ink, letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 11.5, color: T.muted, marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  priorityDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: T.danger,
  },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1 },

  // Activity
  activityList: {
    backgroundColor: T.card, borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
    paddingHorizontal: 14,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12,
  },
  activityIcon: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  activityTitle: {
    fontSize: 13.5, color: T.ink, fontWeight: '500',
    letterSpacing: -0.1, lineHeight: 18,
  },
  activityTime: {
    fontSize: 11, color: T.muted, fontWeight: '500',
    marginTop: 3, letterSpacing: 0.2,
  },
});
