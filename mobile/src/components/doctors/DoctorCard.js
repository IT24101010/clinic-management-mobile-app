import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const DoctorCard = ({ doctor, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 2 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 2 }).start();

  const { userId, specialization, experience, consultationFee, isAvailable } = doctor;
  const name = userId?.name || 'Doctor';
  const profileImage = userId?.profileImage;
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress?.(doctor)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Avatar with availability dot */}
        <View style={styles.avatarContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={[styles.statusDot, isAvailable ? styles.dotGreen : styles.dotGray]} />
        </View>

        {/* Doctor info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.specialty} numberOfLines={1}>
            {specialization}
          </Text>
          <View style={styles.meta}>
            <Ionicons name="briefcase-outline" size={11} color={colors.textLight} />
            <Text style={styles.metaText}>{experience} yrs exp</Text>
            <View style={styles.metaDot} />
            <Ionicons name="cash-outline" size={11} color={colors.textLight} />
            <Text style={styles.metaText}>Rs. {consultationFee}</Text>
          </View>
        </View>

        {/* Right: availability badge + arrow */}
        <View style={styles.right}>
          <View style={[styles.availBadge, isAvailable ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.availText, isAvailable ? styles.availGreen : styles.availGrayText]}>
              {isAvailable ? 'Available' : 'Busy'}
            </Text>
          </View>
          <View style={styles.arrowBtn}>
            <Ionicons name="arrow-forward" size={14} color={colors.surface} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },

  /* ── Avatar ── */
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.accentFaded,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotGreen: { backgroundColor: '#22C55E' },
  dotGray: { backgroundColor: colors.textLight },

  /* ── Info ── */
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  specialty: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textLight,
    marginHorizontal: 2,
  },

  /* ── Right column ── */
  right: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: 8,
  },
  availBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGreen: { backgroundColor: colors.accentFaded },
  badgeGray: { backgroundColor: colors.borderLight },
  availText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  availGreen: { color: colors.accent },
  availGrayText: { color: colors.textLight },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
});

export default DoctorCard;
