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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={colors.accent || '#10B981'} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not set'}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, subtitle, onPress, danger }) => {
  const dangerColor = colors.danger || '#EF4444';
  const iconColor = danger ? dangerColor : (colors.accent || '#10B981');
  const labelColor = danger ? dangerColor : (colors.text || '#1F2937');

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight || '#9CA3AF'} />
    </TouchableOpacity>
  );
};

const StatCard = ({ icon, label, value, colorLabel, bgColor }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: bgColor || colors.accentFaded || '#D1FAE5' }]}>
      <Ionicons name={icon} size={18} color={colorLabel || colors.accent || '#10B981'} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
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
      console.log('Error refreshing profile:', err);
    } finally {
      setRefreshing(false);
    }
  }, [updateUser]);

  /* Silently refresh profile when returning from EditProfileScreen */
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        try {
          const res = await api.get('/api/users/profile');
          if (res.data) updateUser(res.data);
        } catch {}
      };
      refresh();
    }, [updateUser])
  );

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.surface || '#FFFFFF'} />}
      >
        {/* ── Profile Header ── */}
        <LinearGradient
          colors={['#2563EB', '#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Doctor Profile</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.surface} />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarWrap}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase() || 'D'}</Text>
              </View>
            )}
            <View style={[styles.roleBadge, { backgroundColor: colors.primary || '#3B82F6' }]}>
              <Text style={styles.roleBadgeText}>Doctor</Text>
            </View>
          </View>

          <Text style={styles.profileName}>{user?.name || 'Dr. User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          {user?.specialization && (
            <Text style={styles.profileRoleSubtitle}>{user.specialization}</Text>
          )}
        </LinearGradient>

        {/* ── Quick Stats ── */}
        <Animated.View style={[styles.statsRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <StatCard
            icon="briefcase"
            label="Experience"
            value={`${user?.experience || 0} Yrs`}
            colorLabel={colors.accent || '#10B981'}
            bgColor={colors.accentFaded || '#D1FAE5'}
          />
          <StatCard
            icon="cash-outline"
            label="Consult Fee"
            value={`$${user?.consultationFee || '0'}`}
            colorLabel={colors.primary || '#3B82F6'}
            bgColor="#EFF6FF"
          />
          <StatCard
            icon="people"
            label="Appointments"
            value={user?.appointmentStats || 0}
            colorLabel="#EC4899"
            bgColor="#FDF2F8"
          />
        </Animated.View>

        {/* ── Doctor Content ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <InfoRow icon="person-outline" label="Full Name" value={user?.name} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <Text style={styles.cardTitle}>Professional Details</Text>
          <InfoRow icon="medkit-outline" label="Specialization" value={user?.specialization} />
          <InfoRow icon="school-outline" label="Qualifications" value={user?.qualifications ? user.qualifications.join(', ') : 'Not provided'} />
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <Text style={styles.cardTitle}>Clinic Management</Text>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            subtitle="Update your info and profile photo"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="time-outline"
            label="Available Slots"
            subtitle="Manage your working hours"
            onPress={() => { }}
          />
          <MenuItem
            icon="star-outline"
            label="Patient Reviews"
            subtitle="See what patients say about you"
            onPress={() => { }}
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
    backgroundColor: colors.background || '#F3F4F6',
  },
  profileHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
    paddingBottom: 40,
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
    color: colors.surface || '#FFFFFF',
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 14,
    alignItems: 'center',
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
    color: colors.surface || '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surface || '#FFFFFF',
  },
  roleBadgeText: {
    color: colors.surface || '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface || '#FFFFFF',
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  profileRoleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,1)',
    marginTop: 6,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text || '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight || '#9CA3AF',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface || '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadow || '#000',
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
    color: colors.text || '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight || '#F3F4F6',
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: colors.accentFaded || '#D1FAE5',
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight || '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text || '#1F2937',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight || '#F3F4F6',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: colors.accentFaded || '#D1FAE5',
  },
  menuIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text || '#1F2937',
    letterSpacing: 0.1,
  },
  menuSub: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight || '#9CA3AF',
    marginTop: 4,
  },
});

export default ProfileScreen;
