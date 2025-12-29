// Screens/ELearning/CoursesScreen.js
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";
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
// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';

// External small libs (ensure installed)
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';

const { width } = Dimensions.get('window');

// Dropdown data for filter fields
const CATEGORY_DATA = [
 
  { label: 'Functional', value: 'Functional' },
  { label: 'Behavioural', value: 'Behavioural' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Mandatory', value: 'Mandatory' },
];

const LEVEL_DATA = [
 
  { label: 'Beginner', value: 'Beginner' },
  { label: 'Intermediate', value: 'Intermediate' },
  { label: 'Advanced', value: 'Advanced' },
  { label: 'Expert', value: 'Expert' },
];

const STATUS_DATA = [
  { label: 'All', value: 'All' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Published', value: 'Published' },
];

const GLOBAL_CATEGORY_DATA = [
  { label: 'All', value: 'All' },
  { label: 'Corporate Essentials', value: 'Corporate Essentials' },
  { label: 'Empowerment Center', value: 'Empowerment Center' },
];

const CoursesScreen = ({ navigation }) => {
  const { openNotification } = useNotification();

  // ✅ Use the drawer hook - Courses is at index 2
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(2);

  // ✅ Use the bottom nav hook
  const {
    selectedTab,
    tabScaleAnims,
    rotateAnims,
    handleTabPress
  } = useBottomNav('Dashboard');

  // Animation values for PAGE CONTENT only
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Data state
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state: search, filter, sort
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Filter fields
  const [category, setCategory] = useState(''); // Functional, Behavioural, Technical, Mandatory
  const [level, setLevel] = useState(''); // beginner intermediate advanced expert
  const [status, setStatus] = useState('All'); // All Draft Published etc
  const [globalCategory, setGlobalCategory] = useState(''); // Corporate Essentials, Empowerment Center
  const [programs, setPrograms] = useState([]); // list from API
  const [programId, setProgramId] = useState('');
  const [createdByList, setCreatedByList] = useState([]);
  const [createdById, setCreatedById] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Date picker state
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState('');

  // Pagination / rows per page
  const [rowsPerPage] = useState(200); // maintain prior behaviour

  // Refresh control
  const [refreshing, setRefreshing] = useState(false);

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

  // Helper: format date to YYYY-MM-DD (API expects that)
  const formatDate = (d) => {
    if (!d) return '';
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch programs list and createdBy list on mount
  useEffect(() => {
    const fetchAuxLists = async () => {
      try {
        // programs
        const pResp = await fetch('https://lms-api.abisaio.com/api/v1/Program/GetProgramList');
        const pJson = await pResp.json();
        if (pJson.succeeded && Array.isArray(pJson.data)) {
          setPrograms(pJson.data);
        } else {
          console.warn('Failed to fetch programs list', pJson);
        }

        // createdBy list
        const cbResp = await fetch('https://lms-api.abisaio.com/api/v1/Course/GetCourseCreatedByList');
        const cbJson = await cbResp.json();
        if (cbJson.succeeded && Array.isArray(cbJson.data)) {
          setCreatedByList(cbJson.data);
        } else {
          console.warn('Failed to fetch createdBy list', cbJson);
        }
      } catch (err) {
        console.error('Aux lists fetch error', err);
      }
    };

    fetchAuxLists();
  }, []);

  // Main fetch function that respects search, filters, sort
  // Accept `opts` to allow immediate overrides (so callers don't rely on setState timing)
  const fetchCourses = async (opts = {}) => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('employeeID') || '';

      const page = 1;
      const rpp = opts.rowsPerPage !== undefined ? opts.rowsPerPage : rowsPerPage;

      // Use overrides from opts first, otherwise fall back to state
      const effectiveStatus = opts.status !== undefined ? opts.status : (status || 'All');
      const effectiveCategory = opts.category !== undefined ? opts.category : (category || '');
      const effectiveLevel = opts.level !== undefined ? opts.level : (level || '');
      const effectiveSort = opts.sort !== undefined ? opts.sort : (sortBy || '');
      const effectiveSearch = opts.search !== undefined ? opts.search : (searchText || '');
      const effectiveFromDate = opts.fromDate !== undefined ? opts.fromDate : (fromDate ? formatDate(fromDate) : '');
      const effectiveToDate = opts.toDate !== undefined ? opts.toDate : (toDate ? formatDate(toDate) : '');
      const effectiveGlobalCategory = opts.globalCategory !== undefined ? opts.globalCategory : (globalCategory || '');
      const effectiveProgramId = opts.programId !== undefined ? opts.programId : (programId ? String(programId) : '');
      const effectiveCreatedBy = opts.createdBy !== undefined ? opts.createdBy : (createdById ? String(createdById) : '');
      const effectiveUserId = opts.userId !== undefined ? opts.userId : storedUserId;

      // Build query params according to user's requested format
      const params = new URLSearchParams();
      params.append('Status', effectiveStatus);
      params.append('Page', page.toString());
      params.append('RowsPerPage', String(rpp));
      params.append('Category', effectiveCategory);
      params.append('Level', effectiveLevel);
      params.append('Sort', effectiveSort);
      params.append('Search', effectiveSearch);
      params.append('FromDate', effectiveFromDate);
      params.append('ToDate', effectiveToDate);
      params.append('UserID', effectiveUserId);
      params.append('GlobalCategory', effectiveGlobalCategory);
      params.append('ProgramID', effectiveProgramId);
      params.append('CreatedBy', effectiveCreatedBy);

      const url = `https://lms-api.abisaio.com/api/v1/Course/GetCourse?${params.toString()}`;

      // Log every API call for debugging (filters/sort/search)
      // eslint-disable-next-line no-console
      console.log('[Courses] Fetching:', url);

      const response = await fetch(url);
      const json = await response.json();

      if (json.succeeded && Array.isArray(json.data)) {
        // if count > rpp, do the previous approach of increasing rowsPerPage
        if (json.count > rpp) {
          const biggerRpp = json.count + 10;
          const biggerParams = new URLSearchParams(params.toString());
          biggerParams.set('RowsPerPage', String(biggerRpp));
          const biggerUrl = `https://lms-api.abisaio.com/api/v1/Course/GetCourse?${biggerParams.toString()}`;
          const newResponse = await fetch(biggerUrl);
          const newJson = await newResponse.json();
          if (newJson.succeeded && Array.isArray(newJson.data)) {
            setCourses(newJson.data);
          } else {
            console.warn('Invalid data after resizing rowsPerPage', newJson);
            setCourses(json.data);
          }
        } else {
          setCourses(json.data);
        }
      } else {
        console.warn('Invalid data format', json);
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch (use the provided initial API defaults with UserID=45460)
  useEffect(() => {
  const loadData = async () => {
    const storedUserId = (await AsyncStorage.getItem('employeeID')) || '';

    fetchCourses({
      status: 'All',
      rowsPerPage: 200,
      category: '',
      level: '',
      sort: '',
      search: '',
      fromDate: '',
      toDate: '',
      userId: storedUserId,
      globalCategory: '',
      programId: '',
      createdBy: ''
    });
  };

  loadData();
}, []);

  // Animated entrances
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

  // Apply sort (closes modal and fetches) - use override so fetch uses new sort immediately
  const applySort = (option) => {
    setSortBy(option);
    setSortModalVisible(false);
    fetchCourses({ sort: option });
  };

  // Reset sort to default and fetch immediately
  const resetSort = () => {
    setSortBy('');
    setSortModalVisible(false);
    fetchCourses({ sort: '' });
  };

  // Apply filters (closes modal and fetches) - pass current filter values as overrides
  const applyFilters = () => {
    setFilterModalVisible(false);
    fetchCourses({
      search: searchText,
      category: category,
      level: level,
      status: status,
      globalCategory: globalCategory,
      programId: programId,
      createdBy: createdById,
      fromDate: fromDate ? formatDate(fromDate) : '',
      toDate: toDate ? formatDate(toDate) : '',
      sort: sortBy
    });
  };

  // Reset filters to defaults and fetch (use overrides so action is immediate)
  const resetFilters = () => {
    setCategory('');
    setLevel('');
    setStatus('All');
    setGlobalCategory('');
    setProgramId('');
    setCreatedById('');
    setFromDate(null);
    setToDate(null);
    setFilterModalVisible(false);
    // Keep search as-is per existing behavior; fetch with explicit filter clears
    fetchCourses({
      category: '',
      level: '',
      status: 'All',
      globalCategory: '',
      programId: '',
      createdBy: '',
      fromDate: '',
      toDate: ''
    });
  };

  // When search is submitted (press search icon) we call API
  const onSearchSubmit = () => {
    fetchCourses({ search: searchText });
  };

  // Dynamic search: call API on every change (immediate override)
  const handleSearchChange = (text) => {
    setSearchText(text);
    fetchCourses({ search: text });
  };

  // Pull-to-refresh: clears filters/sort and reloads (like 'scroll up past threshold resets filters')
  const onRefresh = async () => {
    setRefreshing(true);
    // Reset filters and sort - use overrides so fetch doesn't rely on setState timing
    setSearchText('');
    setCategory('');
    setLevel('');
    setStatus('All');
    setGlobalCategory('');
    setProgramId('');
    setCreatedById('');
    setFromDate(null);
    setToDate(null);
    setSortBy('');
    await fetchCourses({
      search: '',
      category: '',
      level: '',
      status: 'All',
      globalCategory: '',
      programId: '',
      createdBy: '',
      sort: ''
    });
    setRefreshing(false);
  };

  // Render helpers for display values in the table
  const statusBadgeColor = (statusStr) => {
    if (!statusStr) return '#777';
    if (statusStr.toLowerCase() === 'published') return '#2E7D32';
    if (statusStr.toLowerCase() === 'draft') return '#F57C00';
    return '#607D8B';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>

        {/* ✅ Universal Header Component */}
        <Header title="Offline Courses" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B68EE']} />
          }
        >
          <View style={styles.scrollContainer}>

            {/* Search + Filter + Sort Row */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <TextInput
                  placeholder="Search courses..."
                  placeholderTextColor="#888"
                  value={searchText}
                  onChangeText={handleSearchChange}
                  onSubmitEditing={onSearchSubmit}
                  style={styles.searchInput}
                />
                <TouchableOpacity style={styles.searchIconWrap} onPress={onSearchSubmit}>
                  <Ionicons name="search" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Ionicons name="filter" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconButton, { marginLeft: 8 }]}
                  onPress={() => setSortModalVisible(true)}
                >
                  <Ionicons name="swap-vertical" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text allowFontScaling={false} style={[styles.headerCell, styles.sNoColumn]}>SNo.</Text>
                <Text allowFontScaling={false} style={[styles.headerCell, styles.courseNameColumn]}>Course Name</Text>
                <Text allowFontScaling={false} style={[styles.headerCell, styles.statusColumn]}>Status</Text>
                <Text allowFontScaling={false} style={[styles.headerCell, styles.actionColumn]}>Action</Text>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#7B68EE" />
                  <Text allowFontScaling={false} style={{ color: '#555', marginTop: 10 }}>Loading courses...</Text>
                </View>
              ) : courses.length === 0 ? (
                <Text allowFontScaling={false} style={{ color: '#333', textAlign: 'center', marginVertical: 20 }}>
                  No courses available.
                </Text>
              ) : (
                courses.map((course, index) => (
                  <View key={course.id} style={styles.tableRow}>
                    <Text allowFontScaling={false} style={[styles.rowCell, styles.sNoColumn, styles.sNoText]}>{index + 1}.</Text>
                    <Text allowFontScaling={false} style={[styles.rowCell, styles.courseNameColumn, styles.courseNameText]}>{course.name}</Text>
                    <View style={[styles.statusColumn, { alignItems: 'center' }]}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor(course.status) }]}>
                        <Text allowFontScaling={false} style={styles.statusText}>{course.status || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={[styles.actionColumn, { alignItems: 'center' }]}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('ActionviewScreen', { course })}
                      >
                        <Ionicons name="eye" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* Bottom nav and drawer - unchanged */}
      <BottomNavigation
        selectedTab={selectedTab}
        tabScaleAnims={tabScaleAnims}
        rotateAnims={rotateAnims}
        handleTabPress={handleTabPress}
        navigation={navigation}
      />

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

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text allowFontScaling={false} style={styles.modalTitle}>Filters</Text>

            {/* Grid: 2 columns x 5 rows (10 elements) */}
            <View style={styles.filterGrid}>

              {/* Category */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Category</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={CATEGORY_DATA}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={category}
                    onChange={(item) => setCategory(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Level */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Level</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={LEVEL_DATA}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={level}
                    onChange={(item) => setLevel(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={STATUS_DATA}
                    labelField="label"
                    valueField="value"
                    placeholder="All"
                    value={status}
                    onChange={(item) => setStatus(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Global Category */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Global Category</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={GLOBAL_CATEGORY_DATA}
                    labelField="label"
                    valueField="value"
                    placeholder="All"
                    value={globalCategory}
                    onChange={(item) => setGlobalCategory(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* Program */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Program</Text>
                <View style={styles.pickerWrap}>
                  <Dropdown
                    data={programs.map((p) => ({ label: p.name, value: String(p.id) }))}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={programId}
                    onChange={(item) => setProgramId(item.value)}
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
                    data={createdByList.map((c) => ({ label: c.name, value: String(c.id) }))}
                    labelField="label"
                    valueField="value"
                    placeholder=""
                    value={createdById}
                    onChange={(item) => setCreatedById(item.value)}
                    style={styles.dropdown}
                    selectedTextStyle={styles.dropdownText}
                  />
                </View>
              </View>

              {/* From Date */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowFromDatePicker(true)}
                >
                  <Text allowFontScaling={false} style={{ color: fromDate ? '#000' : '#888' }}>
                    {fromDate ? formatDate(fromDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showFromDatePicker && (
                  <DateTimePicker
                    value={fromDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, date) => {
                      setShowFromDatePicker(Platform.OS === 'ios');
                      if (date) setFromDate(date);
                    }}
                  />
                )}
              </View>

              {/* To Date */}
              <View style={styles.filterCell}>
                <Text allowFontScaling={false} style={styles.filterLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Text allowFontScaling={false} style={{ color: toDate ? '#000' : '#888' }}>
                    {toDate ? formatDate(toDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showToDatePicker && (
                  <DateTimePicker
                    value={toDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, date) => {
                      setShowToDatePicker(Platform.OS === 'ios');
                      if (date) setToDate(date);
                    }}
                  />
                )}
              </View>

             

            </View>

            {/* Buttons */}
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

      {/* Sort Modal */}
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

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  mainContent: { flex: 1 },
  scrollContent: { flex: 1 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10 },

  /* Search row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#000',
  },
  searchIconWrap: {
    backgroundColor: '#7B68EE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    width: Math.floor(width * 0.36),
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginLeft: 10,
  },
  iconButton: {
    backgroundColor: '#7B68EE',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7B68EE',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  headerCell: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'left' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  rowCell: { fontSize: 14, color: '#333' },
  sNoColumn: { width: 50 },
  courseNameColumn: { flex: 1 },
  statusColumn: { width: 100 },
  actionColumn: { width: 60 },
  sNoText: { color: '#666' },
  courseNameText: { color: '#4285F4', fontWeight: '500' },
  statusBadge: { backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actionButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#7B68EE',
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },

  /* Modal styles */
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
    justifyContent: 'space-between'
  },
  filterCell: {
    width: '48%',
    marginBottom: 12
  },
  filterLabel: { fontSize: 12, color: '#444', marginBottom: 6 },
 pickerWrap: {
  borderWidth: 1,
  borderColor: '#EEE',
  borderRadius: 8,
  position: 'relative',
  overflow: 'visible',     // <-- IMPORTANT
  paddingRight: 36,
  backgroundColor: '#fff'
},
picker: {
  height: 36,
  width: '100%',
  color: '#000'             // <-- ensures selected text is visible
},
pickerIcon: {
  position: 'absolute',
  right: 10,
  top: 9,                   // aligns perfectly with Picker height
  zIndex: 20,
}
,

  dropdown: {
    height: 36,
    width: '100%',
    backgroundColor: '#fff'
  },
  dropdownText: {
    color: '#000'
  },

  sortBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7B68EE',
    marginRight: 12,
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
  closeSort: { marginTop: 12, alignItems: 'center' }
});

export default CoursesScreen;
