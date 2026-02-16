import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Alert, Text, View, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TraceRouteScreen from '../screens/TraceRouteScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for authenticated users
const MainTabs = () => {
  const [showUserInfo, setShowUserInfo] = useState(false);

  const handleLogout = async (navigation: any) => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'accessToken',
              'refreshToken',
              'user',
            ]);
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color}) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Me"
        component={HomeScreen}
        initialParams={{openUserInfo: true}}
        listeners={({navigation}) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Trigger modal opening in HomeScreen
            navigation.navigate('Home', {openUserInfo: true});
          },
        })}
        options={{
          tabBarIcon: ({color}) => <MeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Logout"
        component={HomeScreen} // Dummy component, won't be rendered
        listeners={({navigation}) => ({
          tabPress: (e) => {
            e.preventDefault();
            handleLogout(navigation);
          },
        })}
        options={{
          tabBarIcon: ({color}) => <LogoutIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Simple icon components
const HomeIcon = ({color}: {color: string}) => (
  <Text style={{fontSize: 24}}>{color === '#4CAF50' ? '🏠' : '🏡'}</Text>
);

const MeIcon = ({color}: {color: string}) => (
  <Text style={{fontSize: 24}}>{color === '#4CAF50' ? '👤' : '👥'}</Text>
);

const LogoutIcon = ({color}: {color: string}) => (
  <Text style={{fontSize: 24}}>{color === '#4CAF50' ? '🚪' : '🔓'}</Text>
);

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<string>('Login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      setInitialRoute(token ? 'MainApp' : 'Login');
    } catch (error) {
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'}}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainApp" component={MainTabs} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{headerShown: true, title: 'Profile'}}
        />
        <Stack.Screen
          name="TraceRoute"
          component={TraceRouteScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
