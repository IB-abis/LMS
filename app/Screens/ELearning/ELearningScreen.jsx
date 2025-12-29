import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
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
// ✅ Import the universal drawer components
import { useNotification } from '@/app/Components/NotificationContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useDrawer } from '../../Components/useDrawer';
const { width } = Dimensions.get('window');

const ELearningScreen = ({ navigation }) => {
  const { openNotification } = useNotification();
  const [selectedTab, setSelectedTab] = useState('Dashboard');
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL | PENDING | COMPLETED
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [expiredCourse, setExpiredCourse] = useState(null);

  // New states for filtering, modal, createdBy list and date pickers
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [criteria, setCriteria] = useState(''); // "percentage" | "quiz" | ''
  const [createdByList, setCreatedByList] = useState([]); // fetched trainers for CreatedBy dropdown
  const [selectedCreatedBy, setSelectedCreatedBy] = useState(null); // trainer id
  const [startDate, setStartDate] = useState(''); // yyyy-mm-dd
  const [endDate, setEndDate] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(200);
  const [page, setPage] = useState(1);

  // Datepicker visibility (using @react-native-community/datetimepicker)
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);




  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Dashboard'); // 👈 change this if needed
        return true; // prevent default behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      // ✅ cleanup using .remove()
      return () => subscription.remove();
    }, [navigation])
  );

  // ✅ Use the drawer hook - E-Learning is at index 5
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(5);

  // Animation values for PAGE CONTENT only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const filterAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const tableHeaderAnim = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef([...Array(50)].map(() => new Animated.Value(0))).current; // enough for many rows
  const tabScaleAnims = useRef([...Array(3)].map(() => new Animated.Value(1))).current;
  const rotateAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const filters = [
    { label: 'ALL', icon: 'apps' },
    { label: 'PENDING', icon: 'file-tray-full' },
    { label: 'COMPLETED', icon: 'checkmark-done-circle' },
  ];

  // ---------- fetch & data helpers ----------
  const apiBase = 'https://lms-api.abisaio.com/api/v1/ELearning/course/list';

  // Helper: format JS Date or ISO string to YYYY-MM-DD
  const formatDate = (d) => {
    if (!d) return '';
    // accept Date object or ISO string
    const dateObj = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return '';
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: format JS Date or ISO string to DD-MM-YYYY
  const formatToDDMMYYYY = (d) => {
    if (!d) return '-';
    const dateObj = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Updated buildUrl to include FromDate, ToDate, CreatedBy and Criteria
  const buildUrl = ({ userId, page = 1, rowsPerPage = 200, tabStatus = '', search = '', fromDate = '', toDate = '', createdBy = '0', criteriaParam = '' } = {}) => {
    const params = new URLSearchParams();
    params.append('UserID', String(userId));
    params.append('Page', String(page));
    params.append('FromDate', fromDate || '');
    params.append('ToDate', toDate || '');
    params.append('Search', search || '');
    params.append('CreatedBy', String(createdBy || '0'));
    params.append('RowsPerPage', String(rowsPerPage));
    if (tabStatus) params.append('TabStatus', tabStatus);
    if (criteriaParam) params.append('Criteria', criteriaParam);
    return `${apiBase}?${params.toString()}`;
  };

  // Fetch trainers (CreatedBy dropdown list)
  const fetchCreatedByList = async () => {
    try {
      const url = 'https://lms-api.abisaio.com/api/v1/TrainingSession/GetTrainer';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.warn('fetchCreatedByList non-ok', resp.status);
        return setCreatedByList([]);
      }
      const json = await resp.json();
      const trainers = Array.isArray(json?.data) ? json.data : [];
      const mapped = trainers.map(t => ({ label: t.name, value: t.id }));
      setCreatedByList(mapped);
    } catch (err) {
      console.warn('fetchCreatedByList error', err);
      setCreatedByList([]);
    }
  };

  // Apply filters — builds query and refreshes list
  const applyFilters = async () => {
    // convert values
    const from = formatDate(startDate);
    const to = formatDate(endDate);
    const createdByParam = selectedCreatedBy ?? 0;
    const criteriaParam = criteria || '';

    setFilterModalVisible(false);
    setPage(1); // reset pagination to page 1
    // Fetch with the filters applied. selectedFilter already used for tab.
    await fetchCoursesFromApi({
      tab: selectedFilter,
      search: searchText,
      page: 1,
      rowsPerPage,
      fromDate: from,
      toDate: to,
      createdBy: createdByParam,
      criteria: criteriaParam,
    });
  };

  // Reset filters to defaults and reload original non-filtered list
  const resetFilters = async () => {

    setSelectedCreatedBy(null);
    setCriteria('');
    setStartDate('');
    setEndDate('');
    setSearchText('');
    setSelectedFilter('ALL');
    setRowsPerPage(200);
    setPage(1);
    setFilterModalVisible(false);
    // restore animations values used elsewhere (reset to 0 then re-run entry animations)
    // Reset rowAnims values to 0 so that useEffect animates them again when data arrives
    rowAnims.forEach(a => a.setValue(0));

    // reload unfiltered list from API
    await fetchCoursesFromApi({ tab: 'ALL', search: '', page: 1, rowsPerPage: 200, fromDate: '', toDate: '', createdBy: '0', criteria: '' });
  };


  // Map API response item to row format used by your UI
  const mapApiItemToRow = (item, index) => {
    const status = (item.status || item.userStatus || (item.completed ? 'Completed' : 'Pending')).toString().toUpperCase();

    return {
      id: item.id ?? index,
      sNo: index + 1,
      name: item.name ?? item.contentName ?? 'Untitled',
      contentName: (item.content?.contentName || item.contentName) ?? '',
      raw: item,
      status, // ✅ ALWAYS UPPERCASE (so EXPIRED matches your check)
      canView: item.viewAction === true
    };
  };

  // Core fetcher
  // Updated fetcher to accept filters and use new params
  const fetchCoursesFromApi = async ({
    tab = 'ALL',
    search = '',
    page = 1,
    rowsPerPage: rpc = rowsPerPage,
    fromDate = '',
    toDate = '',
    createdBy = '0',
    criteria: criteriaParam = '',
  } = {}) => {
    if (!employeeID) return [];
    try {
      setLoading(true);
      setError(null);

      const tabStatus = tab === 'ALL' ? '' : tab.toLowerCase(); // pending | completed
      const url = buildUrl({
        userId: employeeID,
        page,
        rowsPerPage: rpc,
        tabStatus,
        search,
        fromDate,
        toDate,
        createdBy,
        criteriaParam,
      });
      console.log("📡 API URL Called:", url);


      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server responded ${resp.status}: ${text}`);
      }
      const json = await resp.json();
      if (!json || (json.succeeded === false && !json.data)) {
        throw new Error(json.message || 'Failed to fetch data');
      }

      const dataArray = Array.isArray(json.data) ? json.data : [];
      setPages(json.pages ?? 1);
      setCount(json.count ?? dataArray.length);

      // map results
      const mapped = dataArray.map((it, idx) => mapApiItemToRow(it, idx));
      setFilteredCourses(mapped);

      // set pagination state
      setPage(page);
      setRowsPerPage(rpc);

      // animate rows again (reset rowAnims then animate)
      rowAnims.forEach((anim, index) => {
        anim.setValue(0);
        if (index < mapped.length) {
          setTimeout(() => {
            Animated.spring(anim, {
              toValue: 1,
              tension: 40,
              friction: 7,
              useNativeDriver: true,
            }).start();
          }, 200 + index * 60);
        }
      });

      return mapped;
    } catch (err) {
      console.warn('fetchCoursesFromApi error:', err);
      setError(err.message ?? String(err));
      setFilteredCourses([]); // clear on error
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Load employeeID & token from AsyncStorage then fetch
  // Load employeeID & token from AsyncStorage then fetch
  const initializeAndFetch = async (initialFilter = selectedFilter, initialSearch = '') => {
    try {
      setLoading(true);
      const keys = ['employeeID', 'token'];
      const stores = await AsyncStorage.multiGet(keys);
      const storeObj = {};
      stores.forEach(([k, v]) => (storeObj[k] = v));
      if (!storeObj.employeeID) {
        setError('employeeID not found in AsyncStorage');
        setLoading(false);
        return;
      }
      setEmployeeID(storeObj.employeeID);
      setToken(storeObj.token ?? null);

      // fetch trainers for CreatedBy dropdown (if token required it will use token state)
      await fetchCreatedByList();

     
      await fetchCoursesFromApi({ tab: initialFilter, search: initialSearch, page: 1, rowsPerPage });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };


  const fetchCounts = async () => {
    if (!employeeID) return;

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // PENDING
      const pendingUrl = buildUrl({ userId: employeeID, tabStatus: 'pending' });
      const pendingRes = await fetch(pendingUrl, { headers });
      const pendingJson = await pendingRes.json();
      const pendingCountFromApi = pendingJson?.count ?? 0;

      // COMPLETED
      const completedUrl = buildUrl({ userId: employeeID, tabStatus: 'completed' });
      const completedRes = await fetch(completedUrl, { headers });
      const completedJson = await completedRes.json();
      const completedCountFromApi = completedJson?.count ?? 0;

      setPendingCount(pendingCountFromApi);
      setCompletedCount(completedCountFromApi);

    } catch (err) {
      console.log("count fetch error:", err);
    }
  };
  useEffect(() => {
  if (employeeID) {
    fetchCounts();
  }
}, [employeeID]);



  // initial run on mount
  useEffect(() => {
    initializeAndFetch();
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

    // Search bar animation
    setTimeout(() => {
      Animated.spring(searchBarAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Filter buttons animation
    filterAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 400 + index * 100);
    });

    // Table header animation
    setTimeout(() => {
      Animated.spring(tableHeaderAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Staggered row animations will be triggered after data arrives (see below)
    // Continuous pulse animation
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When filteredCourses changes, animate rows
  useEffect(() => {
    rowAnims.forEach((anim, index) => {
      if (index < filteredCourses.length) {
        setTimeout(() => {
          Animated.spring(anim, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }).start();
        }, 200 + index * 60);
      } else {
        anim.setValue(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses]);

  // Debounced search: when searchText changes, re-run fetch using Search param (server side)
  useEffect(() => {
    const timer = setTimeout(() => {
      // If employeeID already loaded, call API with search param; else initialize will pick it up
      if (employeeID) {
        fetchCoursesFromApi({ tab: selectedFilter, search: searchText });
      } else {
        initializeAndFetch(selectedFilter, searchText);
      }
    }, 350); // small debounce
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // When selectedFilter changes, fetch appropriate tab
  useEffect(() => {
    if (!employeeID) return;
    fetchCoursesFromApi({ tab: selectedFilter, search: searchText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, employeeID]);

  // Enhanced pull-to-refresh: reset filters and reload original non-filtered list from API
  const onRefresh = async () => {
    setRefreshing(true);

    // Reset UI filters & search box to defaults
    setSearchText('');
    setSelectedFilter('ALL');
    setSelectedCreatedBy(null);
    setCriteria('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setRowsPerPage(200);

    // restore animations
    rowAnims.forEach(a => a.setValue(0));
    tableHeaderAnim.setValue(0);
    searchBarAnim.setValue(0);
    filterAnims.forEach(a => a.setValue(0));
    // re-run entry animations (similar to initial effect)
    setTimeout(() => {
      Animated.spring(searchBarAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
      filterAnims.forEach((anim, index) => {
        setTimeout(() => {
          Animated.spring(anim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
        }, 200 + index * 80);
      });
      setTimeout(() => {
        Animated.spring(tableHeaderAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
      }, 400);
    }, 50);

    // Fetch original unfiltered list
    await fetchCoursesFromApi({ tab: 'ALL', search: '', page: 1, rowsPerPage: 200, fromDate: '', toDate: '', createdBy: '0', criteria: '' });

    setRefreshing(false);
  };


  // Handle search input change
  const handleSearch = (text) => {
    setSearchText(text);
    // local filtering is not necessary because we query server with Search param,
    // but to provide immediate feedback we can also locally filter current list.
    if (text.trim() === '') {
      // do nothing; effect will fetch full list
      return;
    }
    // Local quick filter fallback
    const localFiltered = filteredCourses.filter(course =>
      course.name.toLowerCase().includes(text.toLowerCase()) ||
      course.contentName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredCourses(localFiltered);
  };

  // Apply filter (tab button press)
  const applyFilter = (filterLabel) => {
    setSelectedFilter(filterLabel);
    // fetchCoursesFromApi will run due to useEffect on selectedFilter
  };

  // Handle filter press with animation
  const handleFilterPress = (filterLabel, index) => {
    setSelectedFilter(filterLabel);

    Animated.sequence([
      Animated.spring(filterAnims[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(filterAnims[index], {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // applyFilter(filterLabel) <-- already done above by setSelectedFilter
  };

  // Row press animation and navigation
  const handleRowPress = (index, course) => {
    Animated.sequence([
      Animated.spring(rowAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(rowAnims[index], {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();


  };


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

  // Render icon helper
  const renderIcon = (item, isSelected, iconSize = 22) => {
    const iconColor = isSelected ? '#fff' : '#8B7AA3';

    switch (item.type) {
      case 'MaterialIcons':
        return <MaterialIcons name={item.icon} size={iconSize} color={iconColor} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={item.icon} size={iconSize} color={iconColor} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon} size={iconSize} color={iconColor} />;
      default:
        return <Ionicons name={item.icon} size={iconSize} color={iconColor} />;
    }
  };




  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.mainContent}>
        {/* Header */}
        <Header title="E-learning Courses" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />

        {/* Main Content */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.scrollContainer}>
            {/* Search Bar and Filter */}
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
                  placeholder="Search here.."
                  placeholderTextColor="#8B7AA3"
                  value={searchText}
                  onChangeText={handleSearch}
                />
              </View>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  // open the filter modal
                  setFilterModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={['#7B68EE', '#9D7FEA']}
                  style={styles.filterGradient}
                >
                  <Ionicons name="options" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsContainer}>
              {filters.map((filter, index) => {
                const isSelected = selectedFilter === filter.label;
                const scale = filterAnims[index];

                return (
                  <Animated.View
                    key={filter.label}
                    style={[
                      { transform: [{ scale }] }
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleFilterPress(filter.label, index)}
                      activeOpacity={0.8}
                      style={styles.filterTab}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={['#7B68EE', '#9D7FEA']}
                          style={styles.filterTabGradient}
                        >
                          <Ionicons name={filter.icon} size={18} color="#fff" />
                          <Text allowFontScaling={false}   numberOfLines={1} style={styles.filterTabTextActive}>
                            {filter.label === 'PENDING' ? `PENDING [${pendingCount}]` :
                              filter.label === 'COMPLETED' ? `COMPLETED [${completedCount}]` :
                                'ALL'}
                          </Text>

                        </LinearGradient>
                      ) : (
                        <View style={styles.filterTabInactive}>
                          <Ionicons name={filter.icon} size={18} color="#7B68EE" />
                          <Text allowFontScaling={false}   numberOfLines={1} style={styles.filterTabText}>
                            {filter.label === 'PENDING' ? `PENDING [${pendingCount}]` :
                              filter.label === 'COMPLETED' ? `COMPLETED [${completedCount}]` :
                                'ALL'}
                          </Text>

                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Table */}
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <Animated.View
                style={[
                  styles.tableHeader,
                  {
                    opacity: tableHeaderAnim,
                    transform: [{
                      translateY: tableHeaderAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#7B68EE', '#9D7FEA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tableHeaderGradient}
                >
                  <Text allowFontScaling={false} style={[styles.headerCell, styles.sNoColumn]}>SNo.</Text>
                  <Text allowFontScaling={false} style={[styles.headerCell, styles.nameColumn]}>Name</Text>
                  <Text allowFontScaling={false} style={[styles.headerCell, styles.contentColumn]}>End Date</Text>
                  <Text allowFontScaling={false} style={[styles.headerCell, styles.actionColumn]}>Action</Text>
                </LinearGradient>
              </Animated.View>

              {/* Loading indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#7B68EE" />
                </View>
              )}

              {/* Error */}
              {error && !loading && (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle-outline" size={48} color="#8B7AA3" />
                  <Text allowFontScaling={false} style={styles.emptyText}>Error: {error}</Text>
                </View>
              )}

              {/* Table Rows */}
              {!loading && !error && filteredCourses.map((course, index) => {
                const scale = rowAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                });
                const opacity = rowAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                });
                const translateX = rowAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                });

                return (
                  <Animated.View
                    key={course.id}
                    style={[
                      styles.tableRow,
                      {
                        opacity,
                        transform: [{ scale }, { translateX }]
                      }
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleRowPress(index, course)}
                      activeOpacity={0.8}
                      style={styles.rowContent}
                    >

                      <Text allowFontScaling={false} style={[styles.rowCell, styles.sNoColumn, styles.sNoText]}>
                        {course.sNo}.
                      </Text>
                      <Text allowFontScaling={false} style={[styles.rowCell, styles.nameColumn, styles.nameText]}>
                        {course.name}
                      </Text>
                      <Text allowFontScaling={false} style={[styles.rowCell, styles.contentColumn, styles.contentText]}>
                        {formatToDDMMYYYY(course.raw?.endDate)}
                      </Text>
                      <View style={[styles.actionColumn, { alignItems: 'center' }]}>
                        {course.status === 'EXPIRED' ? (
                          <TouchableOpacity onPress={() => setExpiredCourse(course)}>
                            <Text allowFontScaling={false} style={{ color: '#FF7070', fontWeight: '600' }}>Expired</Text>
                          </TouchableOpacity>
                        ) : course.canView && (

                          <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={async () => {
                              const courseId = course.raw.id;
                              navigation.navigate('CourseDetails', {
                                courseId,
                                employeeID: employeeID,
                              });
                            }}
                          >
                            <LinearGradient
                              colors={['#7B68EE', '#9D7FEA']}
                              style={styles.eyeGradient}
                            >
                              <Ionicons name="eye" size={18} color="#fff" />
                            </LinearGradient>
                          </TouchableOpacity>
                        )}

                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}

              {!loading && !error && filteredCourses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#8B7AA3" />
                  <Text allowFontScaling={false} style={styles.emptyText}>No courses found</Text>
                </View>
              )}
            </View>

            {/* Bottom Padding */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </View>

      {expiredCourse && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <LinearGradient
            colors={['#7B68EE', '#1a1a2e']}
            style={{
              width: '100%',
              borderRadius: 18,
              padding: 20
            }}
          >
            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              Course Expired
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>Course: </Text>{expiredCourse.raw?.courseName ?? expiredCourse.name}
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>Content: </Text>{expiredCourse.raw?.contentName ?? expiredCourse.contentName}
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>Start Date: </Text>
              {expiredCourse.raw?.startDate?.split('T')[0] ?? '-'}
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>End Date: </Text>
              {expiredCourse.raw?.endDate?.split('T')[0] ?? '-'}
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 6 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>Program: </Text>
              {expiredCourse.raw?.programName ?? '-'}
            </Text>

            <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 15, marginBottom: 20 }}>
              <Text allowFontScaling={false} style={{ fontWeight: '700' }}>Created By: </Text>
              {expiredCourse.raw?.createdByName ?? '-'}
            </Text>

            <TouchableOpacity
              onPress={() => setExpiredCourse(null)}
              style={{
                backgroundColor: '#fff',
                paddingVertical: 10,
                borderRadius: 10
              }}
            >
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#1a1a2e', fontWeight: '600' }}>
                Close
              </Text>
            </TouchableOpacity>

          </LinearGradient>
        </View>
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Filters</Text>

            {/* SAME 2×5 GRID LIKE COURSE SCREEN */}
            <View style={styles.filterGrid}>

              {/* Completion Criteria */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Completion Criteria</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={[
                      { label: "Completion Percentage", value: "percentage" },
                      { label: "Quiz", value: "quiz" },
                    ]}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Criteria"
                    value={criteria}
                    onChange={(item) => setCriteria(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Created By */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Created By</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={createdByList}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Trainer"
                    value={selectedCreatedBy}
                    onChange={(item) => setSelectedCreatedBy(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Start Date */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text allowFontScaling={false} style={{ color: startDate ? "#000" : "#888" }}>
                    {startDate || "Select Start Date"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Date */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text allowFontScaling={false} style={{ color: endDate ? "#000" : "#888" }}>
                    {endDate || "Select End Date"}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* BUTTONS ROW EXACT SAME */}
            <View style={styles.filterButtonsRow}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text allowFontScaling={false} style={{ color: "#7B68EE", fontWeight: "600" }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text allowFontScaling={false} style={{ color: "#fff", fontWeight: "600" }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* DATE PICKERS */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, selected) => {
            setShowStartPicker(Platform.OS === "ios");
            if (selected) setStartDate(formatDate(selected));
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, selected) => {
            setShowEndPicker(Platform.OS === "ios");
            if (selected) setEndDate(formatDate(selected));
          }}
        />
      )}





         {/* Bottom nav and drawer - unchanged */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    gap: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D2D2D',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
  },
  filterGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
filterTabsContainer: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 20,
  justifyContent: 'center',  // Add this to center the buttons
},
filterTab: {
  borderRadius: 12,
  overflow: 'hidden',
  // Remove flex: 1 if present here
},
filterTabGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 12,
  paddingHorizontal: 16,
  minHeight: 44,  // Add consistent minimum height
},
filterTabInactive: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: 'rgba(123, 104, 238, 0.1)',
  borderWidth: 1,
  borderColor: 'rgba(123, 104, 238, 0.3)',
  borderRadius: 12,
  minHeight: 44,  // Add consistent minimum height
},
filterTabTextActive: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '600',
  numberOfLines: 1,  // This won't work in stylesheet, see below
},
filterTabText: {
  color: '#7B68EE',
  fontSize: 13,
  fontWeight: '600',
  numberOfLines: 1,  // This won't work in stylesheet, see below
},

  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tableHeader: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  tableHeaderGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  headerCell: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sNoColumn: {
    width: 50,
  },
  nameColumn: {
    flex: 1.2,
    textAlign: 'left',
  },
  contentColumn: {
    flex: 1,
    textAlign: 'left',
  },
  actionColumn: {
    width: 60,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowContent: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rowCell: {
    fontSize: 13,
    color: '#2D2D2D',
  },
  sNoText: {
    fontWeight: '600',
    color: '#666',
  },
  nameText: {
    color: '#7B68EE',
    fontWeight: '600',
  },
  contentText: {
    color: '#666',
    fontWeight: '500',
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
  },
  eyeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNavBar: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerTab: {
    marginTop: -20,
  },
  tabIconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  centerTabBg: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 5,
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10
  },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  filterCell: {
    width: '48%',
    marginBottom: 12
  },
  filterLabel: {
    fontSize: 12,
    color: '#444',
    marginBottom: 6
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    position: 'relative',
    overflow: 'visible',
    paddingRight: 36,
    backgroundColor: '#fff'
  },
  dropdown: {
    height: 36,
    width: '100%',
    backgroundColor: '#fff'
  },
  dropdownText: {
    color: '#000'
  },

  dateInput: {
    height: 36,
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

});

export default ELearningScreen;
