import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { formatDate } from '../../utils/formatDate';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={colors.accent} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not set'}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, subtitle, onPress, danger }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.accent} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
      {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/users/profile');
      if (res.data) updateUser(res.data);
    } catch (err) {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }, [updateUser]);

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  const firstName = user?.name?.split(' ')[0] || '';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.surface} />
        }
      >
        {/* ── Profile Header ── */}
        <LinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity
              style={styles.editToggle}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.surface} />
            </TouchableOpacity>
          </View>

          {/* Avatar — tap to go to Edit Profile */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase() || 'U'}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={colors.surface} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </LinearGradient>

        {/* ── Quick Stats ── */}
        <Animated.View style={[styles.statsRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.accentFaded }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{user?.riskLevel || 'Low'}</Text>
            <Text style={styles.statLabel}>Risk Level</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{memberSince}</Text>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FDF2F8' }]}>
              <Ionicons name="heart" size={18} color="#EC4899" />
            </View>
            <Text style={styles.statValue}>{user?.bloodReports?.length || 0}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
        </Animated.View>

        {/* ── Personal Information ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <InfoRow icon="person-outline" label="Full Name" value={user?.name} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
          <InfoRow
            icon="calendar-outline"
            label="Date of Birth"
            value={user?.dateOfBirth ? formatDate(user.dateOfBirth) : null}
          />
          <InfoRow
            icon="transgender-outline"
            label="Gender"
            value={user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null}
          />
          <InfoRow icon="location-outline" label="Address" value={user?.address} />
        </Animated.View>

        {/* ── Emergency Contact ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <Text style={styles.cardTitle}>Emergency Contact</Text>
          <InfoRow icon="people-outline" label="Name" value={user?.emergencyContact?.name} />
          <InfoRow icon="call-outline" label="Phone" value={user?.emergencyContact?.phone} />
        </Animated.View>

        {/* ── Medical & Health ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <Text style={styles.cardTitle}>Medical & Health</Text>
          <MenuItem
            icon="document-text-outline"
            label="Medical History"
            subtitle={`${user?.medicalHistory?.length || 0} records`}
            onPress={() => {}}
          />
          <MenuItem
            icon="alert-circle-outline"
            label="Allergies"
            subtitle={user?.allergies?.length ? user.allergies.join(', ') : 'None recorded'}
            onPress={() => {}}
          />
          <MenuItem
            icon="analytics-outline"
            label="Blood Reports"
            subtitle={`${user?.bloodReports?.length || 0} uploaded reports`}
            onPress={() => navigation.navigate('BloodReports')}
          />
        </Animated.View>

        {/* ── Logout ── */}
        <Animated.View style={[styles.card, styles.lastCard, { opacity: fadeIn }]}>
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            subtitle="Sign out of your account"
            onPress={() => setShowLogoutDialog(true)}
            danger
          />
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Logout"
        message="Are you sure you want to sign out?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Profile Header ── */
  profileHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },
  editToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.surface,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
    fontWeight: '500',
  },

  /* ── Cards ── */
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  lastCard: {
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },

  /* ── Info Rows ── */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },

  /* ── Menu Items ── */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  menuSub: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
});

export default ProfileScreen;
