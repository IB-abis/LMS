

// import { MaterialIcons } from '@expo/vector-icons';
// import { useRoute } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system/legacy';
// import * as Sharing from 'expo-sharing';
// import React, { useEffect, useRef } from 'react';
// import {
//   Alert,
//   Animated,
//   BackHandler,
//   Dimensions,
//   Image,
//   Modal,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View
// } from 'react-native';
// // ✅ Import universal components
// import { useNotification } from '@/app/Components/NotificationContext';
// import Pdf from 'react-native-pdf';
// import { WebView } from 'react-native-webview';
// import BottomNavigation from '../../Components/BottomNavigation';
// import Header from '../../Components/Header';
// import { useBottomNav } from '../../Components/useBottomNav';

// const { width } = Dimensions.get('window');

// const ActionviewScreen = ({ navigation }) => {

//   const [isViewerOpen, setViewerOpen] = React.useState(false);
//   const [fileToView, setFileToView] = React.useState(null);
// const { openNotification } = useNotification();


//   useEffect(() => {
//     const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
//       navigation.goBack();
//       return true;
//     });
//     return () => backHandler.remove();
//   }, [navigation]);
//   const route = useRoute();
//   const { course } = route.params || {};

//   // ✅ Use the bottom nav hook
//   const {
//     selectedTab,
//     tabScaleAnims,
//     rotateAnims,
//     handleTabPress
//   } = useBottomNav('Dashboard');

//   // Download + open file
//   const downloadFile = async (url, fileName) => {
//     try {
//       const fileUri = `${FileSystem.documentDirectory}${fileName}`;
//       const { uri } = await FileSystem.downloadAsync(url, fileUri);
//       console.log('File downloaded to:', uri);

//       if (await Sharing.isAvailableAsync()) {
//         await Sharing.shareAsync(uri);
//       } else {
//         Alert.alert('Downloaded', `File saved to: ${uri}`);
//       }
//     } catch (error) {
//       console.error('File download error:', error);
//       Alert.alert('Download Failed', 'Unable to download this file.');
//     }
//   };

//   // Animations
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(50)).current;
//   const cardSlideAnim = useRef(new Animated.Value(30)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 600,
//         useNativeDriver: true,
//       }),
//       Animated.spring(slideAnim, {
//         toValue: 0,
//         tension: 50,
//         friction: 8,
//         useNativeDriver: true,
//       }),
//     ]).start();

//     setTimeout(() => {
//       Animated.spring(cardSlideAnim, {
//         toValue: 0,
//         tension: 40,
//         friction: 7,
//         useNativeDriver: true,
//       }).start();
//     }, 200);
//   }, []);

//   const handleViewFile = async (fileUrl) => {
//     console.log("📄 View Requested For:", fileUrl);

//     try {
//       const extension = fileUrl.split('.').pop().toLowerCase();

//       if (extension === 'pdf') {
//         const fileName = fileUrl.split('/').pop();
//         const localPath = `${FileSystem.documentDirectory}${fileName}`;

//         // Check if already downloaded
//         const fileInfo = await FileSystem.getInfoAsync(localPath);

//         if (fileInfo.exists) {
//           console.log("✅ PDF already exists locally:", localPath);
//         } else {
//           console.log("⬇️ Downloading PDF...");
//           await FileSystem.downloadAsync(fileUrl, localPath);
//           console.log("✅ PDF downloaded successfully:", localPath);
//         }

//         setFileToView({ uri: localPath, type: "pdf" });
//       }
//       else {
//         const encodedUrl = encodeURIComponent(fileUrl);
//         const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
//         console.log("📄 Viewing via Microsoft Office Viewer:", officeViewerUrl);
//         setFileToView({ uri: officeViewerUrl, type: "web" });

//       }

//       setViewerOpen(true);

//     } catch (error) {
//       console.error('❌ Error opening file:', error);
//       Alert.alert('Error', 'Unable to open this file.');
//     }
//   };


//   // Helper to format date
//   const formatDate = (dateString) => {
//     if (!dateString) return '-';
//     const d = new Date(dateString);
//     return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
//   };


//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

//       <View style={styles.mainContent}>
//         {/* ✅ Universal Header Component with Back Button */}
//         <Header
//           title="Course Details"
//           showBackButton
//           onBackPress={() => navigation.goBack()}
//           onNotificationPress={openNotification}
//         />

