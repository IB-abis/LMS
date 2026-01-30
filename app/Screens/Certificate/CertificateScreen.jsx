

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
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

const { width } = Dimensions.get('window');

const CertificateScreen = ({ navigation }) => {
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

  const [searchText, setSearchText] = useState('');
  const [filteredCertificates, setFilteredCertificates] = useState([]);

  // ✅ Use the drawer hook - Certificates is at index 6
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(6);

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
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Certificates data (from API)
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch Certificates from API
  const fetchCertificates = async (search = '') => {
    try {
      setLoading(true);
      const employeeID = await AsyncStorage.getItem('employeeID');

      if (!employeeID) {
        console.warn("Employee ID missing in AsyncStorage");
        setCertificates([]);
        setFilteredCertificates([]);
        return;
      }

      const apiUrl = `https://lms-api-qa.abisaio.com/api/v1/CertificateTemplate/GetEmployeeCertificates?UserID=${employeeID}&Page=1&CertificateDate=&ExpiryDate=&Search=${encodeURIComponent(search)}&RowsPerPage=20&Sort=`;

      const response = await fetch(apiUrl);
      const json = await response.json();

      if (json?.succeeded && Array.isArray(json.data) && json.data.length > 0) {
        const formatted = json.data.map((item, index) => ({
          id: item.certificateID?.toString() || String(index),
          courseName: item.courseName || '-',
          courseType: item.courseType || '-',
          certificateDate: item.certificateDate || '-',
          certificateCode: item.trainingSessionID
            ? `TS-${item.trainingSessionID}`
            : item.eLearningCourseID
              ? `EL-${item.eLearningCourseID}`
              : '-',
          expiryDate: item.expiryDate || '-',
          template: ['blue', 'gold', 'elegant'][index % 3],
        }));

        setCertificates(formatted);
        setFilteredCertificates(formatted);
      } else {
        setCertificates([]);
        setFilteredCertificates([]);
      }
    } catch (error) {
      console.error('Certificate API error:', error);
      setCertificates([]);
      setFilteredCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
    setFilteredCertificates(certificates);

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

    // Staggered card animations
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 500 + index * 100);
    });

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
  }, []);

  // Handle search with API
  const handleSearch = async (text) => {
    setSearchText(text);
    await fetchCertificates(text);
  };

  // Handle card press
  const handleCardPress = (index) => {
    Animated.sequence([
      Animated.spring(cardAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnims[index], {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Get certificate template colors
  const getTemplateColors = (template) => {
    switch (template) {
      case 'blue':
        return {
          border: '#1E3A8A',
          gradient: ['#3B82F6', '#1E40AF'],
          accent: '#60A5FA',
        };
      case 'gold':
        return {
          border: '#B45309',
          gradient: ['#F59E0B', '#D97706'],
          accent: '#FCD34D',
        };
      case 'elegant':
        return {
          border: '#7B68EE',
          gradient: ['#7B68EE', '#9D7FEA'],
          accent: '#A78BFA',
        };
      default:
        return {
          border: '#7B68EE',
          gradient: ['#7B68EE', '#9D7FEA'],
          accent: '#A78BFA',
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.mainContent}>
        {/* ✅ Universal Header Component */}
        <Header title="Certificates" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />

        {/* Search Bar */}
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
          <TouchableOpacity style={styles.filterButton}>
            <LinearGradient
              colors={['#7B68EE', '#9D7FEA']}
              style={styles.filterGradient}
            >
              <Ionicons name="options" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Certificates Grid */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.certificatesGrid}>
            {loading ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="spinner" size={40} color="#7B68EE" />
                <Text allowFontScaling={false} style={styles.emptyText}>Loading certificates...</Text>
              </View>
            ) : (
              <>
                {filteredCertificates.map((cert, index) => {
                  const scale = cardAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  });
                  const opacity = cardAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  });
                  const translateY = cardAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  });

                  const colors = getTemplateColors(cert.template);

                  return (
                    <Animated.View
                      key={cert.id}
                      style={[
                        styles.certificateCard,
                        {
                          opacity,
                          transform: [{ scale }, { translateY }],
                          borderLeftWidth: 5,
                          borderLeftColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.certificateDetailsBox}>
                        <Text allowFontScaling={false} style={styles.certificateTitle}>{cert.courseName}</Text>

                        <View style={styles.detailRow}>
                          <Text allowFontScaling={false} style={styles.detailLabel}>Course Type:</Text>
                          <Text allowFontScaling={false} style={styles.detailValue}>{cert.courseType}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text allowFontScaling={false} style={styles.detailLabel}>Certificate Date:</Text>
                          <Text allowFontScaling={false} style={styles.detailValue}>{cert.certificateDate}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text allowFontScaling={false} style={styles.detailLabel}>Certificate Code:</Text>
                          <Text allowFontScaling={false} style={styles.detailValue}>{cert.certificateCode}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text allowFontScaling={false} style={styles.detailLabel}>Expiry Date:</Text>
                          <Text allowFontScaling={false} style={styles.detailValue}>{cert.expiryDate}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                          {/* <TouchableOpacity style={[styles.actionButton, { marginRight: 10 }]}>
                            <LinearGradient
                              colors={colors.gradient}
                              style={styles.downloadButton}
                            >
                              <FontAwesome5 name="download" size={14} color="#fff" />
                              <Text allowFontScaling={false} style={styles.downloadText}>Download</Text>
                            </LinearGradient>
                          </TouchableOpacity>*/}

                          <TouchableOpacity style={[styles.actionButton, { marginLeft: 10 }]}>
                            <LinearGradient
                              colors={colors.gradient}
                              style={styles.viewButton}
                            >
                              <Text allowFontScaling={false} style={styles.viewText}>View</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}

                {filteredCertificates.length === 0 && (
                  <View style={styles.emptyState}>
                    <FontAwesome5 name="certificate" size={48} color="#8B7AA3" />
                    <Text allowFontScaling={false} style={styles.emptyText}>No certificates found</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

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
  certificateDetailsBox: {
    padding: 20,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f7fe',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c54',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
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
  scrollContent: {
    flex: 1,
    backgroundColor: '#f4f7fe',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
  },
  certificatesGrid: {
    paddingHorizontal: 20,
  },
  certificateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8B7AA3',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 10,
    elevation: 3,
  },
  downloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  viewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 10,
    elevation: 3,
  },
  viewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    color: '#8B7AA3',
  },
});

export default CertificateScreen;
