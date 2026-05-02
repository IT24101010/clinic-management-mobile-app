import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
const STAR_COLOR  = '#F59E0B';
const EMPTY_COLOR = '#E2E8F0';

/**
 * StarRating — interactive or display-only star rating.
 *
 * Props:
 *   rating         {number}   0–5, supports .5 increments in display mode
 *   onRatingChange {function} if provided → interactive mode
 *   size           {number}   icon size (default 22)
 *   showLabel      {boolean}  show "Excellent!" text in interactive mode
 *   color          {string}   filled star colour
 */
const StarRating = ({
  rating = 0,
  onRatingChange,
  size = 22,
  showLabel = false,
  color = STAR_COLOR,
}) => {
  const isInteractive = typeof onRatingChange === 'function';

  /* ── Animated scales — one per star ── */
  const scales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const handlePress = (star) => {
    if (!isInteractive) return;
    Animated.sequence([
      Animated.spring(scales[star - 1], { toValue: 1.45, useNativeDriver: true, speed: 60, bounciness: 12 }),
      Animated.spring(scales[star - 1], { toValue: 1,    useNativeDriver: true, speed: 60 }),
    ]).start();
    onRatingChange(star);
  };

  /* ── Star type for display mode (supports halves) ── */
  const displayIcon = (pos) => {
    if (rating >= pos)            return 'star';
    if (rating >= pos - 0.5)      return 'star-half';
    return 'star-outline';
  };

  const isFilled = (pos) =>
    isInteractive
      ? rating >= pos
      : rating >= pos - 0.49;          /* catches halves in display */

  return (
    <View style={styles.wrap}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Animated.View key={star} style={{ transform: [{ scale: scales[star - 1] }] }}>
            <TouchableOpacity
              onPress={() => handlePress(star)}
              disabled={!isInteractive}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Ionicons
                name={isInteractive ? (rating >= star ? 'star' : 'star-outline') : displayIcon(star)}
                size={size}
                color={isFilled(star) ? color : EMPTY_COLOR}
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {showLabel && isInteractive && rating > 0 && (
        <Text style={[styles.label, { color }]}>
          {LABELS[Math.round(rating)]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default StarRating;
