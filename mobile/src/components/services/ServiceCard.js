import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const CATEGORY_META = {
  Consultation: { icon: 'chatbubbles',  color: '#059669', gradient: ['#059669', '#34D399'] },
  Laboratory:   { icon: 'flask',        color: '#7C3AED', gradient: ['#7C3AED', '#A78BFA'] },
  Dental:       { icon: 'happy',        color: '#EC4899', gradient: ['#BE185D', '#EC4899'] },
  Radiology:    { icon: 'scan',         color: '#D97706', gradient: ['#D97706', '#FBBF24'] },
  Cardiology:   { icon: 'heart',        color: '#DC2626', gradient: ['#DC2626', '#F87171'] },
  Neurology:    { icon: 'pulse',        color: '#2563EB', gradient: ['#1D4ED8', '#60A5FA'] },
  Orthopedic:   { icon: 'body',         color: '#0D9488', gradient: ['#0F766E', '#2DD4BF'] },
  Pediatrics:   { icon: 'people',       color: '#EA580C', gradient: ['#C2410C', '#FB923C'] },
  default:      { icon: 'medkit',       color: '#059669', gradient: ['#059669', '#34D399'] },
};

const getMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.default;

const ServiceCard = ({ service, onPress, index = 0 }) => {
  const scale    = useRef(new Animated.Value(1)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(18)).current;

  /* Staggered entrance */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: (index % 8) * 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 380,
        delay: (index % 8) * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn  = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  const { serviceName, category, price, duration, imageUrl } = service;
  const meta = getMeta(category);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity, transform: [{ scale }, { translateY: slideUp }] },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress?.(service)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* ── Image / Gradient area ── */}
        <View style={styles.imageArea}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={meta.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageFallback}
            >
              {/* Decorative circles */}
              <View style={styles.imgDeco1} />
              <View style={styles.imgDeco2} />
              <Ionicons name={meta.icon} size={44} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}

          {/* Gradient overlay for text/badge contrast */}
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'transparent', 'transparent', 'rgba(0,0,0,0.18)']}
            style={styles.imageOverlay}
          />

          {/* Category badge — top left */}
          <View style={styles.catBadge}>
            <Ionicons name={meta.icon} size={10} color={colors.surface} />
            <Text style={styles.catBadgeText} numberOfLines={1}>{category}</Text>
          </View>
        </View>

        {/* ── Info area ── */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{serviceName}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={11} color={colors.accent} />
              <Text style={styles.metaText}>Rs.{price}</Text>
            </View>
            {!!duration && (
              <>
                <View style={styles.metaDot} />
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={11} color={colors.textLight} />
                  <Text style={styles.metaTextGray}>{duration}min</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  /* ── Image ── */
  imageArea: {
    aspectRatio: 1.1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgDeco1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  imgDeco2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Category badge */
  catBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.3,
    maxWidth: 70,
  },

  /* ── Info ── */
  info: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  metaTextGray: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLight,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
});

export default ServiceCard;
