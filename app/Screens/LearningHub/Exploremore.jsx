import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Pdf from 'react-native-pdf';
// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import { useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';

const { width } = Dimensions.get('window');

const ExploreMoreScreen = ({ navigation }) => {
  const route = useRoute();
  const { openNotification } = useNotification();
  const { category } = route.params || {};

  // Inside component state area (replace previous showFileModal/fileUrl with these)
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [fileToView, setFileToView] = useState(null); // { uri: string, type: 'pdf' | 'web' }

  // New handleViewFile - downloads PDFs locally and opens them in modal; others open via MS Office embed
  const handleViewFile = async (fileUrl) => {
    console.log("📄 View Requested For:", fileUrl);

    try {
      const extension = fileUrl.split('.').pop().split('?')[0].toLowerCase(); // handle query params

      if (extension === 'mp4' || extension === 'mov' || extension === 'mkv') {
        console.log("🎥 Opening VIDEO:", fileUrl);
        setFileToView({ uri: fileUrl, type: 'video' });
        setViewerOpen(true);
        return;
      }


      if (extension === 'pdf') {
        const fileName = fileUrl.split('/').pop().split('?')[0];
        const localPath = `${FileSystem.documentDirectory}${fileName}`;

        // Check if already downloaded
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        let localUri = localPath;

        if (fileInfo.exists) {
          console.log("✅ PDF already exists locally:", localPath);
        } else {
          console.log("⬇️ Downloading PDF...");
          const downloadRes = await FileSystem.downloadAsync(fileUrl, localPath);
          localUri = downloadRes.uri; // downloadAsync returns a proper file URI
          console.log("✅ PDF downloaded successfully:", localUri);
        }

        // Ensure file:// prefix for android/ios if missing
        if (!localUri.startsWith('file://')) {
          localUri = 'file://' + localUri;
        }

        setFileToView({ uri: localUri, type: 'pdf' });
        setViewerOpen(true);
      } else {
        // Use Office viewer embed
        const encodedUrl = encodeURIComponent(fileUrl);
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
        console.log("📄 Viewing via Microsoft Office Viewer:", officeViewerUrl);
        setFileToView({ uri: officeViewerUrl, type: 'web' });
        setViewerOpen(true);
      }
    } catch (error) {
      console.error('❌ Error opening file:', error);
      Alert.alert('Error', 'Unable to open this file.');
    }
  };



  // 🔙 Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  // ✅ Use the drawer hook - Learning Hub is at index 1
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(1);

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
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([...Array(2)].map(() => new Animated.Value(0))).current;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  const categoryMapping = {
    "Corporate Essentials": "Corporate Essentials",
    "Empowerment Centre": "Empowerment Center",
    "Health & Wellness": "Health And Wellness",
    "Environment & Sustainability": "Environment And Sustainability",
    "Book Review": "Book Review",
    "Month Calendar": "Month Calendar",
    "Digital and Traditional": "Digital and Traditional",
    "Knowledge Nuggets": "Knowledge Nuggets",

  };


  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const employeeID = await AsyncStorage.getItem('employeeID');
        const selectedCategory = categoryMapping[category] || category;

        const response = await fetch(
          `https://lms-api-qa.abisaio.com/api/v1/Course/GetGlobalCourse?UserID=${employeeID}&GlobalCategory=${encodeURIComponent(selectedCategory)}`
        );

        const result = await response.json();
        if (result.succeeded) {
          setCourses(result.data);
        }
      } catch (error) {
        console.error("API ERROR", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [category]);


  const handleDownload = async (url) => {
    try {
      const fileName = url.split('/').pop();
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      console.log('Downloaded to:', uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', 'File saved to app storage.');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file.');
    }
  };

  const toggleExpand = (id) => {
    setExpandedCourseId(prev => (prev === id ? null : id));
  };

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

    // Header animation
    setTimeout(() => {
      Animated.spring(headerAnim, {
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
      }, 400 + index * 150);
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {/* ✅ Universal Header Component */}
        <Header
          title="Learning Hub"
          showBackButton
          onBackPress={() => navigation.goBack()}
          onNotificationPress={openNotification}
        />

        {/* Category Header */}
        <View style={styles.categoryHeaderContainer}>
          <Animated.View
            style={[
              styles.categoryHeader,
              {
                opacity: headerAnim,
                transform: [{
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })
                }]
              }
            ]}
          >

            <Text allowFontScaling={false} style={styles.categoryTitle}>{category}</Text>
          </Animated.View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#9370DB" style={{ marginTop: 50 }} />
          ) : (
            courses.map((course) => {
              const isExpanded = expandedCourseId === course.id;
              return (
                <View key={course.id} style={styles.courseCard}>
                  <Image
                    source={{ uri: course.imageUrl }}
                    style={styles.courseImage}
                    resizeMode="cover"
                  />
                  <Text allowFontScaling={false} style={styles.courseName}>{course.name}</Text>
                  <Text allowFontScaling={false} style={styles.courseObjective}>{course.objective}</Text>

                  <TouchableOpacity
                    onPress={() => toggleExpand(course.id)}
                    style={styles.readMoreButton}
                  >
                    <LinearGradient
                      colors={['#7B68EE', '#9D7FEA']}
                      style={styles.readMoreGradient}
                    >
                      <Text allowFontScaling={false} style={styles.readMoreText}>
                        {isExpanded ? 'Hide Details' : 'Read More'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.detailsContainer}>
                      <View style={styles.detailRow}>
                        <Text allowFontScaling={false} style={styles.detailLabel}>Published By:</Text>
                        <Text allowFontScaling={false} style={styles.detailValue}>{course.publishedBy}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text allowFontScaling={false} style={styles.detailLabel}>Published On:</Text>
                        <Text allowFontScaling={false} style={styles.detailValue}>
                          {new Date(course.publishedOn).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text allowFontScaling={false} style={styles.detailLabel}>Last Updated:</Text>
                        <Text allowFontScaling={false} style={styles.detailValue}>
                          {new Date(course.lastUpdatedOn).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text allowFontScaling={false} style={styles.detailLabel}>Duration:</Text>
                        <Text allowFontScaling={false} style={styles.detailValue}>{course.duration} mins</Text>
                      </View>

                      {course.courseContent?.length > 0 ? (
                        course.courseContent.map((content, idx) => (
                          <View key={idx} style={styles.contentCard}>
                            <Text allowFontScaling={false} style={styles.contentTitle}>{content.title}</Text>
                            <Text allowFontScaling={false} style={styles.contentDescription}>
                              {content.description}
                            </Text>

                            {content.contentUrl ? (
                              <TouchableOpacity
                                onPress={() => handleViewFile(content.contentUrl)}
                                style={styles.downloadButtonContainer}
                              >
                                <LinearGradient
                                  colors={['#9370DB', '#7B68EE']}
                                  style={styles.downloadButton}
                                >
                                  <Ionicons name="eye-outline" size={18} color="#fff" />
                                  <Text allowFontScaling={false} style={styles.downloadText}>View</Text>
                                </LinearGradient>
                              </TouchableOpacity>


                            ) : null}
                          </View>
                        ))
                      ) : (
                        <Text allowFontScaling={false} style={styles.noContentText}>
                          No additional content available.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
      {isViewerOpen && (
  <Modal
    visible={isViewerOpen}
    animationType="slide"
    onRequestClose={() => setViewerOpen(false)}
    transparent={true}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>

        {/* File Viewer */}
        {fileToView?.type === 'pdf' ? (
          <Pdf
            source={{ uri: fileToView.uri }}
            trustAllCerts={false}
            onLoadComplete={(numberOfPages, filePath) => {
              console.log(`PDF loaded, pages: ${numberOfPages}`);
            }}
            onError={(error) => {
              console.log('PDF render error:', error);
              Alert.alert('Error', 'Unable to render PDF.');
            }}
            style={{ flex: 1, width: '100%' }}
          />

        ) : fileToView?.type === 'video' ? (
          <WebView
            source={{
              html: `
                <html>
                  <body style="margin:0;padding:0;background:black;">
                    <video 
                      controls 
                      autoplay 
                      style="width:100%;height:100%;background:black;" 
                      src="${fileToView.uri}">
                    </video>
                  </body>
                </html>
              `
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            style={{ flex: 1 }}
          />

        ) : (
          <WebView
            source={{ uri: fileToView?.uri }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            style={{ flex: 1 }}
          />
        )}

        {/* Close Button */}
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setViewerOpen(false)}
        >
          <Text allowFontScaling={false} style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Close
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  </Modal>
)}




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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    height: '85%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  modalCloseButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  popupContainer: {
    backgroundColor: '#16213e',
    width: '100%',
    height: '80%',
    borderRadius: 12,
    overflow: 'hidden'
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0f3460'
  },
  popupTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },

  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  mainContent: {
    flex: 1,
  },
  categoryHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1a1a2e',
  },
  categoryHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B68EE',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
  },
  courseCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginTop: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  courseImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
  },
  courseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  courseObjective: {
    color: '#bbb',
    marginVertical: 8,
    lineHeight: 20,
  },
  readMoreButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  readMoreGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  readMoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  detailsContainer: {
    marginTop: 12,
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 6,
  },
  detailValue: {
    color: '#bbb',
    flex: 1,
  },
  contentCard: {
    backgroundColor: '#1a1a2e',
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  contentTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 6,
  },
  contentDescription: {
    color: '#bbb',
    marginBottom: 10,
    lineHeight: 18,
  },
  downloadButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '600',
  },
  noContentText: {
    color: '#bbb',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ExploreMoreScreen;