//         {/* Content */}
//         <ScrollView
//           style={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 100 }}
//         >
//           <Animated.View
//             style={[
//               styles.contentCard,
//               {
//                 opacity: fadeAnim,
//                 transform: [{ translateY: slideAnim }],
//               },
//             ]}
//           >
//             {/* Course Details Card */}
//             <View style={styles.courseDetailsCard}>
//               <View style={styles.courseDetailsRow}>
//                 <Image
//                   source={{ uri: course?.imageUrl }}
//                   style={styles.courseImage}
//                 />
//                 <View style={styles.courseDetailsContent}>
//                   <Text allowFontScaling={false} style={styles.courseName}>
//                     {course?.name}
//                   </Text>
//                   <Text allowFontScaling={false} style={styles.courseObjective}>{course?.objective}</Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Program: </Text>
//                     {course?.programName || '-'}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Category: </Text>
//                     {course?.category}  <Text allowFontScaling={false} style={styles.detailLabel}>Level:</Text>{' '}
//                     {course?.level}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Status: </Text>
//                     {course?.status}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Validity: </Text>
//                     {formatDate(course?.validity)}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Published By: </Text>
//                     {course?.publishedBy}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Published On: </Text>
//                     {formatDate(course?.publishedOn)}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Last Updated: </Text>
//                     {formatDate(course?.lastUpdatedOn)}
//                   </Text>

//                   <Text allowFontScaling={false} style={styles.detailText}>
//                     <Text allowFontScaling={false} style={styles.detailLabel}>Duration: </Text>
//                     {course?.duration} mins
//                   </Text>
//                 </View>
//               </View>
//             </View>

//             {/* Course Content Cards */}
//             <View style={styles.courseContentCard}>
//               <Text allowFontScaling={false} style={styles.courseContentTitle}>
//                 Course Content
//               </Text>

//               {course?.courseContent?.length > 0 ? (
//                 course.courseContent
//                   .sort((a, b) => a.displayOrder - b.displayOrder)
//                   .map((content, index) => (
//                     <View key={index} style={styles.contentItem}>
//                       <Text allowFontScaling={false} style={styles.contentItemTitle}>
//                         {content.title}
//                       </Text>
//                       <Text allowFontScaling={false} style={styles.contentItemDescription}>
//                         {content.description || '-'}
//                       </Text>
//                       <Text allowFontScaling={false} style={styles.contentItemMeta}>
//                         <Text allowFontScaling={false} style={styles.metaLabel}>Duration:</Text>{' '}
//                         {content.duration} mins |{' '}
//                         <Text allowFontScaling={false} style={styles.metaLabel}>Pages:</Text> {content.noOfPages} |{' '}
//                         <Text allowFontScaling={false} style={styles.metaLabel}>Last Updated:</Text>{' '}
//                         {formatDate(content.lastUpdatedOn)}
//                       </Text>

//                       <TouchableOpacity
//                         onPress={() => handleViewFile(content.contentUrl)}
//                         style={styles.viewButton}
//                       >
//                         <MaterialIcons name="visibility" size={20} color="#fff" />
//                         <Text allowFontScaling={false} style={styles.viewButtonText}>View</Text>
//                       </TouchableOpacity>
//                     </View>
//                   ))
//               ) : (
//                 <Text allowFontScaling={false} style={styles.noContentText}>
//                   No course content available
//                 </Text>
//               )}
//             </View>
//           </Animated.View>
//         </ScrollView>
//       </View>

//       {isViewerOpen && (
//         <Modal
//           visible={isViewerOpen}
//           animationType="slide"
//           onRequestClose={() => setViewerOpen(false)} // Handles Android back button
//           transparent={true}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>

//               {/* File Viewer */}
//               {fileToView?.type === "pdf" ? (
//                 <Pdf
//                   source={{ uri: fileToView.uri }}
//                   trustAllCerts={false}
//                   style={{ flex: 1, width: '100%' }}
//                 />
//               ) : (
//                 <WebView
//                   source={{ uri: fileToView.uri }}
//                   originWhitelist={['*']}
//                   javaScriptEnabled={true}
//                   domStorageEnabled={true}
//                   startInLoadingState={true}
//                   allowFileAccess={true}
//                   allowUniversalAccessFromFileURLs={true}
//                   mixedContentMode="always"
//                   style={{ flex: 1 }}
//                 />

//               )}


//               {/* ✅ Close Button at Bottom */}
//               <TouchableOpacity
//                 style={styles.modalCloseButton}
//                 onPress={() => setViewerOpen(false)}
//               >
//                 <Text allowFontScaling={false} style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
//                   Close
//                 </Text>
//               </TouchableOpacity>

//             </View>
//           </View>
//         </Modal>
//       )}



