import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';

const { width, height } = Dimensions.get('window');

/* ─── Geometric Logo ─── */
const BAR_CONFIG = [
  // Left group — 3 tall bars
  { h: 110, left: 0, color: 'rgba(16, 185, 129, 0.55)', delay: 0 },
  { h: 140, left: 28, color: 'rgba(16, 185, 129, 0.70)', delay: 60 },
  { h: 170, left: 56, color: 'rgba(16, 185, 129, 0.85)', delay: 120 },
  // Right group — cross bar + 2 tall bars (forms the "H" bridge)
  { h: 120, left: 84, color: 'rgba(5, 150, 105, 0.60)', delay: 180 },
  { h: 160, left: 112, color: 'rgba(5, 150, 105, 0.80)', delay: 240 },
];

const GeometricBar = ({ config, index }) => {
  const slideUp = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        delay: 200 + config.delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay: 200 + config.delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.geoBar,
        {
          height: config.h,
          left: config.left,
          backgroundColor: config.color,
          opacity,
          transform: [
            { translateY: slideUp },
            { perspective: 800 },
            { rotateX: '-5deg' },
            { rotateY: '12deg' },
          ],
        },
      ]}
    />
  );
};

const WelcomeScreen = ({ navigation }) => {
  const fadeContent = useRef(new Animated.Value(0)).current;
  const slideContent = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.timing(fadeContent, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideContent, {
      toValue: 0,
      duration: 700,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <LinearGradient
        colors={['#D6E9F8', '#B8E6D0', '#D1F5E0', '#EAF9F0', '#FFFFFF']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        style={styles.gradient}
      >
        {/* ── Geometric Logo ── */}
        <View style={styles.logoSection}>
          <View style={styles.geoContainer}>
            {BAR_CONFIG.map((config, index) => (
              <GeometricBar key={index} config={config} index={index} />
            ))}
          </View>
        </View>

        {/* ── Content ── */}
        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: fadeContent,
              transform: [{ translateY: slideContent }],
            },
          ]}
        >
          <Text style={styles.headline}>
            Welcome to the{'\n'}future of medicine{'\n'}with{' '}
            <Text style={styles.headlineAccent}>CMS</Text>
          </Text>

          <Text style={styles.subtitle}>
            Discover seamless clinic management,{'\n'}smart scheduling, and expert care.
          </Text>
        </Animated.View>

        {/* ── Bottom Actions ── */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeContent,
              transform: [{ translateY: slideContent }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.createBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.createBtnText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
  },

  /* ── Logo Section ── */
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geoContainer: {
    width: 150,
    height: 200,
    position: 'relative',
  },
  geoBar: {
    position: 'absolute',
    bottom: 0,
    width: 26,
    borderRadius: 8,
  },

  /* ── Content ── */
  contentSection: {
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 40,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  headlineAccent: {
    color: colors.accent,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },

  /* ── Bottom ── */
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'android' ? 36 : 44,
  },
  createBtn: {
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loginBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default WelcomeScreen;
