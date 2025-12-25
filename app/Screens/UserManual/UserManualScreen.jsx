import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useDrawer } from '../../Components/useDrawer';

import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');

const USER_MANUAL_VIDEO_URL =
  'https://media-abisaio-images.s3.ap-south-2.amazonaws.com/LMS_Media/Master/UserManual/User_Manual_Video.mp4';

const UserManualScreen = ({ navigation }) => {
  const { openNotification } = useNotification();

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Dashboard');
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [navigation])
  );

  // (video) loading / error state handled below with `isLoading` / `isError`

  // ✅ Use the drawer hook - User Manual is at index 7
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(7);

  const [selectedTab, setSelectedTab] = useState('Dashboard');
  const tabScaleAnims = useRef([...Array(3)].map(() => new Animated.Value(1))).current;
  
  const rotateAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  
  const handleTabPress = (index, tabName) => {
    setSelectedTab(tabName);

    Animated.sequence([
      Animated.spring(tabScaleAnims[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tabScaleAnims[index], {
        toValue: 1.2,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(tabScaleAnims[index], {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(rotateAnims[index], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnims[index], {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (index === 1) {
      navigation.navigate('Dashboard');
    } else if (index === 2) {
      navigation.navigate('Calendar');
    } else if (index === 0) {
      navigation.navigate('TrainingSession');
    }
  };

  // Animation values for PAGE CONTENT only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim]);

  // Video state and handlers (using expo-video)
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const player = useVideoPlayer(USER_MANUAL_VIDEO_URL, (p) => {
    try {
      // enable looping and start playback when created
      p.loop = true;
      p.play();
    } catch (e) {
      console.log('Error setting up video player:', e);
      setIsLoading(false);
      setIsError(true);
      setErrorMessage('Failed to initialize video player.');
    }
  });

  const handleVideoLoadEnd = () => {
    setIsLoading(false);
    setIsError(false);
    setErrorMessage(null);
  };

  const handleVideoError = (msg) => {
    console.log('User Manual video error:', msg);
    setIsLoading(false);
    setIsError(true);
    setErrorMessage(msg || 'Failed to load User Manual video.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* ✅ Universal Header Component */}
      <Header
        title="User Manual"
        onMenuPress={toggleDrawer}
        onNotificationPress={openNotification}
      />

      {/* Main Content */}
      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
          <View style={styles.successContainer}>
            <View style={styles.videoContainer}>
              {isLoading && !isError && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#7B68EE" />
                  <Text style={styles.loadingText}>Loading User Manual video...</Text>
                </View>
              )}

              {isError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={40} color="#ff4757" />
                  <Text style={styles.errorText}>{errorMessage || 'Failed to load User Manual video.'}</Text>
                </View>
              )}

              {/* Native Video - expo-video */}
              {!isError && (
                <VideoView
                  style={styles.videoNative}
                  player={player}
                  nativeControls
                  contentFit="contain"
                  allowsPictureInPicture
                  onFirstFrameRender={() => handleVideoLoadEnd()}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ✅ Universal Bottom Navigation Component */}
      <BottomNavigation
        selectedTab={selectedTab}
        tabScaleAnims={tabScaleAnims}
        rotateAnims={rotateAnims}
       handleTabPress={handleTabPress}
      />

      {/* ✅ Universal Drawer Component */}
      <CustomDrawer
        visible={drawerVisible}
        selectedMenuItem={selectedMenuItem}
        drawerSlideAnim={drawerSlideAnim}
        overlayOpacity={overlayOpacity}
        menuItemAnims={menuItemAnims}
        onClose={toggleDrawer}
        onMenuItemPress={(index) => handleMenuItemPress(index, navigation)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // old pdfViewer kept for reference but not used
  pdfViewer: {
    width: '100%',
    height: Dimensions.get('window').height - 220, // fits between header & bottom nav
    borderRadius: 12,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#f4f7fe',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  contentContainer: {
    padding: 20,
  },

  videoNative: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  // renamed pdfContainer -> videoContainer but kept structure
  videoContainer: {
    width: '100%',
    height: height - 280, // similar to original PDF height between header & nav
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginHorizontal: -20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  videoWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(123, 104, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#8B7AA3',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: '#8B7AA3',
    textAlign: 'center',
  },
});

export default UserManualScreen;
