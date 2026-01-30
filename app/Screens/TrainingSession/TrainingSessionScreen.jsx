import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';
// ADD: dropdown + datepicker imports (copy into imports section)
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';


const { width } = Dimensions.get('window');

const API_BASE = 'https://lms-api-qa.abisaio.com/api/v1/TrainingSession/GetTrainingSession';

const TrainingSessionScreen = ({ navigation }) => {
  const { openNotification } = useNotification();
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [sessions, setSessions] = useState([]); // raw sessions from API
  const [filteredSessions, setFilteredSessions] = useState([]); // result after search
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [employeeID, setEmployeeID] = useState(null);
  const [counts, setCounts] = useState({ ALL: '-', UPCOMING: '-', COMPLETED: '-', INCOMPLETE: '-' });
  const [error, setError] = useState(null);

  // ADD these states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Filter fields (training-specific)
  const [type, setType] = useState(''); // Online / Classroom
  const [userType, setUserType] = useState(''); // user / trainer
  const [statusFilter, setStatusFilter] = useState(''); // all, participants creation pending, batch creation pending, published, pending
  const [coursesList, setCoursesList] = useState([]); // from Course/GetCourseList
  const [courseId, setCourseId] = useState('');
  const [trainersList, setTrainersList] = useState([]); // from trainer API
  const [trainerId, setTrainerId] = useState('');

  // Date filters
  const [createdFrom, setCreatedFrom] = useState(null);
  const [createdTo, setCreatedTo] = useState(null);
  const [trainingStart, setTrainingStart] = useState(null);
  const [trainingEnd, setTrainingEnd] = useState(null);

  // Date picker toggles (copy pattern from course screen)
  const [showCreatedFromPicker, setShowCreatedFromPicker] = useState(false);
  const [showCreatedToPicker, setShowCreatedToPicker] = useState(false);
  const [showTrainingStartPicker, setShowTrainingStartPicker] = useState(false);
  const [showTrainingEndPicker, setShowTrainingEndPicker] = useState(false);

  const [refreshing, setRefreshing] = useState(false);


  // Sort state
  const [sortBy, setSortBy] = useState('');
  // ADD: fetch courses & trainers list on mount (or after token available)
  useEffect(() => {
    const fetchAux = async () => {
      try {
        // Course list
        const cResp = await fetch('https://lms-api-qa.abisaio.com/api/v1/Course/GetCourseList');
        const cJson = await cResp.json();
        if (cJson.succeeded && Array.isArray(cJson.data)) {
          setCoursesList(cJson.data);
        } else {
          console.warn('Failed to fetch course list', cJson);
        }

        // Trainer list - endpoint you provided earlier (replace URL if different)
        const tResp = await fetch('https://lms-api-qa.abisaio.com/api/v1/TrainingSession/GetTrainer');

        const tJson = await tResp.json();
        if (tJson.succeeded && Array.isArray(tJson.data)) {
          setTrainersList(tJson.data);
        } else {
          console.warn('Failed to fetch trainers list', tJson);
        }
      } catch (err) {
        console.warn('Aux lists fetch error', err);
      }
    };

    fetchAux();
  }, []);


  // Animations
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(3);

  const { selectedTab, tabScaleAnims, rotateAnims, handleTabPress } = useBottomNav('Sessions');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // We'll create dynamic animated values for filters when filters change
  const [filterAnims, setFilterAnims] = useState([]);

  // Filters list (labels must match selection logic)
  const filtersList = [
    { label: 'ALL', apiTabStatus: null },
    { label: 'UPCOMING', apiTabStatus: 'Planned' },
    { label: 'COMPLETED', apiTabStatus: 'Completed' },
    { label: 'INCOMPLETE', apiTabStatus: 'incomplete' },
  ];

  // initialize animation values when component mounts or filters change
  useEffect(() => {
    setFilterAnims(filtersList.map(() => new Animated.Value(0)));
  }, []); // only once

  // handle hardware back
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Dashboard');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  // animate page in once
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
      Animated.spring(searchBarAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);

    // animate filter buttons in a sequence
    filterAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 300 + index * 100);
    });
  }, [filterAnims]);

  // Load token and employeeID from AsyncStorage and then fetch ALL
  // Load token + employeeID and fetch ALL filter counts immediately
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedEmployeeID = await AsyncStorage.getItem('employeeID') || await AsyncStorage.getItem('userID');

        if (!storedToken || !storedEmployeeID) {
          setError('Missing token or user ID. Please login again.');
          return;
        }

        setToken(storedToken);
        setEmployeeID(storedEmployeeID);

        // ✅ Fetch all filters once and fill counts
        Promise.all([
          fetchSessions(null, storedEmployeeID, storedToken, 1, 100),        // ALL
          fetchSessions('Planned', storedEmployeeID, storedToken, 1, 20),    // UPCOMING
          fetchSessions('Completed', storedEmployeeID, storedToken, 1, 20),  // COMPLETED
          fetchSessions('incomplete', storedEmployeeID, storedToken, 1, 20), // INCOMPLETE
        ]);

      } catch (err) {
        setError('Failed to load credentials');
        console.warn('AsyncStorage error', err);
      }
    })();
  }, []);

  // Fetch function
  // REPLACE existing fetchSessions with this enhanced version
  const formatDate = (d) => {
    if (!d) return '';
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchSessions = async (
    tabStatus = null,
    userId = employeeID,
    authToken = token,
    page = 1,
    rows = 20,
    opts = {} // <- new overrides object
  ) => {
    if (!userId || !authToken) return;
    setLoading(true);
    setError(null);

    try {
      // use overrides or state values
      const effectiveType = opts.type !== undefined ? opts.type : (type || '');
      const effectiveUserType = opts.userType !== undefined ? opts.userType : (userType || '');
      const effectiveCourseId = opts.courseId !== undefined ? opts.courseId : (courseId ? String(courseId) : '');
      const effectiveStatus = opts.status !== undefined ? opts.status : (statusFilter || '');
      const effectiveFromDate = opts.fromDate !== undefined ? opts.fromDate : (createdFrom ? formatDate(createdFrom) : '');
      const effectiveToDate = opts.toDate !== undefined ? opts.toDate : (createdTo ? formatDate(createdTo) : '');
      const effectiveSearch = opts.search !== undefined ? opts.search : (searchText || '');
      const effectiveTrainingStart = opts.trainingStart !== undefined ? opts.trainingStart : (trainingStart ? formatDate(trainingStart) : '');
      const effectiveTrainingEnd = opts.trainingEnd !== undefined ? opts.trainingEnd : (trainingEnd ? formatDate(trainingEnd) : '');
      const effectiveTrainerID = opts.trainerId !== undefined ? opts.trainerId : (trainerId ? String(trainerId) : '');
      const effectiveSort = opts.sort !== undefined ? opts.sort : (sortBy || '');

      // Build params
      const params = new URLSearchParams();
      params.append('UserID', String(userId));
      params.append('page', String(page));
      params.append('RowsPerPage', String(rows));
      params.append('type', effectiveType);
      params.append('userType', effectiveUserType);
      params.append('courseId', effectiveCourseId);
      params.append('status', effectiveStatus);
      params.append('FromDate', effectiveFromDate);
      params.append('ToDate', effectiveToDate);
      params.append('Search', effectiveSearch);
      params.append('TrainingStartDate', effectiveTrainingStart);
      params.append('TrainingEndDate', effectiveTrainingEnd);
      params.append('TrainerID', effectiveTrainerID);
      if (effectiveSort) params.append('Sort', effectiveSort);
      if (tabStatus) params.append('TabStatus', tabStatus);

      const url = `${API_BASE}?${params.toString()}`;
      console.log('[Sessions] Fetching:', url); // debugging

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API error ${resp.status} - ${txt}`);
      }

      const json = await resp.json();
      if (!json.succeeded) throw new Error(json.message || 'API returned failed');

      const rawData = Array.isArray(json.data) ? json.data : [];

      const mapped = rawData.map(item => {
        const batchDate = item.trainingSessionBatch && item.trainingSessionBatch.trainingDate ? item.trainingSessionBatch.trainingDate : item.trainingDate;
        const dateObj = batchDate ? new Date(batchDate) : null;
        const dateStr = dateObj ? dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const timeStr = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return {
          id: item.id,
          name: item.title || item.courseName || 'Untitled',
          date: dateStr,
          mode: item.type || '',
          time: timeStr || '',
          raw: item
        };
      });

      setSessions(mapped);
      // if a search string is active we still filter local mapping; otherwise set all
      if (effectiveSearch && effectiveSearch.trim().length > 0) {
        const q = effectiveSearch.toLowerCase();
        setFilteredSessions(mapped.filter(s => s.name.toLowerCase().includes(q)));
      } else {
        setFilteredSessions(mapped);
      }

      // update counts if provided by API
      const c = (typeof json.count === 'number') ? json.count : mapped.length;
      const label = tabStatus === null ? 'ALL' : (tabStatus === 'Planned' ? 'UPCOMING' : (tabStatus === 'Completed' ? 'COMPLETED' : (tabStatus.toLowerCase() === 'incomplete' ? 'INCOMPLETE' : 'ALL')));
      setCounts(prev => ({ ...prev, [label]: c }));

      setLoading(false);
    } catch (err) {
      console.warn('fetchSessions error', err);
      setLoading(false);
      setError('Failed to load sessions');
      Alert.alert('Error', err.message || 'Failed to fetch training sessions');
    }
  };


  // Handle filter press - will call API for the selected tab and update UI
  const handleFilterPress = (filterLabel, index) => {
    setSelectedFilter(filterLabel);

    // animate button press
    const anim = filterAnims[index];
    if (anim) {
      Animated.sequence([
        Animated.spring(anim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Map label to TabStatus param
    const filterObj = filtersList.find(f => f.label === filterLabel);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;

    // decide RowsPerPage (you gave examples: 20 or 100 earlier)
    const rows = (filterLabel === 'ALL') ? 100 : 20;

    fetchSessions(tabStatus, employeeID, token, 1, rows);
  };

  // Pull to refresh handler (same behavior as CoursesScreen)
  const onRefresh = async () => {
    try {
      setRefreshing(true);

      const rows = selectedFilter === 'ALL' ? 100 : 20;
      const filterObj = filtersList.find(f => f.label === selectedFilter);
      const tabStatus = filterObj ? filterObj.apiTabStatus : null;

      // Reset ALL filters on pull-refresh (same as CoursesScreen)
      setType('');
      setUserType('');
      setStatusFilter('');
      setCourseId('');
      setTrainerId('');
      setCreatedFrom(null);
      setCreatedTo(null);
      setTrainingStart(null);
      setTrainingEnd(null);
      setSortBy('');
      setSearchText('');

      await fetchSessions(tabStatus, employeeID, token, 1, rows, {
        type: '',
        userType: '',
        courseId: '',
        status: '',
        fromDate: '',
        toDate: '',
        trainingStart: '',
        trainingEnd: '',
        trainerId: '',
        sort: '',
        search: ''
      });

    } finally {
      setRefreshing(false);
    }
  };


  // Handle local search
  // REPLACE the current handleSearch with this (will call API as user types)
  const handleSearch = (text) => {
    setSearchText(text);
    // call API immediately, same behavior as CoursesScreen
    // Use current selected tab rows decision: ALL => 100 else 20 (reuse your logic)
    const rows = (selectedFilter === 'ALL') ? 100 : 20;
    // map selectedFilter to TabStatus param as earlier
    const filterObj = filtersList.find(f => f.label === selectedFilter);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;

    // call fetchSessions with the search override
    fetchSessions(tabStatus, employeeID, token, 1, rows, { search: text, sort: sortBy });
  };
  // ADD: apply filters (close modal and fetch)
  const applyFilters = () => {
    setFilterModalVisible(false);
    const rows = (selectedFilter === 'ALL') ? 100 : 20;
    const filterObj = filtersList.find(f => f.label === selectedFilter);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;

    fetchSessions(tabStatus, employeeID, token, 1, rows, {
      type,
      userType,
      courseId,
      status: statusFilter,
      fromDate: createdFrom ? formatDate(createdFrom) : '',
      toDate: createdTo ? formatDate(createdTo) : '',
      trainingStart: trainingStart ? formatDate(trainingStart) : '',
      trainingEnd: trainingEnd ? formatDate(trainingEnd) : '',
      trainerId,
      sort: sortBy,
      search: searchText
    });
  };

  // ADD: reset filters
  const resetFilters = () => {
    setType('');
    setUserType('');
    setStatusFilter('');
    setCourseId('');
    setTrainerId('');
    setCreatedFrom(null);
    setCreatedTo(null);
    setTrainingStart(null);
    setTrainingEnd(null);
    setFilterModalVisible(false);

    // fetch with cleared filters
    const rows = (selectedFilter === 'ALL') ? 100 : 20;
    const filterObj = filtersList.find(f => f.label === selectedFilter);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;
    fetchSessions(tabStatus, employeeID, token, 1, rows, {
      type: '',
      userType: '',
      courseId: '',
      status: '',
      fromDate: '',
      toDate: '',
      trainingStart: '',
      trainingEnd: '',
      trainerId: '',
      sort: sortBy,
      search: searchText
    });
  };

  // ADD: apply sort
  const applySort = (option) => {
    setSortBy(option);
    setSortModalVisible(false);
    // call fetch with sort override
    const rows = (selectedFilter === 'ALL') ? 100 : 20;
    const filterObj = filtersList.find(f => f.label === selectedFilter);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;
    fetchSessions(tabStatus, employeeID, token, 1, rows, { sort: option, search: searchText });
  };

  // ADD: reset sort
  const resetSort = () => {
    setSortBy('');
    setSortModalVisible(false);
    const rows = (selectedFilter === 'ALL') ? 100 : 20;
    const filterObj = filtersList.find(f => f.label === selectedFilter);
    const tabStatus = filterObj ? filterObj.apiTabStatus : null;
    fetchSessions(tabStatus, employeeID, token, 1, rows, { sort: '', search: searchText });
  };


  // default "Show Details" nav logic kept from your original
  const handleShowDetails = (session) => {
    navigation.navigate('TrainingDetails', { trainingSessionId: session.raw.id, session: session.raw });
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.mainContent}>
        <Header title="Session" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />

        <Animated.View
          style={[
            styles.titleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
        </Animated.View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={['#fff']}
            />
          }
        >

          <View style={styles.scrollContainer}>

            {/* Filters - horizontally scrollable */}
            <Animated.View
              style={[
                styles.filterContainer,
                {
                  opacity: searchBarAnim,
                  transform: [{
                    translateY: searchBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }
              ]}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6 }}>
                {filtersList.map((filter, index) => {
                  const isSelected = selectedFilter === filter.label;
                  const scale = filterAnims[index] || new Animated.Value(1);
                  const displayCount = counts[filter.label] !== undefined ? counts[filter.label] : '-';

                  return (
                    <Animated.View key={filter.label} style={{ transform: [{ scale }], marginRight: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleFilterPress(filter.label, index)}
                        activeOpacity={0.8}
                        style={[
                          styles.filterButton,
                          isSelected && { backgroundColor: '#6B7FD7' } // keep your style; previously colors were provided by filters array
                        ]}
                      >
                        <Text allowFontScaling={false} style={[
                          styles.filterButtonText,
                          isSelected && styles.filterButtonTextActive
                        ]}>
                          {filter.label} ({displayCount})
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* Search Bar */}
            {/* REPLACE Search Bar with this: search-as-you-type + filter + sort buttons */}
            <Animated.View
              style={[
                styles.searchContainer,
                {
                  opacity: searchBarAnim,
                  transform: [{
                    translateY: searchBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#8B7AA3" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search here"
                  placeholderTextColor="#8B7AA3"
                  value={searchText}
                  onChangeText={handleSearch}           // <-- calls API as user types
                  allowFontScaling={false}
                />
              </View>

              <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                <TouchableOpacity
                  style={styles.filterIconButton}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Ionicons name="filter" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterIconButton, { marginLeft: 10 }]}
                  onPress={() => setSortModalVisible(true)}
                >
                  <Ionicons name="swap-vertical" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>


            {/* Loading / Error */}
            {loading && (
              <View style={{ marginTop: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" />
              </View>
            )}

            {error && (
              <View style={{ marginTop: 20, alignItems: 'center' }}>
                <Text allowFontScaling={false} style={{ color: 'white' }}>{error}</Text>
              </View>
            )}

            {/* Training Session Cards */}
            <View style={styles.cardsContainer}>
              {(!loading && filteredSessions.length === 0) && (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#8B7AA3" />
                  <Text allowFontScaling={false} style={styles.emptyText}>No sessions found</Text>
                </View>
              )}

              {filteredSessions.map((session, index) => {
                // lightweight animation per card (we keep visual parity with original)
                const scale = 1;
                const opacity = 1;
                const translateY = 0;

                return (
                  <Animated.View
                    key={session.id + String(index)}
                    style={[
                      styles.sessionCard,
                      {
                        opacity,
                        transform: [{ scale }, { translateY }]
                      }
                    ]}
                  >
                    <LinearGradient colors={['#6B7FD7', '#7B68A6']} style={styles.cardHeader}>
                      <Text allowFontScaling={false} style={styles.cardHeaderText}>Training Name:</Text>
                      <Text allowFontScaling={false} style={styles.cardTitle}>{session.name}</Text>
                    </LinearGradient>

                    <View style={styles.cardBody}>
                      <View style={styles.cardRow}>
                        <Text allowFontScaling={false} style={styles.cardLabel}>Training Date:</Text>
                        <Text allowFontScaling={false} style={styles.cardValue}>{session.date}</Text>
                      </View>
                      <View style={styles.cardDivider} />

                      <View style={styles.cardRow}>
                        <Text allowFontScaling={false} style={styles.cardLabel}>Training Mode:</Text>
                        <Text allowFontScaling={false} style={styles.cardValue}>{session.mode}</Text>
                      </View>
                      <View style={styles.cardDivider} />

                      <View style={styles.cardRow}>
                        <Text allowFontScaling={false} style={styles.cardLabel}>Training Time:</Text>
                        <Text allowFontScaling={false} style={styles.cardValue}>{session.time}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.detailsButton}
                        onPress={() => handleShowDetails(session)}
                      >
                        <Text allowFontScaling={false} style={styles.detailsButtonText}>Show Details</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* Bottom Padding */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </View>
      {/* ADD: Filter Modal (same layout as CoursesScreen, but training fields) */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Filters</Text>

            <View style={styles.filterGrid}>

              {/* Type */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Type</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={[{ label: 'Online', value: 'Online' }, { label: 'Classroom', value: 'Classroom' }]}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={type}
                    onChange={(item) => setType(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* User Type */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>User Type</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={[{ label: 'user', value: 'user' }, { label: 'trainer', value: 'trainer' }]}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={userType}
                    onChange={(item) => setUserType(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={[
                      { label: 'All', value: 'all' },
                      { label: 'Participants Creation Pending', value: 'participants creation pending' },
                      { label: 'Batch Creation Pending', value: 'batch creation pending' },
                      { label: 'Published', value: 'published' },
                      { label: 'Pending', value: 'pending' }
                    ]}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={statusFilter}
                    onChange={(item) => setStatusFilter(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Course */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Course</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={coursesList.map(c => ({ label: c.name, value: String(c.id) }))}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={courseId}
                    onChange={(item) => setCourseId(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Trainer */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Trainer</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={trainersList.map(t => ({ label: t.name, value: String(t.id) }))}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={trainerId}
                    onChange={(item) => setTrainerId(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Created From */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Created Start Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCreatedFromPicker(true)}>
                  <Text allowFontScaling={false} style={{ color: createdFrom ? '#000' : '#888' }}>{createdFrom ? formatDate(createdFrom) : 'Select date'}</Text>
                </TouchableOpacity>
                {showCreatedFromPicker && (
                  <DateTimePicker
                    value={createdFrom || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    // onChange={(e, date) => {
                    //   setShowCreatedFromPicker(Platform.OS === 'ios');
                    //   if (date) setCreatedFrom(date);
                    // }}
                    onChange={(e, date) => {
                      setShowCreatedFromPicker(Platform.OS === 'ios');
                      if (date) {
                        setCreatedFrom(date);

                        // 🔒 validation: agar To date chhoti hai to clear
                        if (createdTo && new Date(createdTo) < new Date(date)) {
                          setCreatedTo(null);
                        }
                      }
                    }}

                  />
                )}
              </View>

              {/* Created To */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Created End Date</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCreatedToPicker(true)}>
                  <Text allowFontScaling={false} style={{ color: createdTo ? '#000' : '#888' }}>{createdTo ? formatDate(createdTo) : 'Select date'}</Text>
                </TouchableOpacity>
                {showCreatedToPicker && (
                  // <DateTimePicker
                  //   value={createdTo || new Date()}
                  //   mode="date"
                  //   display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  //   onChange={(e, date) => {
                  //     setShowCreatedToPicker(Platform.OS === 'ios');
                  //     if (date) setCreatedTo(date);
                  //   }}
                  // />

                  <DateTimePicker
                    value={createdTo || createdFrom || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={createdFrom || undefined} // 🔒 MAIN VALIDATION
                    onChange={(e, date) => {
                      setShowCreatedToPicker(Platform.OS === 'ios');
                      if (date && createdFrom && new Date(date) < new Date(createdFrom)) {
                        return; // ❌ block invalid selection
                      }
                      if (date) setCreatedTo(date);
                    }}
                  />

                )}
              </View>

              {/* Training Start */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Training Start</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTrainingStartPicker(true)}>
                  <Text allowFontScaling={false} style={{ color: trainingStart ? '#000' : '#888' }}>{trainingStart ? formatDate(trainingStart) : 'Select date'}</Text>
                </TouchableOpacity>
                {showTrainingStartPicker && (
                  <DateTimePicker
                    value={trainingStart || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    // onChange={(e, date) => {
                    //   setShowTrainingStartPicker(Platform.OS === 'ios');
                    //   if (date) setTrainingStart(date);
                    // }}

                    onChange={(e, date) => {
                      setShowTrainingStartPicker(Platform.OS === 'ios');
                      if (date) {
                        setTrainingStart(date);

                        // 🔒 validation: agar End date chhoti hai to clear
                        if (trainingEnd && new Date(trainingEnd) < new Date(date)) {
                          setTrainingEnd(null);
                        }
                      }
                    }}

                  />
                )}
              </View>

              {/* Training End */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Training End</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowTrainingEndPicker(true)}>
                  <Text allowFontScaling={false} style={{ color: trainingEnd ? '#000' : '#888' }}>{trainingEnd ? formatDate(trainingEnd) : 'Select date'}</Text>
                </TouchableOpacity>
                {showTrainingEndPicker && (
                  // <DateTimePicker
                  //   value={trainingEnd || new Date()}
                  //   mode="date"
                  //   display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  //   onChange={(e, date) => {
                  //     setShowTrainingEndPicker(Platform.OS === 'ios');
                  //     if (date) setTrainingEnd(date);
                  //   }}
                  // />

                  <DateTimePicker
                    value={trainingEnd || trainingStart || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={trainingStart || undefined} // 🔒 MAIN VALIDATION
                    onChange={(e, date) => {
                      setShowTrainingEndPicker(Platform.OS === 'ios');
                      if (date && trainingStart && new Date(date) < new Date(trainingStart)) {
                        return; // ❌ invalid
                      }
                      if (date) setTrainingEnd(date);
                    }}
                  />

                )}
              </View>

            </View>

            <View style={styles.filterButtonsRow}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text allowFontScaling={false} style={{ color: '#7B68EE', fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '600' }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ADD: Sort Modal (5 options including TrainingDate) */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sortModal}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Sort By</Text>

            <TouchableOpacity style={styles.sortOption} onPress={() => applySort('CreatedDate')}>
              <View style={styles.sortBullet} />
              <Text allowFontScaling={false} style={styles.sortText}>Created Date</Text>
              {sortBy === 'CreatedDate' && <Ionicons name="checkmark" size={18} color="#7B68EE" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => applySort('PublishedDate')}>
              <View style={styles.sortBullet} />
              <Text allowFontScaling={false} style={styles.sortText}>Published Date</Text>
              {sortBy === 'PublishedDate' && <Ionicons name="checkmark" size={18} color="#7B68EE" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => applySort('NameAsc')}>
              <View style={styles.sortBullet} />
              <Text allowFontScaling={false} style={styles.sortText}>Name Ascending</Text>
              {sortBy === 'NameAsc' && <Ionicons name="checkmark" size={18} color="#7B68EE" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => applySort('NameDesc')}>
              <View style={styles.sortBullet} />
              <Text allowFontScaling={false} style={styles.sortText}>Name Descending</Text>
              {sortBy === 'NameDesc' && <Ionicons name="checkmark" size={18} color="#7B68EE" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => applySort('TrainingDate')}>
              <View style={styles.sortBullet} />
              <Text allowFontScaling={false} style={styles.sortText}>Training Date</Text>
              {sortBy === 'TrainingDate' && <Ionicons name="checkmark" size={18} color="#7B68EE" />}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity style={styles.resetButton} onPress={resetSort}>
                <Text allowFontScaling={false} style={{ color: '#7B68EE', fontWeight: '600' }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setSortModalVisible(false)}>
                <Text allowFontScaling={false} style={{ color: '#fff', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
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
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainContent: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2D1B69',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  filterButtonText: {
    color: '#B8A7C7',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#1a1a2e',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FF',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D2D2D',
  },
  filterIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6B7FD7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  cardsContainer: {
    gap: 15,
  },
  sessionCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardHeader: {
    padding: 15,
  },
  cardHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: 15,
    backgroundColor: '#fff',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 4,
  },
  detailsButton: {
    marginTop: 15,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  detailsButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B7AA3',
    marginTop: 16,
  },
  // ADD these style keys to your styles object (merge)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,20,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterModal: {
    width: '92%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    maxHeight: '90%'
  },
  sortModal: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'stretch'
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 10 },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  filterCell: {
    width: '48%',
    marginBottom: 10
  },
  filterLabel: { fontSize: 12, color: '#444', marginBottom: 2 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    position: 'relative',
    overflow: 'visible',
    //paddingRight: 8,
    backgroundColor: '#fff'
  },
  dropdown: {
    height: 40,
    width: '100%',
    backgroundColor: '#fff'
  },
  dropdownText: {
    color: '#000',
    fontSize: 12
  },
  dateInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#fff'
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7B68EE',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  applyButton: {
    backgroundColor: '#7B68EE',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff'
  },
  sortText: { fontSize: 14, color: '#222' },
  sortBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7B68EE',
    marginRight: 12,
  },

});

export default TrainingSessionScreen;