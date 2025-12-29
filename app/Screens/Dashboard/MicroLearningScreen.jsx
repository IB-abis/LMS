import { useNotification } from '@/app/Components/NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import CustomDrawer from '../../Components/CustomDrawer';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';

// Added imports from ExploreMore logic
import Pdf from 'react-native-pdf';

const { width } = Dimensions.get('window');

const MicroLearningScreen = ({ navigation }) => {
  const route = useRoute();
  const { openNotification } = useNotification();
  const { microlearning } = route.params || {};

  // viewer state - inline usage (no modal)
  const [fileToView, setFileToView] = useState(null); // { uri, type: 'pdf'|'video'|'image'|'web' }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [timeSpent, setTimeSpent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Video-specific tracking
  const playedRangesRef = useRef([]); // array of {s,e}
  const lastVideoTimeRef = useRef(0);
  const videoDurationRef = useRef(microlearning?.durationInSeconds || 0);
  const videoCompletedRef = useRef(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerStartedRef = useRef(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  // Use the drawer hook - Learning Hub is at index 1
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(1);

  // Use the bottom nav hook
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

  // Record completion API call (unchanged)
  const recordCompletion = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token || !microlearning) return;

      const response = await fetch('https://lms-api.abisaio.com/api/v1/Microlearning/RecordUserMicrolearning', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          microlearningId: microlearning.id,
          timeSpentInSeconds: (microlearning.durationInSeconds || 0) + 1,
          isCompleted: true
        })
      });

      if (response.ok) {
        console.log('Microlearning completion recorded successfully');
      } else {
        console.log('Failed to record completion');
      }
    } catch (error) {
      console.error('Error recording completion:', error);
    }
  };

  // START / STOP timer helpers (start only once)
  const startTimerOnce = () => {
    if (timerStartedRef.current) return;
    timerStartedRef.current = true;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(elapsed);

      // Check if time spent exceeds durationInSeconds + 1
      if (elapsed >= (microlearning?.durationInSeconds || 0) + 1 && !isCompleted) {
        setIsCompleted(true);
        recordCompletion();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerStartedRef.current = false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  // Use ExploreMore file-viewing logic to prepare inline viewer.
  // This runs once on mount to prepare fileToView and start load process.
  useEffect(() => {
    let cancelled = false;

    const prepareAndLoad = async () => {
      if (!microlearning?.contentUrl) {
        setLoading(false);
        setLoadError(true);
        return;
      }

      const fileUrl = microlearning.contentUrl;
      console.log("MicroLearning: preparing file:", fileUrl);

      try {
        const extension = fileUrl.split('.').pop().split('?')[0].toLowerCase();

        // Video types: treat as video and inline embed via WebView
        if (extension === 'mp4' || extension === 'mov' || extension === 'mkv') {
          if (cancelled) return;
          setFileToView({ uri: fileUrl, type: 'video' });
          // keep loading true until onMessage/onLoad fires
          return;
        }

        // PDFs: download locally first (same logic as Exploremore.jsx)
        if (extension === 'pdf') {
          if (cancelled) return;
          try {
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

            if (cancelled) return;
            setFileToView({ uri: localUri, type: 'pdf' });
            // loading remains true until Pdf onLoadComplete
          } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            setLoadError(true);
            setLoading(false);
            Alert.alert('Error', 'Failed to download PDF. Please check your connection and try again.');
          }
          return;
        }

        // Image types - render inline Image
        if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp' || extension === 'gif') {
          if (cancelled) return;
          setFileToView({ uri: fileUrl, type: 'image' });
          return;
        }

        // Other docs: use Office viewer embed
        const encodedUrl = encodeURIComponent(fileUrl);
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
        if (cancelled) return;
        setFileToView({ uri: officeViewerUrl, type: 'web' });
        return;
      } catch (error) {
        console.error('Error preparing file:', error);
        setLoadError(true);
        setLoading(false);
      }
    };

    prepareAndLoad();

    return () => {
      cancelled = true;
    };
  }, [microlearning]);

  // Rendering helpers / event handlers for successful load
  // PDF onLoadComplete triggers timer start
  const onPdfLoadComplete = (numberOfPages, filePath) => {
    console.log(`PDF loaded, pages: ${numberOfPages}`, filePath);
    setLoading(false);
    setLoadError(false);
    startTimerOnce();
  };

  const onPdfError = (error) => {
    console.log('PDF render error:', error);
    setLoading(false);
    setLoadError(true);
    // Per option A: do NOT start timer
    Alert.alert('Error', 'Unable to render PDF.');
  };

  // Image onLoad
  const onImageLoad = () => {
    console.log('Image loaded');
    setLoading(false);
    setLoadError(false);
    startTimerOnce();
  };

  const onImageError = (e) => {
    console.log('Image load error', e);
    setLoading(false);
    setLoadError(true);
  };

  // WebView onLoadEnd for office viewer or web content
  const onWebViewLoadEnd = () => {
    console.log('WebView load end');
    setLoading(false);
    setLoadError(false);
    // For video content we will start tracking via WebView messages (do not start the generic timer)
    if (fileToView?.type !== 'video') {
      startTimerOnce();
    }
  };

  const onWebViewError = (syntheticEvent) => {
    console.log('WebView error: ', syntheticEvent);
    setLoading(false);
    setLoadError(true);
  };

  // Helper to merge new played range into playedRangesRef
  const addPlayedRange = (start, end) => {
    if (end <= start) return;
    const ranges = playedRangesRef.current.slice();
    ranges.push({ s: start, e: end });
    // merge
    ranges.sort((a, b) => a.s - b.s);
    const merged = [];
    for (const r of ranges) {
      if (!merged.length) merged.push(r);
      else {
        const last = merged[merged.length - 1];
        if (r.s <= last.e + 0.1) {
          last.e = Math.max(last.e, r.e);
        } else merged.push(r);
      }
    }
    playedRangesRef.current = merged;

    // compute watched seconds
    const watched = merged.reduce((acc, cur) => acc + Math.max(0, cur.e - cur.s), 0);
    const rounded = Math.floor(watched);
    setTimeSpent(rounded);

    const duration = videoDurationRef.current || (microlearning?.durationInSeconds || 0);
    // consider completed when covered >= duration (allow tiny epsilon)
    if (!videoCompletedRef.current && duration > 0 && watched >= duration - 0.5) {
      videoCompletedRef.current = true;
      setIsCompleted(true);
      recordCompletion();
    }
  };

  const onVideoWebMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type !== 'ml_video_event') return;

      const { event: ev, currentTime, duration, paused } = data;

      if (duration && duration > 0) videoDurationRef.current = duration;

      // first load: mark loaded and clear loading
      if (ev === 'loadedmetadata' || ev === 'initialized') {
        setLoading(false);
        setLoadError(false);
      }

      // time progression: if currentTime moved forward compared to last, add that delta
      const last = lastVideoTimeRef.current || 0;
      if (typeof currentTime === 'number') {
        if (currentTime > last) {
          addPlayedRange(last, currentTime);
        }
        lastVideoTimeRef.current = currentTime;
      }

      if (ev === 'ended') {
        // ensure final range ends at duration
        const dur = videoDurationRef.current || (microlearning?.durationInSeconds || 0);
        addPlayedRange(lastVideoTimeRef.current || 0, dur);
      }
    } catch (err) {
      // ignore bad messages
    }
  };



  if (!microlearning) {
    return (
      <View style={styles.container}>
        <Header title="Micro Learning" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text allowFontScaling={false} style={styles.errorText}>No microlearning data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {/* Universal Header Component */}
        <Header
          title="Micro Learning"
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
            <Text allowFontScaling={false} style={styles.categoryTitle}>{microlearning.title}</Text>
            <Text allowFontScaling={false} style={styles.categorySubtitle}>{microlearning.description}</Text>
            <View style={styles.timeContainer}>
              <Text allowFontScaling={false} style={styles.timeText}>Time Spent: {timeSpent}s</Text>
              <Text allowFontScaling={false} style={styles.durationText}>Duration: {microlearning.durationInSeconds}s</Text>
            </View>
          </Animated.View>
        </View>

        {/* Content — inline viewer (auto loads) */}
       <View style={styles.viewerWrapper}>
          <View style={styles.contentCard}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9370DB" />
                <Text allowFontScaling={false} style={styles.loadingText}>Loading content...</Text>
              </View>
            )}

            {loadError && (
              <View style={{ padding: 10 }}>
                <Text allowFontScaling={false} style={{ color: '#fff' }}>Failed to load content.</Text>
              </View>
            )}



            {/* INLINE: Image */}
            {fileToView?.type === 'image' && fileToView.uri && (
              <Image
                source={{ uri: fileToView.uri }}
                style={{ width: '100%', height: 400, borderRadius: 8 }}
                resizeMode="contain"
                onLoad={onImageLoad}
                onError={onImageError}
              />
            )}

            {/* INLINE: PDF (react-native-pdf) - using Exploremore.jsx logic */}
            {fileToView?.type === 'pdf' && fileToView.uri && (
              <View style={styles.viewerBox}>
                <Pdf
                  source={{ uri: fileToView.uri }}
                  trustAllCerts={false}
                  onLoadComplete={onPdfLoadComplete}
                  onError={onPdfError}
                  style={styles.pdfViewer}
                />
              </View>
            )}

            {/* INLINE: VIDEO via WebView embedding an HTML5 player */}
            {fileToView?.type === 'video' && fileToView.uri && (
              <View style={{ height: 400, width: '100%', backgroundColor: 'black', borderRadius: 8, overflow: 'hidden' }}>
                <WebView
                  source={{
                    html: `
                      <html>
                        <head>
                          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
                          <style>body,html{margin:0;padding:0;background:black;height:100%}video{width:100%;height:100%;background:black;}</style>
                        </head>
                        <body>
                          <video id="mlvideo" controls autoplay playsinline webkit-playsinline>
                            <source src="${fileToView.uri}" type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                          <script>
                            (function(){
                              var video = document.getElementById('mlvideo') || document.querySelector('video');
                              function send(ev){
                                try{
                                  window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'ml_video_event',
                                    event: ev,
                                    currentTime: video.currentTime,
                                    duration: video.duration,
                                    paused: video.paused,
                                    playbackRate: video.playbackRate
                                  }));
                                }catch(e){}
                              }
                              if(!video){ send('no-video'); return; }
                              video.addEventListener('loadedmetadata', function(){ send('loadedmetadata'); });
                              video.addEventListener('timeupdate', function(){ send('timeupdate'); });
                              video.addEventListener('play', function(){ send('play'); });
                              video.addEventListener('pause', function(){ send('pause'); });
                              video.addEventListener('ended', function(){ send('ended'); });
                              video.addEventListener('ratechange', function(){ send('ratechange'); });
                              video.addEventListener('seeked', function(){ send('seeked'); send('timeupdate'); });
                              send('initialized');
                            })();
                          </script>
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
                  onLoadEnd={onWebViewLoadEnd}
                  onError={onWebViewError}
                  onMessage={onVideoWebMessage}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {/* INLINE: Office / other web content via WebView */}
            {fileToView?.type === 'web' && fileToView.uri && (
              <View style={{ height: 600, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
                <WebView
                  source={{ uri: fileToView.uri }}
                  originWhitelist={['*']}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                  mixedContentMode="always"
                  onLoadEnd={onWebViewLoadEnd}
                  onError={onWebViewError}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            {isCompleted && (
              <View style={styles.completionBadge}>
                <Text allowFontScaling={false} style={styles.completionText}>✓ Completed</Text>
              </View>
            )}
          </View>
          <View style={{ height: 100 }} />
        </View>
      </Animated.View>

     

      {/* Universal Drawer Component */}
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
  viewerWrapper: {
  flex: 1,
  paddingHorizontal: 16,
  paddingBottom: 20,   // <-- bottom padding so viewer doesn’t hit screen bottom
  backgroundColor: '#1a1a2e',
},
viewerBox: {
  flex: 1,
  height: Dimensions.get("window").height * 0.70,   // fixed, safe height
  width: '100%',
  overflow: 'hidden',  // prevents bleeding outside container
  borderRadius: 12,
},
pdfViewer: {
  flex: 1,
  width: '100%',
  backgroundColor: '#16213e',
},


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
    paddingVertical: 15,
    paddingHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B68EE',
    marginBottom: 5,
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#7B68EE',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
  },
  contentCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textContent: {
    marginBottom: 20,
  },
  contentText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  viewButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  completionBadge: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  completionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#a8b2d1',
    fontSize: 14,
    marginTop: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#a8b2d1',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MicroLearningScreen;