//       {/* ✅ Universal Bottom Navigation Component */}
//       <BottomNavigation
//         selectedTab={selectedTab}
//         tabScaleAnims={tabScaleAnims}
//         rotateAnims={rotateAnims}
//         handleTabPress={handleTabPress}
//         navigation={navigation}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     justifyContent: 'center',
//     paddingHorizontal: 10,
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     height: '85%',
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   closeBtn: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     zIndex: 10,
//   },
//   modalCloseButton: {
//     backgroundColor: '#7B68EE',
//     paddingVertical: 12,
//     alignItems: 'center',
//   },


//   container: {
//     flex: 1,
//     backgroundColor: '#1a1a2e'
//   },
//   mainContent: {
//     flex: 1,
//     backgroundColor: '#1a1a2e'
//   },
//   scrollContent: {
//     flex: 1,
//     backgroundColor: '#1a1a2e',
//     padding: 20
//   },
//   contentCard: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     overflow: 'hidden',
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//   },
//   courseDetailsCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 20,
//     elevation: 2,
//   },
//   courseDetailsRow: {
//     flexDirection: 'row',
//   },
//   courseImage: {
//     width: 120,
//     height: 120,
//     borderRadius: 8,
//   },
//   courseDetailsContent: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   courseName: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   courseObjective: {
//     marginVertical: 6,
//     color: '#555',
//   },
//   detailText: {
//     color: '#666',
//     marginBottom: 4,
//   },
//   detailLabel: {
//     fontWeight: 'bold',
//     color: '#444',
//   },
//   courseContentCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//   },
//   courseContentTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   contentItem: {
//     backgroundColor: '#F9F9FF',
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 12,
//     borderLeftWidth: 4,
//     borderLeftColor: '#7B68EE',
//   },
//   contentItemTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   contentItemDescription: {
//     color: '#666',
//     marginBottom: 4,
//   },
//   contentItemMeta: {
//     fontSize: 13,
//     color: '#777',
//   },
//   metaLabel: {
//     fontWeight: 'bold',
//   },
//   viewButton: {
//     marginTop: 10,
//     alignSelf: 'flex-start',
//     backgroundColor: '#7B68EE',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   viewButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//     marginLeft: 6,
//   },
//   noContentText: {
//     color: '#888',
//     textAlign: 'center',
//   },
// });

// export default ActionviewScreen;



import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
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
// ✅ Import universal components
import { useNotification } from '@/app/Components/NotificationContext';
import Pdf from 'react-native-pdf';
import { WebView } from 'react-native-webview';
import BottomNavigation from '../../Components/BottomNavigation';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';

const { width } = Dimensions.get('window');

