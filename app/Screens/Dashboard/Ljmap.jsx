import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export default function Ljmap({ containerBackgroundColor = '#fff' }) {
  const ELEMENTS_VERTICAL_OFFSET = -155;
  const ELEMENTS_HORIZONTAL_OFFSET = 18;
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  // ⭐ NEW: journey info state
  const [journeyName, setJourneyName] = useState(null);
  const [journeyStartDate, setJourneyStartDate] = useState(null);
  const [journeyEndDate, setJourneyEndDate] = useState(null);
  const bounceAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const allButtons = [
    { id: 1, level: 1, x: 270, y: 220, size: 24, color: '#050000ff', glow: '#0c0101ff' },
    { id: 2, level: 2, x: 210, y: 240, size: 24, color: '#040404ff', glow: '#0d0e0eff' },
    { id: 3, level: 3, x: 140, y: 240, size: 24, color: '#000000ff', glow: '#060605ff' },
    { id: 4, level: 4, x: 90, y: 270, size: 24, color: '#000000ff', glow: '#000101ff' },
    { id: 5, level: 5, x: 110, y: 310, size: 24, color: '#000000ff', glow: '#0e0e0eff' },
    { id: 6, level: 6, x: 160, y: 320, size: 24, color: '#0e0f0fff', glow: '#000000ff' },
    { id: 7, level: 7, x: 220, y: 320, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 8, level: 8, x: 280, y: 330, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 9, level: 9, x: 290, y: 380, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 10, level: 10, x: 240, y: 400, size: 24, color: '#000000ff', glow: '#020202ff' },
    { id: 11, level: 11, x: 180, y: 400, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 12, level: 12, x: 120, y: 400, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 13, level: 13, x: 80, y: 430, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 14, level: 14, x: 90, y: 480, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 15, level: 15, x: 145, y: 490, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 16, level: 16, x: 200, y: 485, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 17, level: 17, x: 280, y: 490, size: 25, color: '#000000ff', glow: '#000000ff' },
    { id: 18, level: 18, x: 300, y: 525, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 19, level: 19, x: 270, y: 560, size: 24, color: '#000000ff', glow: '#000000ff' },
    { id: 20, level: 20, x: 210, y: 570, size: 24, color: '#000000ff', glow: '#000000ff' },
  ];
  const milestoneImages = [
    {
      x: 10,
      y: 160,
      width: 100,
      height: 100,
      source: require('../../Images/hat.png')
    },
    {
      x: 300,
      y: 280,
      width: 80,
      height: 80,
      source: require('../../Images/hat.png')
    },
    {
      x: 120,
      y: 350,
      width: 55,
      height: 55,
      source: require('../../Images/hat.png')
    },
    {
      x: 110,
      y: 550,
      width: 60,
      height: 60,
      source: require('../../Images/hat.png')
    },
  ];
  useEffect(() => {
    fetchUserProgress();
  }, []);
  useEffect(() => {
    const animations = bounceAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            delay: index * 200,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    });
    animations.forEach(animation => animation.start());
  }, []);
  const fetchUserProgress = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.log('No token found');
      setLoading(false);
      return;
    }

    const response = await fetch('https://lms-api-qa.abisaio.com/api/v1/Journey/user-progress', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Handle 404 or failed response gracefully
    if (!response.ok || !data.succeeded) {
      console.log('No journey found:', data.message || 'User has no journey assigned');
      // Reset all state to default values
      setTotalAssigned(0);
      setCompleted(0);
      setJourneyName(null);
      setJourneyStartDate(null);
      setJourneyEndDate(null);
      setLoading(false);
      return;
    }

    // Success case - user has journey data
    if (data.succeeded) {
      setTotalAssigned(data.totalAssigned || 0);
      setCompleted(data.completed || 0);

      // Set journey info if available
      if (data.journey) {
        setJourneyName(data.journey.name || null);
        setJourneyStartDate(data.journey.startDate || null);
        setJourneyEndDate(data.journey.endDate || null);
      }
    }

  } catch (error) {
    // Only log actual network/parsing errors
    console.log('Network error fetching journey:', error.message);
    // Set default values on network error
    setTotalAssigned(0);
    setCompleted(0);
    setJourneyName(null);
    setJourneyStartDate(null);
    setJourneyEndDate(null);
  } finally {
    setLoading(false);
  }
};

  const getDisplayButtons = () => {
    if (totalAssigned === 0) {
      return allButtons;
    }
    const dynamicButtons = [];
    const totalButtons = totalAssigned + 1;
    for (let i = 0; i <= totalAssigned; i++) {
      const positionIndex = Math.round((i * 19) / totalAssigned);
      const originalButton = allButtons[positionIndex];
      dynamicButtons.push({
        ...originalButton,
        level: i,
        isCompleted: i < completed,
        isCurrent: i === completed,
      });
    }
    return dynamicButtons;
  };
  const buttons = getDisplayButtons();
  const getStellaPosition = () => {
    const currentButton = buttons.find(btn => btn.level === completed);
    return currentButton;
  };
  const stellaPosition = getStellaPosition();
  const lastButton = buttons[buttons.length - 1]; // ⭐ Get last button for end date
  const handleButtonPress = (level) => {
    console.log(`Level ${level} button pressed!`);
  };
  const isTransparent = containerBackgroundColor === 'transparent';
  const containerStyle = [
    isTransparent ? styles.containerEmbedded : styles.container,
    { backgroundColor: containerBackgroundColor },
  ];
  if (loading) {
    return (
      <View style={[containerStyle, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4fed67ff" />
      </View>
    );
  }
if (!journeyName && totalAssigned === 0) {
  return (
    <View style={styles.noJourneyFullBox}>
      <Text allowFontScaling={false} style={styles.noJourneyText}>No journey allotted</Text>
    </View>
  );
}


  // ⭐ Helper function to format date (remove time)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // Format: DD/MM/YYYY
    // Or use 'en-US' for MM/DD/YYYY format
  };
  return (
    <View style={containerStyle}>
      {/* ⭐ Image container wrapper */}
      <View style={styles.imageContainer}>
        {/* Background Image */}
        <Image source={require('../../Images/journey.png')} style={styles.myImage} />

        {/* Rest of your code stays same - milestones, buttons, stella, etc. */}
        {milestoneImages.map((milestone, index) => {
          const anim = bounceAnims[index % bounceAnims.length]; // ✅ wrap around
          const bounceTranslate = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -15],
          });

          return (
            <Animated.Image
              key={index}
              source={milestone.source}
              style={[
                styles.milestoneImage,
                {
                  width: milestone.width,
                  height: milestone.height,
                  bottom: milestone.y + ELEMENTS_VERTICAL_OFFSET,
                  right: milestone.x - ELEMENTS_HORIZONTAL_OFFSET,
                  transform: [{ translateY: bounceTranslate }],
                },
              ]}
            />
          );
        })}

        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={[
              styles.buttonContainer,
              {
                bottom: button.y + ELEMENTS_VERTICAL_OFFSET,
                right: button.x - ELEMENTS_HORIZONTAL_OFFSET,
                width: button.size + 4,
                height: button.size + 4,
              },
            ]}
            onPress={() => handleButtonPress(button.level)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.boxButton,
              {
                width: button.size,
                height: button.size,
                backgroundColor: button.isCompleted ? '#4fed67ff' : "#fff",
                shadowColor: button.isCompleted ? '#4fed67ff' : "#fff",
                borderColor: button.isCompleted ? '#4fed67ff' : "#fff",
              }
            ]}>
              <Text allowFontScaling={false} style={[
                styles.buttonText,
                { fontSize: button.size > 28 ? 12 : 10 }
              ]}>
                {button.level}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {stellaPosition && (
          <Image
            source={require('../../Images/stella.png')}
            style={[
              styles.stellaIcon,
              {
                bottom: stellaPosition.y - 30 + ELEMENTS_VERTICAL_OFFSET,
                right: stellaPosition.x - 20 - ELEMENTS_HORIZONTAL_OFFSET,
              }
            ]}
          />
        )}

        {journeyStartDate && buttons.length > 0 && (
          <View
            style={[
              styles.dateBadge,
              {
                bottom: buttons[0].y + 10 + ELEMENTS_VERTICAL_OFFSET,       // Always stick to first button
                right: buttons[0].x - 100 - ELEMENTS_HORIZONTAL_OFFSET,
              },
            ]}
          >
            <Text allowFontScaling={false} style={styles.dateBadgeText}>{formatDate(journeyStartDate)}</Text>
          </View>
        )}
        {lastButton && journeyEndDate && (
          <View
            style={[
              styles.dateBadge,
              {
                bottom: lastButton.y + 30 + ELEMENTS_VERTICAL_OFFSET,
                right: lastButton.x + 10 + ELEMENTS_HORIZONTAL_OFFSET,
              },
            ]}
          >
            <Text allowFontScaling={false} style={styles.dateBadgeText}>{formatDate(journeyEndDate)}</Text>
          </View>
        )}

        <View style={[styles.trapezoid, {
          bottom: 610 + ELEMENTS_VERTICAL_OFFSET,
          right: 155 - ELEMENTS_HORIZONTAL_OFFSET
        }]} />

        <Image
          source={require('../../Images/Trophy.png')}
          style={[styles.trophy, {
            bottom: 600 + ELEMENTS_VERTICAL_OFFSET,
            right: 175 - ELEMENTS_HORIZONTAL_OFFSET
          }]}
        />
      </View>
    </View>
  );

}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 0,
    position: 'relative',
  },
  containerEmbedded: {
    width: '100%',
    height: 600, // ⭐ Increased for two separate boxes
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 0,
    position: 'relative',
  },
  // ⭐ Journey name box (separate)
  journeyNameBox: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4fed67ff',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  journeyNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000ff',
    textAlign: 'left',
  },
  // ⭐ Journey dates box (separate)
  journeyDatesBox: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  journeyDatesText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'left',
  },
  // ⭐ Image container
  imageContainer: {
    width: 410,
    height: 600,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  myImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // ... rest remains same
  trapezoid: {
    position: 'absolute',
    width: 100,
    height: 0,
    borderTopWidth: 147,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
    borderLeftWidth: 20,
    borderLeftColor: 'transparent',
    borderRightWidth: 20,
    borderRightColor: 'transparent',
  },
  trophy: {
    position: 'absolute',
    width: 60,
    height: 100,
  },
  milestoneImage: {
    position: 'absolute',
    resizeMode: 'contain',
    opacity: 0.9,
  },
  buttonContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1.5,
  },
  buttonText: {
    color: '#000000ff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stellaIcon: {
    position: 'absolute',
    width: 100,
    height: 100,
    resizeMode: 'contain',
    zIndex: 10,
  },
noJourneyFullBox: {
  flex: 1,
  width: '100%',
  backgroundColor: '#2C2E4A',
  alignItems: 'center',
  justifyContent: 'center',
  // Remove borderRadius, padding, shadow, and minWidth
  // so it takes the entire container space
},
noJourneyText: {
  fontSize: 16,
  fontWeight: '500',
  color: '#9CA3AF',
  textAlign: 'center',
},

  dateBadge: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 15,
  },
  dateBadgeText: {
    fontSize: 9,
    color: '#111827',
    fontWeight: '600',
  },
});