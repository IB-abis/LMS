

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';

const { width } = Dimensions.get('window');

const CalendarScreen = ({ navigation }) => {

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

  // Always normalize date (ignore time, ignore timezone)
  const normalizeDate = (dateStringOrObject) => {
    const d = new Date(dateStringOrObject);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const [calendarData, setCalendarData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Monthly = Admin, My Trainings = User
  const [trainingMode, setTrainingMode] = useState("Monthly"); // "Monthly" | "My"


  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const [userID, applicationProfile] = await Promise.all([
          AsyncStorage.getItem('employeeID'),
          AsyncStorage.getItem('applicationProfile'),
        ]);

        if (!userID) return;

        // Fallback to 'User' if somehow missing
        const profileType = applicationProfile || 'Admin';

        const res = await fetch(
          `https://lms-api.abisaio.com/api/v1/Calendar/GetCalendarData?UserID=${userID}&type=${trainingMode === "Monthly" ? "Admin" : "User"
          }`
        );
        const json = await res.json();

        if (json?.succeeded && Array.isArray(json.data)) {
          setCalendarData(json.data);

          const today = new Date();
          const todayDate = today.getDate();
          const todayMonth = today.getMonth();
          const todayYear = today.getFullYear();

          const todayTasks = json.data.filter(item => {
            const d = normalizeDate(item.trainingDate);
            return (
              d.getDate() === todayDate &&
              d.getMonth() === todayMonth &&
              d.getFullYear() === todayYear
            );
          });

          setTasks(todayTasks);
          setTaskAnims(todayTasks.map(() => new Animated.Value(0)));

          setSelectedDate(todayDate);
          setCurrentMonth(today.toLocaleString('default', { month: 'long' }));
          setCurrentYear(todayYear);
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [trainingMode]);

  // When user toggles training mode, clear previous data immediately
  // then flip the mode so the fetch effect will run and populate new data.
  const handleTrainingModeChange = (mode) => {
    if (mode === trainingMode) return;

    // Clear previous screen data immediately to avoid stale flash
    setCalendarData([]);
    setTasks([]);
    setTaskAnims([]);
    setSelectedDate(null);

    // Show loader while new data is fetched
    setLoading(true);

    // Trigger fetch (useEffect dependent on trainingMode)
    setTrainingMode(mode);
  };


  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonthIndex = today.getMonth();
  const todayYear = today.getFullYear();

  const [selectedDate, setSelectedDate] = useState(todayDay);
  const [currentMonth, setCurrentMonth] = useState(months[todayMonthIndex]);
  const [currentYear, setCurrentYear] = useState(todayYear);

  const handlePrevMonth = () => {
    const newMonthIndex = months.indexOf(currentMonth) - 1;
    let newMonth, newYear;

    if (newMonthIndex < 0) {
      newMonth = months[11];
      newYear = currentYear - 1;
    } else {
      newMonth = months[newMonthIndex];
      newYear = currentYear;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    const today = new Date();
    if (today.getFullYear() === newYear && today.getMonth() === months.indexOf(newMonth)) {
      setSelectedDate(today.getDate());
      const filtered = calendarData.filter(x => {
        const d = normalizeDate(x.trainingDate);
        return (
          d.getFullYear() === newYear &&
          d.getMonth() === months.indexOf(newMonth) &&
          d.getDate() === today.getDate()
        );
      });
      setTasks(filtered);
      const anims = filtered.map(() => new Animated.Value(0));
      setTaskAnims(anims);
    } else {
      setSelectedDate(null);
      setTasks([]);
      setTaskAnims([]);
    }
  };

  const handleNextMonth = () => {
    const newMonthIndex = months.indexOf(currentMonth) + 1;
    let newMonth, newYear;

    if (newMonthIndex > 11) {
      newMonth = months[0];
      newYear = currentYear + 1;
    } else {
      newMonth = months[newMonthIndex];
      newYear = currentYear;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    const today = new Date();
    if (today.getFullYear() === newYear && today.getMonth() === months.indexOf(newMonth)) {
      setSelectedDate(today.getDate());
      const filtered = calendarData.filter(x => {
        const d = normalizeDate(x.trainingDate);
        return (
          d.getFullYear() === newYear &&
          d.getMonth() === months.indexOf(newMonth) &&
          d.getDate() === today.getDate()
        );
      });
      setTasks(filtered);
      const anims = filtered.map(() => new Animated.Value(0));
      setTaskAnims(anims);
    } else {
      setSelectedDate(null);
      setTasks([]);
      setTaskAnims([]);
    }
  };

  // ✅ Use the drawer hook - Calendar is at index 4
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(4);

  // ✅ Use the bottom nav hook
  const {
    selectedTab,
    tabScaleAnims,
    rotateAnims,
    handleTabPress
  } = useBottomNav('Calendar');

  // Animation values for PAGE CONTENT only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const calendarAnim = useRef(new Animated.Value(0)).current;
  const [taskAnims, setTaskAnims] = useState([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calendar data
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const generateCalendarDays = () => {
    const monthIndex = months.indexOf(currentMonth);
    const date = new Date(currentYear, monthIndex, 1);

    const firstDay = (date.getDay() + 6) % 7;
    const daysInMonth = new Date(currentYear, date.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, date.getMonth(), 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = new Date(currentYear, date.getMonth(), i);
      const event = calendarData.find(item => {
        const d = new Date(item.trainingDate);
        return (
          d.getDate() === fullDate.getDate() &&
          d.getMonth() === fullDate.getMonth() &&
          d.getFullYear() === fullDate.getFullYear()
        );
      });

      days.push({
        day: i,
        isCurrentMonth: true,
        hasEvent: !!event,
        eventType: event ? event.type.toLowerCase() : null,
      });
    }

    while (days.length < 42) {
      days.push({ day: days.length - (firstDay + daysInMonth) + 1, isCurrentMonth: false });
    }

    return days;
  };

  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    setCalendarDays(generateCalendarDays());
  }, [currentMonth, currentYear, calendarData]);

  useEffect(() => {
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

    setTimeout(() => {
      Animated.spring(calendarAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 300);

    taskAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 600 + index * 150);
    });

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
  }, []);

  const getEventColor = (type) => {
    switch (type) {
      case 'classroom': return '#A855F7';
      case 'virtual': return '#FF6B6B';
      case 'self': return '#667eea';
      default: return '#667eea';
    }
  };

  useEffect(() => {
    if (!taskAnims || taskAnims.length === 0) return;

    taskAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 200 + index * 150);
    });
  }, [taskAnims]);

  const [userName, setUserName] = useState("");
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const storedName = await AsyncStorage.getItem("name");
        if (storedName) {
          setUserName(storedName);
        }
      } catch (error) {
        console.log("Error fetching name:", error);
      }
    };

    loadUserName();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {/* ✅ Universal Header Component */}
        <Header title="Calendar" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />

        {/* Greeting Section */}
        <Animated.View
          style={[
            styles.greetingSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['rgba(123, 104, 238, 0.2)', 'rgba(123, 104, 238, 0.05)']}
            style={styles.greetingCard}
          >
            <Text allowFontScaling={false} style={styles.greetingText}>
              {getGreeting()}, {userName ? userName : "User"} ☀️
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Training Mode Toggle */}
        <View style={styles.trainingToggleContainer}>
          {/* Monthly Trainings Button */}
          <TouchableOpacity
            style={[
              styles.trainingToggleBtn,
              trainingMode === "Monthly" && styles.trainingToggleBtnActive
            ]}
            onPress={() => handleTrainingModeChange("Monthly")}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.trainingToggleText,
                trainingMode === "Monthly" && styles.trainingToggleTextActive
              ]}
            >
              Monthly Trainings
            </Text>
          </TouchableOpacity>

          {/* My Trainings Button */}
          <TouchableOpacity
            style={[
              styles.trainingToggleBtn,
              trainingMode === "My" && styles.trainingToggleBtnActive
            ]}
            onPress={() => handleTrainingModeChange("My")}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.trainingToggleText,
                trainingMode === "My" && styles.trainingToggleTextActive
              ]}
            >
              My Trainings
            </Text>
          </TouchableOpacity>
        </View>


        {/* Loading overlay shown while switching modes */}
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color="#7B68EE" />
          </View>
        )}

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
              <Text allowFontScaling={false} style={styles.legendText}>Classroom Training</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text allowFontScaling={false} style={styles.legendText}>Virtual Training</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#667eea' }]} />
              <Text allowFontScaling={false} style={styles.legendText}>Self Enroll</Text>
            </View>
          </View>

          {/* Calendar Card */}
          <Animated.View
            style={[
              styles.calendarCard,
              {
                opacity: calendarAnim,
                transform: [{
                  scale: calendarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={['#fff', '#f8f9ff']}
              style={styles.calendarGradient}
            >
              {/* Month Header */}
              <View style={styles.monthHeader}>
                <TouchableOpacity style={styles.monthButton} onPress={handlePrevMonth}>
                  <Ionicons name="chevron-back" size={24} color="#7B68EE" />
                </TouchableOpacity>
                <View style={styles.monthTextContainer}>
                  <Text allowFontScaling={false} style={styles.monthText}>{currentMonth}</Text>
                  <Text allowFontScaling={false} style={styles.yearText}>🗓️ {currentYear}</Text>
                </View>
                <TouchableOpacity style={styles.monthButton} onPress={handleNextMonth}>
                  <Ionicons name="chevron-forward" size={24} color="#7B68EE" />
                </TouchableOpacity>
              </View>

              {/* Days of Week */}
              <View style={styles.daysOfWeekRow}>
                {daysOfWeek.map((day, index) => (
                  <View key={index} style={styles.dayOfWeekCell}>
                    <Text allowFontScaling={false} style={styles.dayOfWeekText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((item, index) => {
                  const isSelected = item.day === selectedDate && item.isCurrentMonth;

                  const isMyTrainingDay =
                    trainingMode === "My" &&
                    item.hasEvent &&
                    item.isCurrentMonth &&
                    !isSelected;

                  const today = new Date();

                  const isToday =
                    item.day === today.getDate() &&
                    item.isCurrentMonth &&
                    months.indexOf(currentMonth) === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const selectedColors =
                    trainingMode === "My"
                      ? item.hasEvent
                        ? [getEventColor(item.eventType), getEventColor(item.eventType)]
                        : ['#22C55E', '#16A34A'] // ✅ green only when NO event
                      : ['#7B68EE', '#9D7FEA'];



                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        if (!item.isCurrentMonth) return;

                        setSelectedDate(item.day);

                        const clickedYear = currentYear;
                        const clickedMonth = months.indexOf(currentMonth);
                        const clickedDay = item.day;

                        const filtered = calendarData.filter(x => {
                          const d = normalizeDate(x.trainingDate);
                          return (
                            d.getFullYear() === clickedYear &&
                            d.getMonth() === clickedMonth &&
                            d.getDate() === clickedDay
                          );
                        });

                        setTasks(filtered);

                        const newAnims = filtered.map(() => new Animated.Value(0));
                        setTaskAnims(newAnims);

                        newAnims.forEach((anim, idx) => {
                          setTimeout(() => {
                            Animated.spring(anim, {
                              toValue: 1,
                              tension: 40,
                              friction: 7,
                              useNativeDriver: true,
                            }).start();
                          }, 150 + idx * 120);
                        });
                      }}
                      style={styles.dayCell}
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={selectedColors}
                          style={[
                            styles.selectedDay,
                            trainingMode === "My" && styles.selectedDayCircle
                          ]}
                        >
                          <Text allowFontScaling={false} style={styles.selectedDayText}>{item.day}</Text>
                          {item.hasEvent && (
                            <View style={[styles.eventDot, { backgroundColor: '#fff' }]} />
                          )}
                        </LinearGradient>
                      ) : isMyTrainingDay ? (
                        /* ✅ MY TRAINING DAY — solid color box */
                        <View
                          style={[
                            styles.myTrainingDay,
                            { backgroundColor: getEventColor(item.eventType) }
                          ]}
                        >
                          <Text style={styles.myTrainingDayText}>{item.day}</Text>
                        </View>
                      ) : (
                        /* ✅ Normal day */
                        <View style={styles.dayContent}>
                          <Text
                            style={[
                              styles.dayText,
                              !item.isCurrentMonth && styles.inactiveDayText,
                            ]}
                          >
                            {item.day}
                          </Text>

                          {/* Dot ONLY for Monthly mode */}
                          {trainingMode === "Monthly" &&
                            item.hasEvent &&
                            item.isCurrentMonth && (
                              <View
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: getEventColor(item.eventType) }
                                ]}
                              />
                            )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Today's Tasks */}
          <View style={styles.tasksSection}>
            <Text allowFontScaling={false} style={styles.tasksSectionTitle}>
              {(() => {
                if (selectedDate === null) {
                  return "No date selected";
                }

                const today = new Date();
                const isToday =
                  selectedDate === today.getDate() &&
                  months.indexOf(currentMonth) === today.getMonth() &&
                  currentYear === today.getFullYear();

                return isToday
                  ? "Today's Tasks"
                  : `Tasks for ${selectedDate} ${currentMonth}`;
              })()}
            </Text>

            {tasks.length === 0 ? (
              <Text allowFontScaling={false} style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                No trainings scheduled for this date.
              </Text>
            ) : (
              tasks.map((task, index) => {
                const scale = taskAnims[index]
                  ? taskAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
                  : 1;
                const translateY = taskAnims[index]
                  ? taskAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] })
                  : 0;
                const opacity = taskAnims[index] || 1;

                const typeColor = getEventColor(task.type?.toLowerCase());

                const dateObj = new Date(task.trainingDate);
                const dateStr = dateObj.toDateString();

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.taskCard,
                      {
                        opacity,
                        transform: [{ scale }, { translateY }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[typeColor, '#7B68EE']}
                      style={styles.taskGradient}
                    >
                      <View style={styles.taskLeft}>
                        <Text allowFontScaling={false} style={styles.taskDate}>{dateObj.getDate()}</Text>
                        <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 10 }}>{currentMonth.slice(0, 3)}</Text>
                      </View>

                      <View style={styles.taskMiddle}>
                        <FontAwesome5
                          name={task.type?.toLowerCase() === 'virtual' ? 'video' : 'chalkboard-teacher'}
                          size={16}
                          color="#fff"
                          style={styles.taskIcon}
                        />
                        <View style={styles.taskInfo}>
                          <Text allowFontScaling={false} style={styles.taskTitle}>{task.title}</Text>
                          <View style={styles.taskMeta}>
                            <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                            <Text allowFontScaling={false} style={styles.taskMetaText}>{dateStr}</Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.detailsBtn} onPress={() => {
                        setSelectedTask(task);
                        setModalVisible(true);
                      }}>
                        <Text allowFontScaling={false} style={styles.detailsBtnText}>Details</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </Animated.View>
                );
              })
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTask && (
              <>
                <Text allowFontScaling={false} style={styles.modalTitle}>Training Session Details</Text>
                <Text allowFontScaling={false} style={styles.modalSubTitle}>{selectedTask.title}</Text>

                {(() => {
                  const start = new Date(selectedTask.trainingDate);
                  const end = new Date(start.getTime() + selectedTask.duration * 60000);

                  const formatTime = (d) =>
                    d.toLocaleString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });

                  return (
                    <>
                      <Text allowFontScaling={false} style={styles.modalText}>
                        <Text allowFontScaling={false} style={styles.modalLabel}>Start: </Text>
                        {formatTime(start)}
                      </Text>
                      <Text allowFontScaling={false} style={styles.modalText}>
                        <Text allowFontScaling={false} style={styles.modalLabel}>End: </Text>
                        {formatTime(end)}
                      </Text>
                    </>
                  );
                })()}

                {selectedTask.trainerName && (
                  <Text allowFontScaling={false} style={styles.modalText}>
                    <Text allowFontScaling={false} style={styles.modalLabel}>Trainer: </Text>
                    {selectedTask.trainerName}
                  </Text>
                )}

                {selectedTask.location && (
                  <Text allowFontScaling={false} style={styles.modalText}>
                    <Text allowFontScaling={false} style={styles.modalLabel}>Location: </Text>
                    {selectedTask.location.trim()}
                  </Text>
                )}

                {selectedTask.venue && (
                  <Text allowFontScaling={false} style={styles.modalText}>
                    <Text allowFontScaling={false} style={styles.modalLabel}>Venue: </Text>
                    {selectedTask.venue.trim()}
                  </Text>
                )}

                <View style={styles.modalButtonRow}>
                  <Pressable
                    style={[styles.modalButton, { backgroundColor: '#7B68EE' }]}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('TrainingDetails', {
                        trainingSessionId: selectedTask.trainingSessionId
                      });
                    }}
                  >
                    <Text allowFontScaling={false} style={styles.modalButtonText}>DETAILS</Text>
                  </Pressable>


                  <Pressable
                    style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text allowFontScaling={false} style={[styles.modalButtonText, { color: '#000' }]}>CLOSE</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ✅ Universal Bottom Navigation Component */}
      <BottomNavigation
        selectedTab={selectedTab}
        tabScaleAnims={tabScaleAnims}
        rotateAnims={rotateAnims}
        handleTabPress={handleTabPress}
        navigation={navigation}
      />

      {/* ✅ Universal Drawer Component */}
      <CustomDrawer
        drawerVisible={drawerVisible}
        drawerSlideAnim={drawerSlideAnim}
        overlayOpacity={overlayOpacity}
        menuItemAnims={menuItemAnims}
        selectedMenuItem={selectedMenuItem}
        handleMenuItemPress={(index) => handleMenuItemPress(index, navigation)}
        toggleDrawer={toggleDrawer}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  selectedDayCircle: {
    borderRadius: 999,   // perfect circle
  },

  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainContent: {
    flex: 1,
  },
  greetingSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  greetingCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  trainingToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
  },

  trainingToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  trainingToggleBtnActive: {
    backgroundColor: '#7B68EE',
    elevation: 3,
  },

  trainingToggleText: {
    fontSize: 13,
    color: '#a8b2d1',
    fontWeight: '600',
  },

  trainingToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  scrollContent: {
    flex: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#a8b2d1',
    fontWeight: '500',
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 25,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  calendarGradient: {
    padding: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTextContainer: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
  yearText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B68EE',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  selectedDay: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  selectedDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 15,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  inactiveDayText: {
    color: '#CCC',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  tasksSection: {
    paddingHorizontal: 20,
  },
  tasksSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  taskCard: {
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  taskGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  taskLeft: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 12,
    minWidth: 55,
    alignItems: 'center',
  },
  taskDate: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  taskMiddle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    marginRight: 10,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  taskMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  detailsBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  detailsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 9999,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#7B68EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B68EE',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  myTrainingDay: {
    flex: 1,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  myTrainingDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },

});

export default CalendarScreen;

