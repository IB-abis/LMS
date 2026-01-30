import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing, findNodeHandle, Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { TourGuideZone, useTourGuideController } from 'rn-tourguide';
import { useNotification } from './NotificationContext';
const { width, height } = Dimensions.get('window');

const Header = ({
  title,
  onMenuPress,
  onBackPress,
  onNotificationPress,
  onPointsUpdated,
  showNotification = true,
  showMore = true,
  showBackButton = false,
  showSpinner = true,

}) => {


  // Add useTourGuideController hook
  const { start, canStart } = useTourGuideController();
  const hasStartedRef = useRef(false);

  // Refs for measuring header icons
  const menuRef = useRef(null);
  const spinnerRef = useRef(null);
  const notifRef = useRef(null);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [spinnerAnchor, setSpinnerAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  // Add state to track if tutorial should be shown
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);

  {/* // Modified useEffect for starting tour
  useEffect(() => {
    const checkAndStartTutorial = async () => {
      try {
        const tutorialCompleted = await AsyncStorage.getItem('tutorialCompleted');
        
        if (!tutorialCompleted && canStart && !hasStartedRef.current) {
          setShouldShowTutorial(true);
          const timer = setTimeout(() => {
            start();
            hasStartedRef.current = true;
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.log('Error checking tutorial status:', error);
      }
    };

    checkAndStartTutorial();
  }, [canStart, start]);*/ }

  const insets = useSafeAreaInsets();

  // Helper to measure a ref using measureInWindow and set center coordinates
  const measureRef = (ref, setter) => {
    try {
      const node = findNodeHandle(ref?.current);
      if (node) {
        // measureInWindow via native handle
        ref.current.measureInWindow((x, y, w, h) => {
          const cx = x + w / 2;
          const cy = y + h / 2;
          // compute an offset to compensate for header padding vs safe-area
          const HEADER_PADDING_TOP = 50; // matches styles.header.paddingTop
          const offsetY = insets.top ? -(HEADER_PADDING_TOP - insets.top) : -HEADER_PADDING_TOP;
          setter({ x: cx, y: cy, width: w, height: h, offsetY });
        });
      }
    } catch (e) {
      // ignore measurement errors
    }
  };

  // Measure icons on mount and when layout changes
  useEffect(() => {
    // initial measure after a short delay to allow layout to settle
    const timer = setTimeout(() => {
      measureRef(menuRef, setMenuAnchor);
      measureRef(spinnerRef, setSpinnerAnchor);
      measureRef(notifRef, setNotifAnchor);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Expose onLayout handlers to re-measure when layout updates
  const handleMenuLayout = () => measureRef(menuRef, setMenuAnchor);
  const handleSpinnerLayout = () => measureRef(spinnerRef, setSpinnerAnchor);
  const handleNotifLayout = () => measureRef(notifRef, setNotifAnchor);



  const { unreadCount } = useNotification();
  // API based spinner points
  const [spinnerPoints, setSpinnerPoints] = useState([]);
  const [isSpinnerActive, setIsSpinnerActive] = useState(false);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

  // Spinner states
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Modern alert states
  const [showModernAlert, setShowModernAlert] = useState(false);
  const modernAlertScale = useRef(new Animated.Value(0)).current;
  const modernAlertOpacity = useRef(new Animated.Value(0)).current;

  // Spinner animations
  const spinnerSlideAnim = useRef(new Animated.Value(height)).current;
  const spinnerRotation = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef([...Array(50)].map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  const spinnerOptions = spinnerPoints.map((p, index) => ({
    label: `${p} Points`,
    value: p,
    color: index % 2 === 0 ? "#7B68EE" : "#9D7FEA",
  }));

  const showModernAlertPopup = () => {
    setShowModernAlert(true);
    Animated.parallel([
      Animated.spring(modernAlertScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modernAlertOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModernAlert = () => {
    Animated.parallel([
      Animated.timing(modernAlertScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modernAlertOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModernAlert(false);
      modernAlertScale.setValue(0);
      modernAlertOpacity.setValue(0);
    });
  };

  const openSpinner = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch("https://lms-api-qa.abisaio.com/api/v1/Dashboard/SpinWheel", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data?.succeeded) {
        setSpinnerPoints(data.points);
        setIsSpinnerActive(data.isActive);

        // If isActive is false, user has already claimed today
        const alreadyClaimed = !data.isActive;
        setHasClaimedToday(alreadyClaimed);

        if (alreadyClaimed) {
          // show modern custom popup instead of native Alert
          showModernAlertPopup();
          return;
        }
      }
    } catch (err) {
      console.log("Spinner API error:", err);
    }

    // Only open spinner if not claimed
    setSpinnerVisible(true);

    Animated.spring(spinnerSlideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const closeSpinner = () => {
    Animated.timing(spinnerSlideAnim, {
      toValue: height,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setSpinnerVisible(false);
      setSelectedReward(null);
      setShowConfetti(false);
      spinnerRotation.setValue(0);
    });
  };

  const spinWheel = () => {
    if (isSpinning || spinnerOptions.length === 0) return;

    setIsSpinning(true);
    setShowConfetti(false);
    setSelectedReward(null);

    const randomIndex = Math.floor(Math.random() * spinnerOptions.length);
    const degreePerSegment = 360 / spinnerOptions.length;

    const baseRotation = 360 * 5;
    const segmentCenterAngle = randomIndex * degreePerSegment + (degreePerSegment / 2);
    const targetDegree = baseRotation + (360 - segmentCenterAngle);

    Animated.timing(spinnerRotation, {
      toValue: targetDegree,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      setIsSpinning(false);
      const selected = spinnerOptions[randomIndex];
      setSelectedReward(selected);

      const saveSuccess = await saveWinningPoints(selected.value);

      if (saveSuccess) {
        setHasClaimedToday(true);
        setIsSpinnerActive(false);
        triggerCelebration();
      }
    });
  };

  const saveWinningPoints = async (points) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        `https://lms-api-qa.abisaio.com/api/v1/Dashboard/SavePoints?points=${points}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log("Save Points API:", data);

      if (data?.succeeded) {
        return true;
      } else {
        // keep native alert for error
        alert("Error: Failed to save points. Please try again.");
        return false;
      }
    } catch (e) {
      console.log("Save Points error:", e);
      alert("Error: Failed to save points. Please check your connection.");
      return false;
    }
  };

  const triggerCelebration = () => {
    setShowConfetti(true);
    Animated.spring(celebrationScale, {
      toValue: 1,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();

    confettiAnims.forEach((anim, index) => {
      const randomX = (Math.random() - 0.5) * width;
      const randomRotate = Math.random() * 720;
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(anim.x, {
          toValue: randomX,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: height,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: randomRotate,
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (index === confettiAnims.length - 1) {
          confettiAnims.forEach(a => {
            a.x.setValue(0);
            a.y.setValue(0);
            a.rotate.setValue(0);
            a.opacity.setValue(0);
          });
        }
      });
    });
  };

  const resetCelebration = () => {
    celebrationScale.setValue(0);
    setShowConfetti(false);
  };

  const renderWheelSegments = () => {
    const radius = 140;
    const centerX = 150;
    const centerY = 150;
    const numSegments = spinnerOptions.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    return spinnerOptions.map((option, index) => {
      const startAngle = index * anglePerSegment - Math.PI / 2;
      const endAngle = startAngle + anglePerSegment;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

      const textAngle = startAngle + anglePerSegment / 2;
      const textX = centerX + radius * 0.65 * Math.cos(textAngle);
      const textY = centerY + radius * 0.65 * Math.sin(textAngle);

      return (
        <G key={index}>
          <Path d={pathData} fill={option.color} stroke="#fff" strokeWidth="2" />
          <SvgText
            x={textX}
            y={textY}
            fill="#fff"
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {option.value}
          </SvgText>
        </G>
      );
    });
  };

  const renderConfetti = () => {
    if (!showConfetti) return null;
    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#f093fb', '#FFA500', '#667eea'];
    return confettiAnims.map((anim, index) => {
      const color = confettiColors[index % confettiColors.length];
      const size = 10 + Math.random() * 10;
      return (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              width: size,
              height: size,
              backgroundColor: color,
              opacity: anim.opacity,
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                {
                  rotate: anim.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: ['0deg', '720deg'],
                  })
                },
              ],
            },
          ]}
        />
      );
    });
  };
  useEffect(() => {
    if (showSpinner) {
      spinnerRotation.setValue(0);
      Animated.loop(
        Animated.timing(spinnerRotation, {
          toValue: 360,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }

    return () => spinnerRotation.stopAnimation();
  }, [showSpinner]);
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBackButton ? (
            <TouchableOpacity onPress={onBackPress} style={styles.menuButton}>
              <Ionicons name="arrow-back" size={30} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TourGuideZone
              zone={1}
              order={1}
              text={menuAnchor ? JSON.stringify({ text: 'Access the menu by tapping this icon to navigate through different sections of the app.', anchor: menuAnchor }) : 'Access the menu by tapping this icon to navigate through different sections of the app.'}
              shape="circle"
              tooltipBottomOffset={10}
              maskOffset={6}
            >
              <TouchableOpacity ref={menuRef} onLayout={handleMenuLayout} style={styles.menuButton} onPress={onMenuPress}>
                <Ionicons name="menu" size={30} color="#fff" />
              </TouchableOpacity>
            </TourGuideZone>
          )}
          <Text allowFontScaling={false} style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          {showSpinner && (
            <TourGuideZone
              zone={2}
              order={2}
              text="Spin the wheel daily to earn bonus points and exciting rewards!"
              shape="circle"
              tooltipBottomOffset={12}
              maskOffset={6}
            >
              <TouchableOpacity
                style={styles.spinnerButton}
                onPress={openSpinner}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinnerRotation.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  }}
                >
                  <Image
                    source={require('../Images/spinner.png')}
                    style={{
                      width: 40,
                      height: 40,
                      transform: [{ translateX: 0 }, { translateY: 0 }],
                    }}
                  />
                </Animated.View>
              </TouchableOpacity>
            </TourGuideZone>

          )}
          {showNotification && (
            <TourGuideZone
              zone={3}
              order={3}
              text="Check your notifications here to stay updated with important alerts and messages."
              shape="circle"
              tooltipBottomOffset={12}
              maskOffset={6}
            >

              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNotificationPress}
              >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text allowFontScaling={false} style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </TourGuideZone>

          )}
        </View>
      </View>

      {/* Spinner Modal */}
      <Modal
        visible={spinnerVisible}
        transparent
        animationType="none"
        onRequestClose={closeSpinner}
      >
        <View style={styles.spinnerModalContainer}>
          <Animated.View
            style={[
              styles.spinnerDrawer,
              { transform: [{ translateY: spinnerSlideAnim }] },
            ]}
          >
            <LinearGradient colors={['#2D2438', '#1a1a2e']} style={styles.spinnerContent}>
              <View style={styles.spinnerHeader}>
                <Text allowFontScaling={false} style={styles.spinnerTitle}>🎯 Spin & Win!</Text>
                <TouchableOpacity onPress={closeSpinner} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={30} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.wheelContainer}>
                <View style={styles.wheelPointer}>
                  <Text allowFontScaling={false} style={styles.pointerIcon}>▼</Text>
                </View>
                <Animated.View
                  style={[
                    styles.wheel,
                    {
                      transform: [{
                        rotate: spinnerRotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }),
                      }],
                    },
                  ]}
                >
                  <Svg width="300" height="300" viewBox="0 0 300 300">
                    {renderWheelSegments()}
                    <Circle cx="150" cy="150" r="25" fill="#1a1a2e" stroke="#FFD700" strokeWidth="3" />
                    <SvgText
                      x="150"
                      y="155"
                      fill="#FFD700"
                      fontSize="20"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      SPIN
                    </SvgText>
                  </Svg>
                </Animated.View>
              </View>

              {!hasClaimedToday && !selectedReward && (
                <TouchableOpacity
                  style={styles.spinButton}
                  onPress={spinWheel}
                  disabled={isSpinning}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isSpinning ? ['#888', '#666'] : ['#667eea', '#764ba2']}
                    style={styles.spinButtonGradient}
                  >
                    <Text style={styles.spinButtonText}>
                      {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {selectedReward && showConfetti && (
                <Animated.View
                  style={[
                    styles.celebrationCard,
                    { transform: [{ scale: celebrationScale }] },
                  ]}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.celebrationGradient}
                  >
                    <Text allowFontScaling={false} style={styles.celebrationIcon}>🎉</Text>
                    <Text allowFontScaling={false} style={styles.celebrationTitle}>Congratulations!</Text>
                    <Text allowFontScaling={false} style={styles.celebrationText}>You won {selectedReward.label}!</Text>
                    <TouchableOpacity
                      style={styles.claimButton}
                      onPress={() => {
                        resetCelebration();
                        closeSpinner();
                        if (onPointsUpdated) {
                          onPointsUpdated();
                        }
                      }}
                    >
                      <Text allowFontScaling={false} style={styles.claimButtonText}>Claim Reward</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </Animated.View>
              )}

              <View style={styles.confettiContainer} pointerEvents="none">
                {renderConfetti()}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Modern "Already Completed" Alert Modal */}
      <Modal
        visible={showModernAlert}
        transparent
        animationType="none"
        onRequestClose={closeModernAlert}
      >
        <Animated.View
          style={[
            styles.modernAlertOverlay,
            { opacity: modernAlertOpacity }
          ]}
        >
          <Animated.View
            style={[
              styles.modernAlertContainer,
              {
                transform: [
                  { scale: modernAlertScale },
                  {
                    rotateZ: modernAlertScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['10deg', '0deg'],
                    }),
                  },
                ],
                opacity: modernAlertOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(123, 104, 238, 0.15)', 'rgba(157, 127, 234, 0.15)']}
              style={styles.modernAlertGradient}
            >
              <View style={styles.glassEffect}>
                <View style={styles.iconCircle}>
                  <LinearGradient
                    colors={['#7B68EE', '#9D7FEA']}
                    style={styles.iconGradient}
                  >
                    <Text allowFontScaling={false} style={styles.modernAlertIcon}>✓</Text>
                  </LinearGradient>
                </View>

                <Text allowFontScaling={false} style={styles.modernAlertTitle}>Attempt Completed</Text>

                <Text allowFontScaling={false} style={styles.modernAlertMessage}>
                  You’ve already used today’s spin.
                </Text>

                <View style={styles.modernDivider} />

                <View style={styles.infoContainer}>
                  <Ionicons name="time-outline" size={18} color="#9D7FEA" />
                  <Text allowFontScaling={false} style={styles.infoText}>
                    Come back tomorrow for another chance to win rewards!
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modernAlertButton}
                  onPress={closeModernAlert}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7B68EE', '#9D7FEA']}
                    style={styles.modernAlertButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text allowFontScaling={false} style={styles.modernAlertButtonText}>Got it</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#fff"
                      style={{ marginLeft: 5 }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({

  // Remove or replace notificationDot with:
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  menuButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#ff4757',
    borderRadius: 4,
  },
  spinnerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  spinnerDrawer: {
    height: height * 0.85,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  spinnerContent: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  spinnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    position: 'relative',
  },
  wheelPointer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
  },
  pointerIcon: {
    fontSize: 40,
    color: '#FFD700',
  },
  wheel: {
    width: 300,
    height: 300,
  },
  spinButton: {
    marginTop: 30,
    marginHorizontal: 40,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  spinButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  celebrationCard: {
    position: 'absolute',
    top: '30%',
    left: 40,
    right: 40,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 15,
  },
  celebrationGradient: {
    padding: 30,
    alignItems: 'center',
  },
  celebrationIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  celebrationText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  claimButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    top: 100,
    left: width / 2,
    borderRadius: 3,
  },

  // Modern Alert Styles
  modernAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modernAlertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modernAlertGradient: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  glassEffect: {
    backgroundColor: 'rgba(29, 29, 39, 0.85)',
    padding: 30,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAlertIcon: {
    fontSize: 45,
    color: '#fff',
    fontWeight: 'bold',
  },
  modernAlertTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modernAlertMessage: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modernDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 127, 234, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(157, 127, 234, 0.2)',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  modernAlertButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modernAlertButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernAlertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.8,
  },
});

export default Header;