const ActionviewScreen = ({ navigation }) => {

  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [fileToView, setFileToView] = React.useState(null);
const { openNotification } = useNotification();


  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);
  const route = useRoute();
  const { course } = route.params || {};

  // ✅ Use the bottom nav hook
  const {
    selectedTab,
    tabScaleAnims,
    rotateAnims,
    handleTabPress
  } = useBottomNav('Dashboard');

  // Download + open file
  const downloadFile = async (url, fileName) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      console.log('File downloaded to:', uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `File saved to: ${uri}`);
      }
    } catch (error) {
      console.error('File download error:', error);
      Alert.alert('Download Failed', 'Unable to download this file.');
    }
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);
  }, []);

  const handleViewFile = async (fileUrl) => {
    console.log("📄 View Requested For:", fileUrl);

    try {
      const extension = fileUrl.split('.').pop().toLowerCase();

      if (extension === 'pdf') {
        const fileName = fileUrl.split('/').pop();
        const localPath = `${FileSystem.documentDirectory}${fileName}`;

        // Check if already downloaded
        const fileInfo = await FileSystem.getInfoAsync(localPath);

        if (fileInfo.exists) {
          console.log("✅ PDF already exists locally:", localPath);
        } else {
          console.log("⬇️ Downloading PDF...");
          await FileSystem.downloadAsync(fileUrl, localPath);
          console.log("✅ PDF downloaded successfully:", localPath);
        }

        setFileToView({ uri: localPath, type: "pdf" });
      }
      else {
        const encodedUrl = encodeURIComponent(fileUrl);
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
        console.log("📄 Viewing via Microsoft Office Viewer:", officeViewerUrl);
        setFileToView({ uri: officeViewerUrl, type: "web" });

      }

      setViewerOpen(true);

    } catch (error) {
      console.error('❌ Error opening file:', error);
      Alert.alert('Error', 'Unable to open this file.');
    }
  };


  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.mainContent}>
        {/* ✅ Universal Header Component with Back Button */}
        <Header
          title="Course Details"
          showBackButton
          onBackPress={() => navigation.goBack()}
          onNotificationPress={openNotification}
        />

        {/* Content */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <Animated.View
            style={[
              styles.contentWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Course Details Card */}
            <View style={styles.courseCard}>
              <Image
                source={{ uri: course?.imageUrl }}
                style={styles.courseImage}
                resizeMode="cover"
              />
              
              <View style={styles.courseHeader}>
                <Text allowFontScaling={false} style={styles.courseName}>
                  {course?.name}
                </Text>
                <Text allowFontScaling={false} style={styles.courseObjective}>
                  {course?.objective}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Program</Text>
                  <Text allowFontScaling={false} style={styles.detailValue} numberOfLines={2}>
                    {course?.programName || '-'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Category</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {course?.category}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Level</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {course?.level}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Status</Text>
                  <View style={styles.statusBadge}>
                    <Text allowFontScaling={false} style={styles.statusText}>
                      {course?.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Duration</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {course?.duration} mins
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Validity</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {formatDate(course?.validity)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Published By</Text>
                  <Text allowFontScaling={false} style={styles.detailValue} numberOfLines={1}>
                    {course?.publishedBy}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Published On</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {formatDate(course?.publishedOn)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text allowFontScaling={false} style={styles.detailLabel}>Last Updated</Text>
                  <Text allowFontScaling={false} style={styles.detailValue}>
                    {formatDate(course?.lastUpdatedOn)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Course Content Section */}
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="library-books" size={20} color="#7B68EE" />
                <Text allowFontScaling={false} style={styles.sectionTitle}>
                  Course Content
                </Text>
              </View>

              {course?.courseContent?.length > 0 ? (
                course.courseContent
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((content, index) => (
                    <View key={index} style={styles.contentItem}>
                      <View style={styles.contentHeader}>
                        <View style={styles.contentNumber}>
                          <Text allowFontScaling={false} style={styles.contentNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={styles.contentInfo}>
                          <Text allowFontScaling={false} style={styles.contentTitle}>
                            {content.title}
                          </Text>
                          {content.description && content.description !== '-' && (
                            <Text allowFontScaling={false} style={styles.contentDescription}>
                              {content.description}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.contentMeta}>
                        <View style={styles.metaItem}>
                          <MaterialIcons name="schedule" size={14} color="#666" />
                          <Text allowFontScaling={false} style={styles.metaText}>
                            {content.duration} mins
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MaterialIcons name="description" size={14} color="#666" />
                          <Text allowFontScaling={false} style={styles.metaText}>
                            {content.noOfPages} pages
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MaterialIcons name="update" size={14} color="#666" />
                          <Text allowFontScaling={false} style={styles.metaText}>
                            {formatDate(content.lastUpdatedOn)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleViewFile(content.contentUrl)}
                        style={styles.viewButton}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="visibility" size={18} color="#fff" />
                        <Text allowFontScaling={false} style={styles.viewButtonText}>
                          View Content
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialIcons name="info-outline" size={48} color="#ccc" />
                  <Text allowFontScaling={false} style={styles.emptyText}>
                    No course content available
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      {isViewerOpen && (
        <Modal
          visible={isViewerOpen}
          animationType="slide"
          onRequestClose={() => setViewerOpen(false)}
          transparent={false}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text allowFontScaling={false} style={styles.modalTitle}>
                {fileToView?.type === "pdf" ? "PDF Viewer" : "Document Viewer"}
              </Text>
              <TouchableOpacity
                style={styles.closeIcon}
                onPress={() => setViewerOpen(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewerWrapper}>
              {fileToView?.type === "pdf" ? (
                <Pdf
                  source={{ uri: fileToView.uri }}
                  trustAllCerts={false}
                  style={styles.pdfViewer}
                />
              ) : (
                <WebView
                  source={{ uri: fileToView.uri }}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                  mixedContentMode="always"
                  style={styles.webViewer}
                />
              )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  contentWrapper: {
    padding: 16,
  },
  
  // Course Card
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  courseImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  courseHeader: {
    padding: 16,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    lineHeight: 26,
  },
  courseObjective: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  detailsContainer: {
    padding: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Content Section
  contentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#7B68EE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginLeft: 8,
  },
  contentItem: {
    backgroundColor: '#F8F7FF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7B68EE',
  },
  contentHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  contentNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7B68EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contentNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
    lineHeight: 20,
  },
  contentDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  contentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  viewButton: {
    backgroundColor: '#7B68EE',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7B68EE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeIcon: {
    padding: 4,
  },
  viewerWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfViewer: {
    flex: 1,
    width: '100%',
  },
  webViewer: {
    flex: 1,
  },
});

export default ActionviewScreen;
