import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// ── Design tokens (matches appointments redesign) ────────────────────────────

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
};

// ── Management sections ──────────────────────────────────────────────────────

const MANAGE_SECTIONS = [
  {
    key: 'users',
    label: 'Users',
    subtitle: 'Accounts, roles & status',
    icon: 'people-outline',
    iconBg: '#EEF2FF',
    iconFg: '#4F46E5',
    screen: 'ManageUsers',
  },
  {
    key: 'appointments',
    label: 'Appointments',
    subtitle: 'Bookings & scheduling',
    icon: 'calendar-outline',
    iconBg: T.accentSoft,
    iconFg: T.accent,
    screen: 'ManageAppointments',
  },
  {
    key: 'doctors',
    label: 'Doctors',
    subtitle: 'Profiles & availability',
    icon: 'medical-outline',
    iconBg: '#DDF3EA',
    iconFg: '#0F9D7A',
    screen: 'ManageDoctors',
  },
  {
    key: 'services',
    label: 'Services',
    subtitle: 'Offerings & pricing',
    icon: 'medkit-outline',
    iconBg: '#E0F2FE',
    iconFg: '#0891B2',
    screen: 'ManageServices',
  },
  {
    key: 'feedback',
    label: 'Feedback',
    subtitle: 'Reviews & ratings',
    icon: 'chatbubble-outline',
    iconBg: '#FBEFD6',
    iconFg: '#E0A23B',
    screen: 'ManageFeedback',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    subtitle: 'Publish clinic updates',
    icon: 'megaphone-outline',
    iconBg: '#F5F3FF',
    iconFg: '#7C3AED',
    screen: 'ManageAnnouncements',
  },
  {
    key: 'timeslots',
    label: 'Time Slots',
    subtitle: 'Doctor schedules & capacity',
    icon: 'time-outline',
    iconBg: '#FEF3C7',
    iconFg: '#D97706',
    screen: 'ManageTimeSlots',
  },
];

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ManageDashboardScreen({ navigation }) {
  const anim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []),
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.logoBox}><Text style={styles.logoText}>C</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topLabel}>Clinic Admin</Text>
            <Text style={styles.topName}>Administration hub</Text>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Manage</Text>
            <Text style={styles.pageSub}>
              {MANAGE_SECTIONS.length} sections · clinic operations
            </Text>

          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>Manage sections</Text>

          {/* Grid */}
          <View style={styles.grid}>
            {MANAGE_SECTIONS.map((item, index) => (
              <ManageTile
                key={item.key}
                item={item}
                index={index}
                onPress={() => navigation.navigate(item.screen)}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── ManageTile ───────────────────────────────────────────────────────────────

function ManageTile({ item, index, onPress }) {
  const press = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(enter, {
      toValue: 1, delay: index * 60,
      useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  }, []);

  const pressIn  = () => Animated.spring(press, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const pressOut = () => Animated.spring(press, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  return (
    <Animated.View style={[
      styles.tileWrap,
      {
        opacity: enter,
        transform: [
          { scale: press },
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
      },
    ]}>
      <TouchableOpacity
        style={styles.tile}
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
      >
        <View style={[styles.tileIcon, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={22} color={item.iconFg} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.tileSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>

        <View style={styles.tileArrow}>
          <Ionicons name="chevron-forward" size={14} color={T.muted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
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

  // Title
  titleRow: { paddingTop: 12, paddingBottom: 20 },
  pageTitle: {
    fontSize: 28, fontWeight: '700', color: T.ink, letterSpacing: -0.6,
  },
  pageSub: { fontSize: 13, color: T.muted, marginTop: 4 },

  // Section label
  sectionLabel: {
    fontSize: 11, color: T.muted, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: 12, paddingHorizontal: 2,
  },

  // List tiles
  grid: { gap: 10 },
  tileWrap: { width: '100%' },
  tile: {
    backgroundColor: T.card, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: T.line,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  tileIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2,
  },
  tileSubtitle: {
    fontSize: 12, color: T.muted, marginTop: 2,
  },
  tileArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: T.bg,
    alignItems: 'center', justifyContent: 'center',
  },
});
