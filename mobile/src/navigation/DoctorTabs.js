import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

import HomeScreen from '../screens/doctor/HomeScreen';
import ScheduleScreen from '../screens/doctor/ScheduleScreen';
import ProfileScreen from '../screens/doctor/ProfileScreen';
import DoctorEditProfileScreen from '../screens/doctor/EditProfileScreen';
import DoctorAppointmentDetailScreen from '../screens/doctor/AppointmentDetailScreen';
import SlotPatientsSheet from '../screens/doctor/SlotPatientsSheet';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const ScheduleStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const modalOptions = {
  headerShown: false,
  presentation: 'transparentModal',
  cardStyle: { backgroundColor: 'transparent' },
  cardOverlayEnabled: false,
  animationEnabled: false,
};

const HomeNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen
      name="DoctorAppointmentDetail"
      component={DoctorAppointmentDetailScreen}
      options={modalOptions}
    />
  </HomeStack.Navigator>
);

const ScheduleNavigator = () => (
  <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
    <ScheduleStack.Screen name="ScheduleMain" component={ScheduleScreen} />
    <ScheduleStack.Screen
      name="SlotPatientsSheet"
      component={SlotPatientsSheet}
      options={modalOptions}
    />
    <ScheduleStack.Screen
      name="DoctorAppointmentDetail"
      component={DoctorAppointmentDetailScreen}
      options={modalOptions}
    />
  </ScheduleStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={DoctorEditProfileScreen} />
  </ProfileStack.Navigator>
);

const TabIcon = ({ name, focused, color }) => (
  <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
    <Ionicons name={name} size={22} color={color} />
  </View>
);

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryFaded,
  },
});

const DoctorTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        height: Platform.OS === 'ios' ? 88 : 64,
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textLight,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
      },
      tabBarIcon: ({ focused, color }) => {
        const icons = {
          HomeTab:     focused ? 'home'     : 'home-outline',
          ScheduleTab: focused ? 'calendar' : 'calendar-outline',
          ProfileTab:  focused ? 'person'   : 'person-outline',
        };
        return <TabIcon name={icons[route.name]} focused={focused} color={color} />;
      },
    })}
  >
    <Tab.Screen name="HomeTab"     component={HomeNavigator}     options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen name="ScheduleTab" component={ScheduleNavigator} options={{ tabBarLabel: 'Schedule' }} />
    <Tab.Screen name="ProfileTab"  component={ProfileNavigator}  options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

export default DoctorTabs;
