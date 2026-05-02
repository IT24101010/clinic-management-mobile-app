import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

// ── Design tokens ─────────────────────────────────────────────────────────────

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
  heroBg:     '#0E1422',
  heroInk:    '#FFFFFF',
  heroMuted:  '#8A90A3',
  heroLine:   '#1E2534',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TONES = ['#CFE9DA', '#F9D9C3', '#E1D4F3', '#F6C9C7', '#D8E4F7', '#F5E2C4'];

const toneFor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('') || 'A';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2,'0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const sameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() &&
         x.getMonth()    === y.getMonth()    &&
         x.getDate()     === y.getDate();
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, tint, tintBg, delay, masterAnim }) {
  const enter = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const listener = masterAnim.addListener(({ value: v }) => {
      if (v > 0.1 && enter._value === 0) {
        Animated.spring(enter, {
          toValue: 1, delay,
          useNativeDriver: true, speed: 50, bounciness: 4,
        }).start();
      }
    });
    return () => masterAnim.removeListener(listener);
  }, []);

  return (
    <Animated.View style={[
      styles.statCard,
      {
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      },
    ]}>
      <View style={[styles.statIcon, { backgroundColor: tintBg }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function InfoRow({ icon, label, value, isLast }) {
  return (
    <View style={[styles.infoRow, !isLast && styles.rowBorder]}>
      <View style={[styles.rowIconWrap, { backgroundColor: T.accentSoft }]}>
        <Ionicons name={icon} size={14} color={T.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, subtitle, tint, tintBg, onPress, isLast, danger }) {
  const press = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(press, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const pressOut = () => Animated.spring(press, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  return (
    <Animated.View style={[!isLast && styles.rowBorder, { transform: [{ scale: press }] }]}>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={[styles.rowIconWrap, { backgroundColor: tintBg }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.actionLabel, danger && { color: T.danger }]}>{label}</Text>
          {subtitle ? <Text style={styles.actionSub}>{subtitle}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={14} color={T.muted2} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();

  const [totalUsers,    setTotalUsers]    = useState(null);
  const [todayAppts,    setTodayAppts]    = useState(null);
  const [totalServices, setTotalServices] = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);

  const masterAnim  = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const [userRes, apptRes, svcRes] = await Promise.all([
        api.get('/api/users?page=1&limit=1'),
        api.get('/api/appointments'),
        api.get('/api/services/admin/all').catch(() => ({ data: [] })),
      ]);
      setTotalUsers(userRes.data?.totalUsers ?? (userRes.data?.users?.length ?? 0));
      const all = apptRes.data || [];
      setTodayAppts(all.filter(a => sameDay(a.date, new Date())).length);
      setTotalServices((svcRes.data || []).filter(s => s.isActive).length);
    } catch (_) {
      // stats are best-effort
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/users/profile');
      if (res.data) updateUser(res.data);
    } catch (_) {}
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      // Only run entrance animation on the very first mount.
      // Subsequent focus events (back-navigation, tab switch) just refresh data
      // silently — no opacity/translateY reset, so sections never flicker.
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        masterAnim.setValue(0);
        Animated.timing(masterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
      fetchStats();
      refreshProfile();
    }, [fetchStats, refreshProfile]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchStats(), refreshProfile()]);
  };

  const handleLogout = () => {
    setShowLogout(false);
    logout();
  };

  const name      = user?.name  || 'Administrator';
  const email     = user?.email || '';
  const initials  = initialsOf(name);
  const avatarBg  = toneFor(user?._id || name);
  const joinedAt  = fmtDate(user?.createdAt);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.heroMuted}
            progressBackgroundColor={T.heroBg}
          />
        }
      >
        {/* ── Hero header ── */}
        <View style={styles.hero}>
          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTopLabel}>Clinic Admin</Text>
              <Text style={styles.heroTopName}>My Profile</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Avatar + identity */}
          <View style={styles.heroIdentity}>
            <View style={styles.avatarWrap}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.adminBadge}>
                <View style={styles.adminBadgeDot} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            </View>

            <View style={styles.heroNameBlock}>
              <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
              <Text style={styles.heroEmail} numberOfLines={1}>{email}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="calendar-outline" size={11} color={T.heroMuted} />
                <Text style={styles.heroMetaText}>Member since {joinedAt}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Stat strip ── */}
        <View style={styles.statStrip}>
          <StatCard
            icon="people-outline"
            label="Users"
            value={totalUsers ?? '—'}
            tint={T.accent}
            tintBg={T.accentSoft}
            delay={0}
            masterAnim={masterAnim}
          />
          <StatCard
            icon="calendar-outline"
            label="Today"
            value={todayAppts ?? '—'}
            tint={T.success}
            tintBg={T.successSoft}
            delay={60}
            masterAnim={masterAnim}
          />
          <StatCard
            icon="medkit-outline"
            label="Services"
            value={totalServices ?? '—'}
            tint="#7C3AED"
            tintBg="#F5F3FF"
            delay={120}
            masterAnim={masterAnim}
          />
        </View>

        {/* ── Account info ── */}
        <Animated.View style={[
          styles.section,
          {
            opacity: masterAnim,
            transform: [{ translateY: masterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          },
        ]}>
          <Text style={styles.sectionLabel}>Account info</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline"     label="Full name"  value={name}                          />
            <InfoRow icon="mail-outline"        label="Email"     value={email}                         />
            <InfoRow icon="phone-portrait-outline" label="Phone"  value={user?.phone}                   />
            <InfoRow icon="shield-half-outline" label="Role"      value="System Administrator" isLast   />
          </View>
        </Animated.View>

        {/* ── Account actions ── */}
        <Animated.View style={[
          styles.section,
          {
            opacity: masterAnim,
            transform: [{ translateY: masterAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <ActionRow
              icon="create-outline"
              label="Edit profile"
              subtitle="Update your name, phone, and photo"
              tint={T.accent}
              tintBg={T.accentSoft}
              onPress={() => {}}
            />
            <ActionRow
              icon="lock-closed-outline"
              label="Change password"
              subtitle="Update your account password"
              tint="#7C3AED"
              tintBg="#F5F3FF"
              onPress={() => {}}
              isLast
            />
          </View>
        </Animated.View>

        {/* ── Danger zone ── */}
        <Animated.View style={[
          styles.section,
          styles.lastSection,
          {
            opacity: masterAnim,
            transform: [{ translateY: masterAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
          },
        ]}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.card}>
            <ActionRow
              icon="log-out-outline"
              label="Sign out"
              subtitle="End your current admin session"
              tint={T.danger}
              tintBg={T.dangerSoft}
              onPress={() => setShowLogout(true)}
              isLast
              danger
            />
          </View>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogout}
        title="Sign out"
        message="Are you sure you want to end your session?"
        confirmText="Sign out"
        confirmColor={T.danger}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },

  // ── Hero ──
  hero: {
    backgroundColor: T.heroBg,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 54,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroTopLabel: { fontSize: 11, color: T.heroMuted, fontWeight: '500' },
  heroTopName:  { fontSize: 14, fontWeight: '600', color: T.heroInk, letterSpacing: -0.2 },

  heroDivider: {
    height: 1,
    backgroundColor: T.heroLine,
    marginBottom: 22,
  },

  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  avatarWrap: { alignItems: 'center' },
  avatarImg: {
    width: 72, height: 72, borderRadius: 22,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)',
  },
  avatarInitials: {
    fontSize: 26, fontWeight: '700', color: '#2A2F3C', letterSpacing: 0.5,
  },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(11,95,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(90,139,255,0.3)',
  },
  adminBadgeDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#5A8BFF',
  },
  adminBadgeText: {
    fontSize: 10.5, fontWeight: '700', color: '#5A8BFF', letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  heroNameBlock: { flex: 1, minWidth: 0 },
  heroName: {
    fontSize: 22, fontWeight: '800', color: T.heroInk,
    letterSpacing: -0.6,
  },
  heroEmail: {
    fontSize: 13, color: T.heroMuted, fontWeight: '400',
    marginTop: 3,
  },
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 10,
  },
  heroMetaText: {
    fontSize: 11, color: T.heroMuted, fontWeight: '500',
  },

  // ── Stat strip ──
  statStrip: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  statCard: {
    flex: 1, minWidth: 0,
    backgroundColor: T.card,
    borderRadius: 16,
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
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11, color: T.muted, fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase',
    marginTop: 2,
  },

  // ── Sections ──
  section: { marginTop: 22, paddingHorizontal: 16 },
  lastSection: { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11, color: T.muted, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, paddingHorizontal: 2,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1, borderColor: T.line,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 13,
  },
  rowIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 11, color: T.muted, fontWeight: '600',
    letterSpacing: 0.2, textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.1,
  },
  rowBorder: {
    borderBottomWidth: 1, borderBottomColor: T.line2,
  },

  // ── Action rows ──
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 14, fontWeight: '600', color: T.ink, letterSpacing: -0.1,
  },
  actionSub: {
    fontSize: 12, color: T.muted, marginTop: 2,
  },
});
