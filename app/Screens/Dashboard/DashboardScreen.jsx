import { useNotification } from '@/app/Components/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Dimensions,
    Easing,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import TextTicker from 'react-native-text-ticker';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';

import { TourGuideZone, useTourGuideController } from 'rn-tourguide';
import Header from '../../Components/Header';
import NotificationModal from "../../Components/NotificationModal";
import { useBottomNav } from '../../Components/useBottomNav';
import { useDrawer } from '../../Components/useDrawer';
import Ljmap from './Ljmap';

const { width, height } = Dimensions.get('window');

const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwNzA2OSIsIlVzZXJJZCI6IjQ1NDYwIiwiRW1haWwiOiJkZXZlbG9wZXJAbWFya3VwbGFiLmNvbSIsImp0aSI6IjllMDA4MTBkLWRlNzktNDBkOS1iZGJhLTAxNjlkMmNjNDEwOCIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlVzZXIiLCJVc2VyVHlwZSI6IlVzZXIiLCJleHAiOjE3NjYyMDExODIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6Mjg3NDciLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjI4NzQ3In0.CljD-wqPF_3pXeHOWLP4otN_qDvKYs2KiRHTLmFceAo';

const BANNER_CACHE_KEY = '@banner_data_cache';
const BANNER_CACHE_EXPIRY_KEY = '@banner_cache_expiry';
const CACHE_DURATION_HOURS = 24;

const BANNER_WIDTH = width - 80;


// Updated MarqueeText component - removes numberOfLines to show full text
const MarqueeText = ({ text, speed = 50 }) => {
    const scrollX = useRef(new Animated.Value(0)).current;
    const [textWidth, setTextWidth] = useState(0);

    const onTextLayout = (e) => {
        setTextWidth(e.nativeEvent.layout.width);
    };

    useEffect(() => {
        if (textWidth > 0) {
            scrollX.setValue(0);

            const animation = Animated.loop(
                Animated.timing(scrollX, {
                    toValue: -textWidth,
                    duration: (textWidth / speed) * 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );

            animation.start();

            return () => animation.stop();
        }
    }, [textWidth, speed]);

    return (
        <View style={styles.marqueeContainer}>
            <Animated.View
                style={[
                    styles.marqueeContent,
                    {
                        transform: [{ translateX: scrollX }],
                    },
                ]}
            >
                <Text allowFontScaling={false} style={styles.marqueeText} onLayout={onTextLayout}>
                    {text}
                </Text>
                <Text allowFontScaling={false} style={styles.marqueeText}>
                    {text}
                </Text>
            </Animated.View>
        </View>
    );
};



const DashboardScreen = ({ navigation, route }) => {
    // Add this with your other refs
    const bannerScrollIndexRef = useRef(1); // Tracks current position in extended array

    const { openNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userName, setUserName] = useState("");
    const { start, canStart } = useTourGuideController();

    useEffect(() => {
        // Trigger tour ONLY if isFirstTimeLogin is true
        // Assuming dashboardData or props contains the user profile
        if (dashboardData?.isFirstTimeLogin && canStart) {
            start();
        }
    }, [canStart, dashboardData]);

    const isFirstTimeLogin = route.params?.userData?.isFirstTimeLogin;


    useEffect(() => {
        if (isFirstTimeLogin && canStart) {
            start(); // Starts the tour once if it's the first login
        }
    }, [canStart, isFirstTimeLogin]);

    return (
        <ScrollView>
            {/* 1. TOP HEADER (Image 1) */}
            <View style={styles.header}>
                <TourGuideZone zone={1} text="This is your Menu" shape="circle">
                    <MenuButton />
                </TourGuideZone>

                <TourGuideZone zone={2} text="This is your Reward Spinner" shape="circle">
                    <SpinnerIcon />
                </TourGuideZone>

                <TourGuideZone zone={3} text="Check your Notifications here" shape="circle">
                    <NotificationIcon />
                </TourGuideZone>
            </View>

            {/* 2. STATS SECTION (Image 2) */}
            <View style={styles.statsRow}>
                <TourGuideZone zone={4} text="Track your Total Points, Training Hours, and Completed Tasks">
                    <StatsGrid /> {/* This wraps the 4 cards you showed */}
                </TourGuideZone>
            </View>

            {/* 3. TABS SECTION (Image 3) */}
            <TourGuideZone zone={5} text="Manage your Learning Journey and Leaderboard">
                <TabsContainer />
            </TourGuideZone>

            {/* 4. MICROLEARNING (Image 4) */}
            <TourGuideZone zone={6} text="Explore Microlearning modules here">
                <MicrolearningList />
            </TourGuideZone>

            {/* 5. LEADERBOARD TOP 3 & TOP 10 (Image 5) */}
            <TourGuideZone zone={7} text="See the Top 3 performers and scroll down for Top 10">
                <LeaderboardSection />
            </TourGuideZone>

            {/* 6. BOTTOM NAVIGATION (Image 6) */}
            {/* If your bottom nav is inside this screen, wrap it here */}
            <TourGuideZone zone={8} text="Navigate between Dashboard, Calendar, and Sessions" shape="rectangle">
                <BottomBarMockup />
            </TourGuideZone>
        </ScrollView>
    );
};

const bannerScrollRef = useRef(null);
const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
const horizontalScrollRef = useRef(null);
const [isBannerInteracting, setIsBannerInteracting] = useState(false);
const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
// Add near other states: isBannerInteracting, isProgrammaticScroll, ...
const [isProgrammaticBannerScroll, setIsProgrammaticBannerScroll] = useState(false);

const autoScrollInterval = useRef(null);
const [bannerAds, setBannerAds] = useState([]);
const [loadingBanners, setLoadingBanners] = useState(true);
const [extendedBannerData, setExtendedBannerData] = useState([]);
const [bannerInitialized, setBannerInitialized] = useState(false);


const [journeyInfo, setJourneyInfo] = useState(null);
const formatJourneyDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const handleBannerMomentumEnd = (event) => {
    const scrollX = event?.nativeEvent?.contentOffset?.x ?? 0;
    const calculatedIndex = Math.round(scrollX / BANNER_WIDTH);

    // Handle infinite scroll wrapping
    if (calculatedIndex === 0) {
        // Scrolled to cloned last item
        setTimeout(() => {
            bannerScrollRef.current?.scrollTo({
                x: bannerAds.length * BANNER_WIDTH,
                animated: false,
            });
        }, 50);
    } else if (calculatedIndex === extendedBannerData.length - 1) {
        // Scrolled to cloned first item
        setTimeout(() => {
            bannerScrollRef.current?.scrollTo({
                x: BANNER_WIDTH,
                animated: false,
            });
        }, 50);
    }

    setIsBannerInteracting(false);
};

const handleBannerScrollBeginDrag = () => {
    setIsBannerInteracting(true);
    // If an auto-scroll was in progress, cancel programmatic flag so user gets control
    setIsProgrammaticBannerScroll(false);
    // clear auto-scroll interval so it doesn't immediately re-run while user drags
    if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
    }
};

const handleBannerScrollEndDrag = () => {
    // keep isBannerInteracting true until momentum ends, do nothing here
};

const handleBannerMomentumEndFinal = (event) => {
    // a thin wrapper that we attach to onMomentumScrollEnd
    handleBannerMomentumEnd(event);
    // allow parent to regain gestures after a short safe delay
    setTimeout(() => {
        setIsBannerInteracting(false);
    }, 120);
};

// Manual scroll functions
// const scrollToPreviousBanner = () => {
//     if (bannerAds.length === 0) return;
//     const prevIndex = currentBannerIndex === 0 ? bannerAds.length - 1 : currentBannerIndex - 1;
//     setCurrentBannerIndex(prevIndex);
//     if (bannerScrollRef.current) {
//         bannerScrollRef.current.scrollTo({
//             x: prevIndex * BANNER_WIDTH,
//             animated: true
//         });
//     }
// };

// const scrollToNextBanner = () => {
//     if (bannerAds.length === 0) return;
//     const nextIndex = (currentBannerIndex + 1) % bannerAds.length;
//     setCurrentBannerIndex(nextIndex);
//     if (bannerScrollRef.current) {
//         bannerScrollRef.current.scrollTo({
//             x: nextIndex * BANNER_WIDTH,
//             animated: true
//         });
//     }
// };

// 20px padding on both sides
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
const [dashboardData, setDashboardData] = useState(null);
const [loadingDashboard, setLoadingDashboard] = useState(true);

const [sapId, setSapId] = useState(null);
useEffect(() => {
    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const employeeID = await AsyncStorage.getItem("employeeID");
            const applicationProfile = await AsyncStorage.getItem("applicationProfile");
            const token = await AsyncStorage.getItem("token");
            const sapid = await AsyncStorage.getItem("sapid");
            if (!employeeID || !applicationProfile || !token) {
                throw new Error("Required user data not found");
            }
            setSapId(sapid);
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const apiUrl = `https://lms-api.abisaio.com/api/v1/Dashboard/GetDashboardData?UserID=${employeeID}&type=${applicationProfile}&year=${year}&month=${month}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error("Failed to fetch dashboard data");
            }
            const result = await response.json();
            if (result.succeeded) {
                setDashboardData(result);
            } else {
                throw new Error(result.message || "Failed to fetch dashboard data");
            }
        } catch (error) {
            console.log("Dashboard fetch error:", error);
            setError(error.message);
            showCustomAlert(
                'error',
                'Error',
                error.message,
                () => fetchDashboardData(),
                true
            );
        } finally {
            setIsLoading(false);
            setLoadingDashboard(false);
        }
    };
    fetchDashboardData();
}, []);

useEffect(() => {
    const fetchMicrolearningData = async () => {
        try {
            setLoadingBanners(true);
            const token = await AsyncStorage.getItem("token");

            if (!token) {
                throw new Error("Token not found");
            }

            // Try to load from cache first
            const cachedData = await AsyncStorage.getItem(BANNER_CACHE_KEY);
            const cacheExpiry = await AsyncStorage.getItem(BANNER_CACHE_EXPIRY_KEY);
            const now = new Date().getTime();

            // Use cache if valid and not expired
            if (cachedData && cacheExpiry && now < parseInt(cacheExpiry)) {
                //console.log('✅ Loading banners from cache');
                const cachedBanners = JSON.parse(cachedData);
                setBannerAds(cachedBanners);
                setupBannerData(cachedBanners);
                setLoadingBanners(false);
                return; // Exit early - don't fetch from API
            }

            // Fetch fresh data from backend
            console.log('🌐 Fetching fresh banner data from API');
            const response = await fetch(
                'https://lms-api.abisaio.com/api/v1/Microlearning/GetActiveMicrolearning',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();

            if (result.succeeded && result.data && result.data.length > 0) {
                // Transform API data to banner format
                const banners = result.data.map((item, index) => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.description,
                    colors: index % 2 === 0 ? ['#FF6B6B', '#FF8E53'] : ['#667eea', '#764ba2'],
                    microlearningData: item // Store the complete object for navigation
                }));

                // ✨ Cache the transformed banner data
                await AsyncStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(banners));

                // Set expiry time (24 hours from now)
                const expiryTime = now + (CACHE_DURATION_HOURS * 60 * 60 * 1000);
                await AsyncStorage.setItem(BANNER_CACHE_EXPIRY_KEY, expiryTime.toString());

                console.log('💾 Banner data cached successfully');

                setBannerAds(banners);
                setupBannerData(banners);
            } else {
                throw new Error(result.message || "No banner data available");
            }

        } catch (error) {
            console.log("❌ Microlearning fetch error:", error);

            // FALLBACK: Try to use expired cache if API fails
            try {
                const cachedData = await AsyncStorage.getItem(BANNER_CACHE_KEY);
                if (cachedData) {
                    console.log('⚠️ Using expired cache as fallback');
                    const cachedBanners = JSON.parse(cachedData);
                    setBannerAds(cachedBanners);
                    setupBannerData(cachedBanners);
                } else {
                    // No cache available
                    setBannerAds([]);
                    setExtendedBannerData([]);
                }
            } catch (cacheError) {
                console.log("❌ Cache fallback failed:", cacheError);
                setBannerAds([]);
                setExtendedBannerData([]);
            }
        } finally {
            setLoadingBanners(false);
        }
    };

    // Helper function to setup banner infinite scroll data
    const setupBannerData = (banners) => {
        if (banners.length > 0) {
            // Create extended array for infinite scroll
            const extended = [
                { ...banners[banners.length - 1], id: `clone-last-${banners[banners.length - 1].id}` },
                ...banners,
                { ...banners[0], id: `clone-first-${banners[0].id}` }
            ];
            setExtendedBannerData(extended);

            // Initialize scroll to first real item
            setTimeout(() => {
                if (bannerScrollRef.current) {
                    bannerScrollRef.current.scrollTo({
                        x: BANNER_WIDTH,
                        animated: false,
                    });
                    setBannerInitialized(true);
                }
            }, 100);
        }
    };

    fetchMicrolearningData();
}, []);


// Near the top of DashboardScreen, after imports
const clearBannerCache = async () => {
    try {
        await AsyncStorage.removeItem(BANNER_CACHE_KEY);
        await AsyncStorage.removeItem(BANNER_CACHE_EXPIRY_KEY);
        console.log('🗑️ Banner cache cleared');
    } catch (error) {
        console.log('❌ Error clearing banner cache:', error);
    }
};

const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
const [employeeID, setEmployeeID] = useState(null);
useEffect(() => {
    //console.log("Dashboard useEffect for employeeID triggered");
    const loadEmployeeID = async () => {
        try {
            const id = await AsyncStorage.getItem('employeeID');
            //console.log("EmployeeID loaded:", id);
            if (id) setEmployeeID(id);
        } catch (err) {
            console.log('Error loading employeeID', err);
        }
    };
    loadEmployeeID();
}, []);
const [activeNavSection, setActiveNavSection] = useState('leaderboard');

// Journey Map States
const [journeyData, setJourneyData] = useState(null);
const [loadingJourney, setLoadingJourney] = useState(true);
const [refreshingJourney, setRefreshingJourney] = useState(false);
const [errorJourney, setErrorJourney] = useState(null);
const [animatedSteps, setAnimatedSteps] = useState([]);
const [fadeAnims, setFadeAnims] = useState([]);
const [pulseAnims, setPulseAnims] = useState([]);
const [journeyRotateAnims, setJourneyRotateAnims] = useState([]);
const [bounceAnims, setBounceAnims] = useState([]);
const [glowAnims, setGlowAnims] = useState([]);

const confettiAnim = useRef(new Animated.Value(0)).current;
const flagWaveAnim = useRef(new Animated.Value(0)).current;
const starburstAnim = useRef(new Animated.Value(0)).current;
const celebrationScale = useRef(new Animated.Value(0)).current;

// Journey Map Functions
const startPulseAnimation = (anim) => {
    if (!anim) return;
    Animated.loop(
        Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }),
        ])
    ).start();
};

const startRotationAnimation = (anim) => {
    if (!anim) {
        console.warn('Animation value is undefined, skipping rotation animation');
        return;
    }
    Animated.loop(
        Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
        })
    ).start();
};

const startGlowAnimation = (anim) => {
    if (!anim) return;
    Animated.loop(
        Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }),
        ])
    ).start();
};

const fetchJourneyData = async () => {
    try {
        setLoadingJourney(true);
        setErrorJourney(null);

        const token = await AsyncStorage.getItem("token");
        if (!token) {
            console.log("Token not found in storage");
            setErrorJourney("Authentication token not found");
            setLoadingJourney(false);
            return;
        }

        const response = await axios.get(
            'https://lms-api.abisaio.com/api/v1/Journey/user-progress',
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                validateStatus: function (status) {
                    // Accept both success and 404 as valid responses
                    return (status >= 200 && status < 300) || status === 404;
                }
            }
        );

        // Handle 404 - No journey assigned
        if (response.status === 404 || !response.data.succeeded) {
            console.log("No journey assigned:", response.data.message || "User has no journey");
            // Reset to empty state
            setJourneyData(null);
            setFadeAnims([]);
            setPulseAnims([]);
            setJourneyRotateAnims([]);
            setBounceAnims([]);
            setGlowAnims([]);
            setErrorJourney(null); // Not an error, just no journey
            setLoadingJourney(false);
            return;
        }

        // Success case - Journey data found
        if (response.data.succeeded) {
            console.log("Journey data loaded successfully");
            setJourneyData(response.data);

            const total = response.data.totalAssigned || 0;
            console.log("Total assigned steps:", total);

            // Initialize animation arrays
            setFadeAnims(Array(total).fill(0).map(() => new Animated.Value(0)));
            setPulseAnims(Array(total).fill(0).map(() => new Animated.Value(0)));
            setJourneyRotateAnims(Array(total).fill(0).map(() => new Animated.Value(0)));
            setBounceAnims(Array(total).fill(0).map(() => new Animated.Value(0)));
            setGlowAnims(Array(total).fill(0).map(() => new Animated.Value(0)));

            setErrorJourney(null);
        }

    } catch (err) {
        // Only network errors or unexpected errors reach here
        console.log("Network/Unexpected error:", err.message);

        // Check if it's a network error
        if (err.code === 'ERR_NETWORK' || !err.response) {
            setErrorJourney('Network error. Please check your connection.');
        } else {
            setErrorJourney('Failed to fetch journey data. Please try again.');
        }

        // Reset data on error
        setJourneyData(null);
        setFadeAnims([]);
        setPulseAnims([]);
        setJourneyRotateAnims([]);
        setBounceAnims([]);
        setGlowAnims([]);

    } finally {
        setLoadingJourney(false);
    }
};

const onRefresh = async () => {
    setRefreshingJourney(true);
    await fetchJourneyData();
    setRefreshingJourney(false);
};

const renderStepIcon = (stepNumber, isCompleted, isActive, index) => {
    const pulseScale = pulseAnims[index]?.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.15],
    }) || 1;

    const rotateZ = journeyRotateAnims[index]?.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    }) || '0deg';

    const glowOpacity = glowAnims[index]?.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    }) || 0.5;

    if (isCompleted) {
        return (
            <Animated.View style={[
                styles.stepCircle,
                styles.completedCircle,
                {
                    transform: [
                        { scale: bounceAnims[index] || 1 },
                        { rotate: rotateZ }
                    ]
                }
            ]}>
                <Animated.View style={[
                    styles.glowRing,
                    styles.glowRingCompleted,
                    { opacity: glowOpacity }
                ]} />
                <View style={styles.sparkleContainer}>
                    <Animated.Text allowFontScaling={false} style={[
                        styles.sparkle,
                        { opacity: glowOpacity, transform: [{ rotate: '0deg' }] }
                    ]}>✨</Animated.Text>
                    <Animated.Text allowFontScaling={false} style={[
                        styles.sparkle,
                        { opacity: glowOpacity, transform: [{ rotate: '90deg' }] }
                    ]}>✨</Animated.Text>
                    <Animated.Text allowFontScaling={false} style={[
                        styles.sparkle,
                        { opacity: glowOpacity, transform: [{ rotate: '180deg' }] }
                    ]}>✨</Animated.Text>
                    <Animated.Text allowFontScaling={false} style={[
                        styles.sparkle,
                        { opacity: glowOpacity, transform: [{ rotate: '270deg' }] }
                    ]}>✨</Animated.Text>
                </View>
                <LinearGradient
                    colors={['#00d4aa', '#00a884', '#00d4aa']}
                    style={styles.gradientCircle}
                >
                    <Animated.Text allowFontScaling={false} style={[
                        styles.checkmark,
                        { transform: [{ scale: bounceAnims[index] || 1 }] }
                    ]}>✓</Animated.Text>
                </LinearGradient>
            </Animated.View>
        );
    }

    if (isActive) {
        return (
            <Animated.View style={[
                styles.stepCircle,
                { transform: [{ scale: bounceAnims[index] || 1 }] }
            ]}>
                <Animated.View style={[
                    styles.pulseRing,
                    styles.pulseRing1,
                    {
                        transform: [{ scale: pulseScale }],
                        opacity: pulseAnims[index]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.7, 0],
                        }) || 0.5
                    }
                ]} />
                <Animated.View style={[
                    styles.pulseRing,
                    styles.pulseRing2,
                    {
                        transform: [{
                            scale: pulseAnims[index]?.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.3],
                            }) || 1
                        }],
                        opacity: pulseAnims[index]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 0],
                        }) || 0.3
                    }
                ]} />
                <Animated.View style={[
                    styles.glowRing,
                    styles.glowRingActive,
                    { opacity: glowOpacity }
                ]} />
                <LinearGradient
                    colors={['#6c5ce7', '#5448c8', '#a44aff']}
                    style={styles.gradientCircle}
                >
                    <Animated.Text allowFontScaling={false} style={[
                        styles.stepNumber,
                        { transform: [{ scale: pulseScale }] }
                    ]}>{stepNumber + 1}</Animated.Text>
                </LinearGradient>
                <Animated.View style={[
                    styles.progressRing,
                    {
                        opacity: pulseAnims[index]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.5],
                        }) || 0.7
                    }
                ]} />
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[
            styles.stepCircle,
            styles.inactiveCircle,
            { transform: [{ scale: bounceAnims[index] || 1 }] }
        ]}>
            <Text allowFontScaling={false} style={styles.stepNumberInactive}>{stepNumber + 1}</Text>
            <View style={styles.lockOverlay}>
                <Text allowFontScaling={false} style={styles.lockIcon}>🔒</Text>
            </View>
        </Animated.View>
    );
};

const renderConnectingLine = (index, isCompleted, isLeft) => {
    const lineProgress = fadeAnims[index]?.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 60],
    }) || 0;

    const scaleY = lineProgress.interpolate({
        inputRange: [0, 60],
        outputRange: [0, 1],
    });

    const translateY = Animated.multiply(-30, Animated.subtract(1, scaleY));

    return (
        <Animated.View style={[
            styles.connectingLine,
            isLeft ? styles.lineToLeft : styles.lineToRight,
            {
                transform: [
                    { scaleY },
                    { translateY }
                ]
            }
        ]}>
            {isCompleted ? (
                <>
                    <LinearGradient
                        colors={['#00d4aa', '#00a884']}
                        style={styles.lineGradient}
                    />
                    <Animated.View style={[
                        styles.flowingParticle,
                        {
                            opacity: glowAnims[index]?.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1],
                            }) || 0.7
                        }
                    ]} />
                </>
            ) : (
                <View style={styles.dashedLine} />
            )}
        </Animated.View>
    );
};

const renderPath = () => {
    if (!journeyData) return null;

    const steps = [];
    const totalSteps = journeyData.totalAssigned;

    for (let i = 0; i < totalSteps; i++) {
        const isCompleted = i < journeyData.completed;
        const isActive = i === journeyData.completed;
        const isVisible = animatedSteps.includes(i);
        const isLeft = i % 2 === 0;

        if (!isVisible) continue;

        const translateX = fadeAnims[i]?.interpolate({
            inputRange: [0, 1],
            outputRange: [isLeft ? -80 : 80, 0]
        }) || 0;

        steps.push(
            <Animated.View
                key={i}
                style={[
                    styles.stepContainer,
                    {
                        opacity: fadeAnims[i] || 0,
                        transform: [{ translateX }]
                    }
                ]}
            >
                {i > 0 && renderConnectingLine(i, isCompleted, isLeft)}
                <View style={[
                    styles.stepContent,
                    isLeft ? styles.stepLeft : styles.stepRight
                ]}>
                    {isLeft ? (
                        <>
                            <Animated.View style={[
                                styles.stepInfo,
                                isActive && styles.stepInfoActive,
                                isCompleted && styles.stepInfoCompleted,
                                {
                                    transform: [{ scale: bounceAnims[i] || 1 }]
                                }
                            ]}>
                                <View style={styles.stepHeader}>
                                    <Text allowFontScaling={false} style={[
                                        styles.stepTitle,
                                        isCompleted && styles.completedText
                                    ]}>
                                        Task {i + 1}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        isCompleted && styles.statusBadgeCompleted,
                                        isActive && styles.statusBadgeActive
                                    ]}>
                                        <Text allowFontScaling={false} style={styles.statusText}>
                                            {isCompleted ? '✓ Done' : isActive ? '⚡ Active' : '🔒 Locked'}
                                        </Text>
                                    </View>
                                </View>
                                <Text allowFontScaling={false} style={styles.stepDescription}>
                                    {isCompleted
                                        ? 'Successfully completed! Great work!'
                                        : isActive
                                            ? 'You are here! Keep going!'
                                            : 'Complete previous steps to unlock'}
                                </Text>

                            </Animated.View>
                            {renderStepIcon(i, isCompleted, isActive, i)}
                        </>
                    ) : (
                        <>
                            {renderStepIcon(i, isCompleted, isActive, i)}
                            <Animated.View style={[
                                styles.stepInfo,
                                isActive && styles.stepInfoActive,
                                isCompleted && styles.stepInfoCompleted,
                                {
                                    transform: [{ scale: bounceAnims[i] || 1 }]
                                }
                            ]}>
                                <View style={styles.stepHeader}>
                                    <Text allowFontScaling={false} style={[
                                        styles.stepTitle,
                                        isCompleted && styles.completedText
                                    ]}>
                                        Task {i + 1}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        isCompleted && styles.statusBadgeCompleted,
                                        isActive && styles.statusBadgeActive
                                    ]}>
                                        <Text allowFontScaling={false} style={styles.statusText}>
                                            {isCompleted ? '✓ Done' : isActive ? '⚡ Active' : '🔒 Locked'}
                                        </Text>
                                    </View>
                                </View>
                                <Text allowFontScaling={false} style={styles.stepDescription}>
                                    {isCompleted
                                        ? 'Successfully completed! Great work!'
                                        : isActive
                                            ? 'You are here! Keep going!'
                                            : 'Complete previous steps to unlock'}
                                </Text>

                            </Animated.View>
                        </>
                    )}
                </View>
            </Animated.View>
        );
    }

    return steps;
};

const renderFinishFlag = () => {
    if (!journeyData) return null;

    const allCompleted = journeyData.completed === journeyData.totalAssigned;
    const isVisible = animatedSteps.length === journeyData.totalAssigned;

    if (!isVisible) return null;

    const waveRotation = flagWaveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-5deg', '5deg'],
    });

    const confettiY = confettiAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 600],
    });

    const starburstScale = starburstAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2],
    });

    const starburstOpacity = starburstAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
    });

    return (
        <Animated.View style={[
            styles.finishContainer,
            {
                opacity: fadeAnims[journeyData.totalAssigned - 1] || 1,
            }
        ]}>
            <View style={[
                styles.flagPole,
                allCompleted && styles.flagPoleActive
            ]} />
            <Animated.View style={[
                styles.flag,
                allCompleted && styles.flagActive,
                allCompleted && { transform: [{ rotate: waveRotation }] }
            ]}>
                {allCompleted ? (
                    <LinearGradient
                        colors={['#ffd700', '#ffed4e', '#ffd700']}
                        style={styles.flagGradient}
                    >
                        <Text allowFontScaling={false} style={styles.flagText}>🏆 Journey Complete! 🏆</Text>
                    </LinearGradient>
                ) : (
                    <Text allowFontScaling={false} style={styles.flagTextInactive}>🏁 Finish Line</Text>
                )}
            </Animated.View>

            {allCompleted && (
                <>
                    <Animated.View style={[
                        styles.starburst,
                        {
                            transform: [{ scale: starburstScale }],
                            opacity: starburstOpacity,
                        }
                    ]}>
                        <Text allowFontScaling={false} style={styles.starburstText}>⭐</Text>
                    </Animated.View>
                    <Animated.View style={[
                        styles.confettiContainer,
                        { transform: [{ translateY: confettiY }] }
                    ]}>
                        <Text allowFontScaling={false} style={styles.confetti}>🎉</Text>
                        <Text allowFontScaling={false} style={[styles.confetti, { left: 30 }]}>🎊</Text>
                        <Text allowFontScaling={false} style={[styles.confetti, { left: 60 }]}>✨</Text>
                        <Text allowFontScaling={false} style={[styles.confetti, { left: 90 }]}>🎉</Text>
                        <Text allowFontScaling={false} style={[styles.confetti, { left: 120 }]}>🎊</Text>
                        <Text allowFontScaling={false} style={[styles.confetti, { left: 150 }]}>✨</Text>
                    </Animated.View>
                    <Animated.View style={[
                        styles.celebration,
                        { transform: [{ scale: celebrationScale }] }
                    ]}>
                        <Text allowFontScaling={false} style={styles.celebrationText}>✨ 🎊 ✨ 🎉 ✨ 🎊 ✨</Text>
                        <Text allowFontScaling={false} style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
                        <Text allowFontScaling={false} style={styles.congratsSubtext}>
                            You've completed all {journeyData.totalAssigned} tasks
                        </Text>
                        <Text allowFontScaling={false} style={styles.congratsSubtext2}>
                            Amazing work! You're a learning champion! 🌟
                        </Text>
                    </Animated.View>
                </>
            )}
        </Animated.View>
    );
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const [alertVisible, setAlertVisible] = useState(false);
const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    onConfirm: () => { },
    onCancel: () => { }
});
const alertScaleAnim = useRef(new Animated.Value(0)).current;
const alertFadeAnim = useRef(new Animated.Value(0)).current;
const alertSlideAnim = useRef(new Animated.Value(50)).current;
const alertIconRotate = useRef(new Animated.Value(0)).current;
const alertIconPulse = useRef(new Animated.Value(1)).current;
const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress
} = useDrawer(0);
const {
    selectedTab,
    tabScaleAnims,
    rotateAnims,
    handleTabPress
} = useBottomNav('Dashboard');
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(50)).current;
const statsCardAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
const tabButtonAnims = useRef([...Array(3)].map(() => new Animated.Value(1))).current;
const podiumAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
const leaderboardItemAnims = useRef([...Array(10)].map(() => new Animated.Value(0))).current;
const pulseAnim = useRef(new Animated.Value(1)).current;
const glowAnim = useRef(new Animated.Value(0)).current;





const showCustomAlert = (type, title, message, onConfirm = () => { }, showCancel = false, onCancel = () => { }) => {
    setAlertConfig({ type, title, message, showCancel, onConfirm, onCancel });
    setAlertVisible(true);
};
useEffect(() => {
    if (alertVisible) {
        alertIconRotate.setValue(0);
        alertIconPulse.setValue(1);
        Animated.parallel([
            Animated.spring(alertScaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(alertFadeAnim, {
                toValue: 1,
                duration: 300,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.spring(alertSlideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(alertIconRotate, {
                toValue: 1,
                duration: 600,
                easing: Easing.elastic(1),
                useNativeDriver: true,
            }),
        ]).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(alertIconPulse, {
                    toValue: 1.1,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
                Animated.timing(alertIconPulse, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.ease,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    } else {
        Animated.parallel([
            Animated.timing(alertScaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(alertFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }
}, [alertVisible]);
const getAlertStyle = () => {
    switch (alertConfig.type) {
        case 'success':
            return { icon: 'checkmark-circle', colors: ['#4CAF50', '#45a049'], iconBg: '#E8F5E9' };
        case 'error':
            return { icon: 'close-circle', colors: ['#f44336', '#d32f2f'], iconBg: '#FFEBEE' };
        case 'warning':
            return { icon: 'warning', colors: ['#ff9800', '#f57c00'], iconBg: '#FFF3E0' };
        case 'confirm':
            return { icon: 'help-circle', colors: ['#9B7EBD', '#280137'], iconBg: '#F3E5F5' };
        default:
            return { icon: 'information-circle', colors: ['#2196F3', '#1976D2'], iconBg: '#E3F2FD' };
    }
};
const handleAlertConfirm = () => {
    setAlertVisible(false);
    setTimeout(() => {
        alertConfig.onConfirm();
    }, 300);
};
const handleAlertCancel = () => {
    setAlertVisible(false);
    setTimeout(() => {
        alertConfig.onCancel();
    }, 300);
};
useEffect(() => {
    const backAction = () => {
        showCustomAlert(
            'confirm',
            'Confirm Logout',
            'Do you really want to log out?',
            () => {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            },
            true,
            () => { }
        );
        return true;
    };
    const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
    );
    return () => backHandler.remove();
}, [navigation]);



// Animate steps with staggered entrance
useEffect(() => {
    if (journeyData && fadeAnims.length > 0) {
        const steps = Array.from({ length: journeyData.totalAssigned }, (_, i) => i);

        steps.forEach((step, index) => {
            setTimeout(() => {
                setAnimatedSteps(prev => [...prev, step]);

                const isCompleted = index < journeyData.completed;
                const isActive = index === journeyData.completed;

                // Entrance animation
                Animated.parallel([
                    Animated.spring(fadeAnims[index], {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.spring(bounceAnims[index], {
                            toValue: 1.2,
                            tension: 100,
                            friction: 3,
                            useNativeDriver: true,
                        }),
                        Animated.spring(bounceAnims[index], {
                            toValue: 1,
                            tension: 50,
                            friction: 7,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start();

                // Start continuous animations based on state
                if (isActive) {
                    startPulseAnimation(pulseAnims[index]);
                    startGlowAnimation(glowAnims[index]);
                }

                if (isCompleted) {
                    startRotationAnimation(rotateAnims[index]);
                    startGlowAnimation(glowAnims[index]);
                }
            }, index * 400);
        });
    }
}, [journeyData, fadeAnims]);

// Celebration animation when all complete
useEffect(() => {
    if (journeyData && journeyData.completed === journeyData.totalAssigned && animatedSteps.length === journeyData.totalAssigned) {
        setTimeout(() => {
            // Flag wave
            Animated.loop(
                Animated.sequence([
                    Animated.timing(flagWaveAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.sine),
                        useNativeDriver: true,
                    }),
                    Animated.timing(flagWaveAnim, {
                        toValue: 0,
                        duration: 1000,
                        easing: Easing.inOut(Easing.sine),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Confetti rain
            Animated.loop(
                Animated.timing(confettiAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // Starburst
            Animated.loop(
                Animated.sequence([
                    Animated.timing(starburstAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(starburstAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Celebration scale pop
            Animated.sequence([
                Animated.spring(celebrationScale, {
                    toValue: 1.1,
                    tension: 50,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.spring(celebrationScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 500);
    }
}, [journeyData, animatedSteps]);

useEffect(() => {
    if (!isLoading && dashboardData) {
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
        statsCardAnims.forEach((anim, index) => {
            setTimeout(() => {
                Animated.spring(anim, {
                    toValue: 1,
                    tension: 40,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
            }, index * 150);
        });
        podiumAnims.forEach((anim, index) => {
            setTimeout(() => {
                Animated.spring(anim, {
                    toValue: 1,
                    tension: 30,
                    friction: 6,
                    useNativeDriver: true,
                }).start();
            }, 300 + index * 200);
        });
        // Animate leaderboard items (start from 0, delay increases per item)
        leaderboardItemAnims.forEach((anim, index) => {
            // Reset animation to 0 before starting
            anim.setValue(0);
            setTimeout(() => {
                Animated.spring(anim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
            }, 800 + index * 100);
        });
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }
}, [isLoading, dashboardData]);
const getStatsData = () => [
    {
        label: 'Total Points',
        value: dashboardData?.points?.toString() ?? '0',
        icon: 'trophy',
        color: ['#FFD700', '#FFA500']
    },
    {
        label: 'Training Hours',
        value: dashboardData?.trainingHours ? `${dashboardData.trainingHours} hrs` : '0 hrs',
        icon: 'time-outline',
        color: ['#667eea', '#764ba2']
    },
    {
        label: 'Trainings\nCompleted',
        value: dashboardData?.completedCount?.toString() ?? '0',
        icon: 'checkmark-circle',
        color: ['#4ECDC4', '#44A08D']
    },
    {
        label: 'Upcoming\nTrainings',
        value: dashboardData?.upcomingTrainings?.length?.toString() ?? '0',
        icon: 'notifications-outline',
        color: ['#f093fb', '#f5576c']
    },
];
const statsData = getStatsData();

const getColorByRank = (rank) => {
    switch (rank) {
        case 1:
            return ['#FFD700', '#FFA500'];
        case 2:
            return ['#C0C0C0', '#A8A8A8'];
        case 3:
            return ['#CD7F32', '#A0522D'];
        default:
            return rank % 2 === 0 ? ['#667eea', '#764ba2'] : ['#f093fb', '#f5576c'];
    }
};
const getMedalByRank = (rank) => {
    switch (rank) {
        case 1:
            return '🥇';
        case 2:
            return '🥈';
        case 3:
            return '🥉';
        default:
            return '';
    }
};
const leaderboardData = dashboardData?.top10Employees ? dashboardData.top10Employees.map((employee) => ({
    rank: employee.rank,
    name: employee.userName,
    points: `${employee.points} pt`,
    pointsValue: employee.points,
    employeeId: employee.employeeId,
    color: getColorByRank(employee.rank),
    medal: getMedalByRank(employee.rank)
})) : null;
const handlePeriodPress = (period, index) => {
    setSelectedPeriod(period);
    Animated.sequence([
        Animated.spring(tabButtonAnims[index], {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
        }),
        Animated.spring(tabButtonAnims[index], {
            toValue: 1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
        }),
    ]).start();
};
const handleStatsPress = (index) => {
    Animated.sequence([
        Animated.spring(statsCardAnims[index], {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
        }),
        Animated.spring(statsCardAnims[index], {
            toValue: 1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
        }),
    ]).start();
};
const handleNavSectionPress = (section, index) => {
    setActiveNavSection(section);
    if (horizontalScrollRef.current) {
        horizontalScrollRef.current.scrollTo({
            x: index * (width - 30),
            animated: true,
        });
    }
};
const handleHorizontalScroll = (event) => {
    if (isBannerInteracting || isProgrammaticScroll) return; // keep early exit
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const sectionIndex = Math.round(scrollPosition / (width - 30));
    const sections = ['learning', 'leaderboard', 'pending'];
    if (sections[sectionIndex] && sections[sectionIndex] !== activeNavSection) {
        setActiveNavSection(sections[sectionIndex]);
    }
};

// Scroll to leaderboard section on component mount
useEffect(() => {
    setTimeout(() => {
        setIsProgrammaticScroll(true);
        if (horizontalScrollRef.current) {
            horizontalScrollRef.current.scrollTo({
                x: 1 * (width - 30),
                animated: false,
            });
        }
        setTimeout(() => setIsProgrammaticScroll(false), 300);
    }, 100);
}, []);
useEffect(() => {
    if (bannerAds.length > 0 && !bannerInitialized) {
        const extended = [
            bannerAds[bannerAds.length - 1], // Clone last
            ...bannerAds, // Original items
            bannerAds[0], // Clone first
        ];
        setExtendedBannerData(extended);

        // Start at first real item
        setTimeout(() => {
            bannerScrollRef.current?.scrollTo({
                x: BANNER_WIDTH,
                animated: false,
            });
            setBannerInitialized(true);
        }, 100);
    }
}, [bannerAds]);

useEffect(() => {
    if (!bannerInitialized || bannerAds.length === 0) {
        return;
    }

    // Clear existing interval
    if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
    }

    const timeoutId = setTimeout(() => {
        autoScrollInterval.current = setInterval(() => {
            // Don't auto-scroll if user is interacting
            if (isBannerInteracting) return;

            // Increment to next banner
            bannerScrollIndexRef.current++;

            // If we've scrolled past the last real banner, reset to first
            if (bannerScrollIndexRef.current > bannerAds.length) {
                bannerScrollIndexRef.current = 1; // Reset ref immediately
                // Scroll to first real banner
                bannerScrollRef.current?.scrollTo({
                    x: BANNER_WIDTH,
                    animated: false, // No animation for the reset
                });
                return; // Exit early, next interval will continue from banner 1
            }

            // Calculate scroll position for normal progression
            const scrollToX = bannerScrollIndexRef.current * BANNER_WIDTH;

            bannerScrollRef.current?.scrollTo({
                x: scrollToX,
                animated: true,
            });
        }, 10000); // 3 seconds
    }, 500);

    return () => {
        clearTimeout(timeoutId);
        if (autoScrollInterval.current) {
            clearInterval(autoScrollInterval.current);
            autoScrollInterval.current = null;
        }
    };
}, [bannerInitialized, isBannerInteracting, bannerAds.length]);


// Call fetchJourneyData on component mount
useEffect(() => {
    fetchJourneyData();
}, []);

useEffect(() => {
    if (journeyData) {
        console.log('JOURNEY HEADER DATA =>', journeyData.journey.name, journeyData.journey.startDate, journeyData.journey.endDate);
    }
}, [journeyData]);



const LearningJourneySection = () => {
    return (
        <View>
            {/* ⭐ Journey header ABOVE container */}
            <View style={styles.journeyHeaderTop}>
                <Text allowFontScaling={false} style={styles.journeyNameTop}>
                    {journeyData?.journey?.name || 'Journey'}
                </Text>
                <Text allowFontScaling={false} style={styles.journeyDatesTop}>
                    Start: {journeyData?.journey?.startDate ? formatDate(journeyData.journey.startDate) : '-'}
                    {'  |  '}
                    End: {journeyData?.journey?.endDate ? formatDate(journeyData.journey.endDate) : '-'}
                </Text>
            </View>

            {/* ⭐ Your existing Ljmap container */}
            <Ljmap
                journeyData={journeyData}
            /* other props you already pass */
            />
        </View>

    );
};
// LEADERBOARD SECTION
const LeaderboardSection = () => (
    <ScrollView
        style={styles.sectionScrollView}
        showsVerticalScrollIndicator={false}
    >
        {/* Banner Section - Only visible in Leaderboard */}
        <View style={[styles.bannerSection, { marginHorizontal: 15, marginBottom: 20 }]}>

            <ScrollView
                ref={bannerScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                onScrollBeginDrag={handleBannerScrollBeginDrag}
                onScrollEndDrag={handleBannerScrollEndDrag}
                onMomentumScrollEnd={handleBannerMomentumEnd}    // use the corrected function above
                scrollEventThrottle={16}
                snapToInterval={BANNER_WIDTH}
                snapToAlignment="start"
                decelerationRate="fast"
                pagingEnabled={false}  // keep snapToInterval for consistent snapping at BANNER_WIDTH
            >
                {extendedBannerData.map((ad, index) => (
                    <TouchableOpacity
                        key={`banner-${index}`}
                        style={styles.bannerCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('MicroLearning', { microlearning: ad.microlearningData })}
                    >
                        <LinearGradient
                            colors={ad.colors}
                            style={styles.bannerGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.bannerTextContainer}>
                                <Text allowFontScaling={false} style={styles.bannerTitle}>{ad.title}</Text>
                                <Text allowFontScaling={false} style={styles.bannerSubtitle} numberOfLines={1} ellipsizeMode="tail">
                                    {ad.subtitle}
                                </Text>

                                <Text allowFontScaling={false} style={styles.readMoreText}>Read more ...</Text>

                            </View>
                            <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/*<View style={styles.paginationContainer}>
                    {bannerAds.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.paginationDot,
                                currentBannerIndex === index && styles.paginationDotActive
                            ]}
                        />
                    ))}
                </View> */}
        </View>

        <View style={[styles.podiumContainer, { marginTop: 30 }]}>
            {!leaderboardData || leaderboardData.length < 3 ? (
                <View style={styles.emptyContainer}>
                    <Text allowFontScaling={false} style={styles.emptyText}>Leaderboard data not available</Text>
                </View>
            ) : (
                <>
                    <Animated.View
                        style={[
                            styles.podiumItem,
                            styles.secondPlace,
                            {
                                transform: [{
                                    scale: podiumAnims[1].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    }),
                                }],
                                opacity: podiumAnims[1],
                            },
                        ]}
                    >
                        <Text allowFontScaling={false} style={styles.podiumName}>{leaderboardData[1].name}</Text>
                        <Text allowFontScaling={false} style={styles.podiumPoints}>{leaderboardData[1].points}</Text>
                        <LinearGradient
                            colors={leaderboardData[1].color}
                            style={[styles.podiumBase, { height: 80 }]}
                        >
                            <Text allowFontScaling={false} style={styles.podiumMedal}>{leaderboardData[1].medal}</Text>
                        </LinearGradient>
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.podiumItem,
                            styles.firstPlace,
                            {
                                transform: [{
                                    scale: Animated.multiply(
                                        podiumAnims[0].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1],
                                        }),
                                        pulseAnim
                                    ),
                                }],
                                opacity: podiumAnims[0],
                            },
                        ]}
                    >
                        <Text allowFontScaling={false} style={[styles.podiumName, styles.firstPlaceName]}>{leaderboardData[0].name}</Text>
                        <Text allowFontScaling={false} style={styles.podiumPoints}>{leaderboardData[0].points}</Text>
                        <LinearGradient
                            colors={leaderboardData[0].color}
                            style={[styles.podiumBase, { height: 100 }]}
                        >
                            <Text allowFontScaling={false} style={styles.podiumMedal}>{leaderboardData[0].medal}</Text>
                        </LinearGradient>
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.podiumItem,
                            styles.thirdPlace,
                            {
                                transform: [{
                                    scale: podiumAnims[2].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    }),
                                }],
                                opacity: podiumAnims[2],
                            },
                        ]}
                    >
                        <Text allowFontScaling={false} style={styles.podiumName}>{leaderboardData[2].name}</Text>
                        <Text allowFontScaling={false} style={styles.podiumPoints}>{leaderboardData[2].points}</Text>
                        <LinearGradient
                            colors={leaderboardData[2].color}
                            style={[styles.podiumBase, { height: 60 }]}
                        >
                            <Text allowFontScaling={false} style={styles.podiumMedal}>{leaderboardData[2].medal}</Text>
                        </LinearGradient>
                    </Animated.View>
                </>
            )}
        </View>
        <Text allowFontScaling={false} style={[styles.sectionTitle, { paddingHorizontal: 15, marginBottom: 10, marginTop: 0 }]}>🏅 Rankings</Text>
        <View style={styles.leaderboardList}>
            {!leaderboardData || leaderboardData.length <= 3 ? (
                <View style={styles.emptyContainer}>
                    <Text allowFontScaling={false} style={styles.emptyText}>No additional leaderboard entries available</Text>
                </View>
            ) : (
                <>
                    {leaderboardData.slice(3).map((user, index) => {
                        const actualIndex = index + 3;
                        const anim = leaderboardItemAnims[actualIndex];
                        const scale = anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                        });
                        const translateX = anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                        });
                        const opacity = anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                        });

                        // Match using employeeId from API with sapid from AsyncStorage
                        const isCurrentUser = user.employeeId?.toString() === sapId?.toString();

                        return (
                            <Animated.View
                                key={user.rank}
                                style={[
                                    styles.leaderboardItem,
                                    {
                                        transform: [{ translateX }, { scale }],
                                        opacity,
                                        borderWidth: isCurrentUser ? 2 : 0,
                                        borderColor: isCurrentUser ? '#7B68EE' : 'transparent',
                                    },
                                ]}
                            >
                                <View style={styles.leaderboardItemContent}>
                                    <LinearGradient
                                        colors={
                                            isCurrentUser
                                                ? ['rgba(123,104,238,0.35)', 'rgba(123,104,238,0.15)']
                                                : ['rgba(123,104,238,0.1)', 'rgba(123,104,238,0.05)']
                                        }
                                        style={[
                                            styles.leaderboardItemGradient,
                                            isCurrentUser && { borderColor: '#7B68EE' }
                                        ]}
                                    >
                                        <View style={styles.leaderboardLeft}>
                                            <View
                                                style={[
                                                    styles.rankCircle,
                                                    isCurrentUser && { backgroundColor: '#7B68EE' }
                                                ]}
                                            >
                                                <Text allowFontScaling={false} style={styles.rankCircleText}>{user.rank}</Text>
                                            </View>
                                            <Text allowFontScaling={false}
                                                style={[
                                                    styles.leaderboardName,
                                                    isCurrentUser && { color: '#7B68EE', fontWeight: '800' }
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                            >
                                                {user.name}
                                            </Text>
                                        </View>
                                        <Text allowFontScaling={false}
                                            style={[
                                                styles.leaderboardPoints,
                                                isCurrentUser && { color: '#fff' }
                                            ]}
                                        >
                                            {user.points}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            </Animated.View>
                        );
                    })}

                    {/* Display current user's rank if not in top 10 */}
                    {dashboardData?.userRank && dashboardData.userRank > 10 && (
                        <>
                            <View style={{ paddingHorizontal: 15, marginVertical: 15, alignItems: 'center' }}>
                                <Text allowFontScaling={false} style={{ color: '#a8b2d1', fontSize: 12 }}>• • •</Text>
                            </View>
                            <View
                                style={[
                                    styles.leaderboardItem,
                                    {
                                        borderWidth: 2,
                                        borderColor: '#7B68EE',
                                    },
                                ]}
                            >
                                <View style={styles.leaderboardItemContent}>
                                    <LinearGradient
                                        colors={['rgba(123,104,238,0.35)', 'rgba(123,104,238,0.15)']}
                                        style={[
                                            styles.leaderboardItemGradient,
                                            { borderColor: '#7B68EE' }
                                        ]}
                                    >
                                        <View style={styles.leaderboardLeft}>
                                            <View
                                                style={[
                                                    styles.rankCircle,
                                                    { backgroundColor: '#7B68EE' }
                                                ]}
                                            >
                                                <Text allowFontScaling={false} style={styles.rankCircleText}>{dashboardData.userRank}</Text>
                                            </View>
                                            <Text allowFontScaling={false}
                                                style={[
                                                    styles.leaderboardName,
                                                    { color: '#7B68EE', fontWeight: '800' }
                                                ]}
                                                numberOfLines={2}
                                                ellipsizeMode="tail"
                                            >
                                                {userName || 'You'}
                                            </Text>
                                        </View>
                                        <Text allowFontScaling={false}
                                            style={[
                                                styles.leaderboardPoints,
                                                { color: '#fff' }
                                            ]}
                                        >
                                            {dashboardData.points} pt
                                        </Text>
                                    </LinearGradient>
                                </View>
                            </View>
                        </>
                    )}
                </>
            )}
        </View>
        <View style={{ height: 40 }} />
    </ScrollView>
);
// PENDING ACTIONS SECTION
//     const PendingActionsSection = () => {


//     const handlePress = async (id) => {
//         try {
//             const employeeID = await AsyncStorage.getItem("employeeID");

//             navigation.navigate("TrainingDetails", {
//                 trainingSessionId: id,
//                 employeeID: employeeID,
//                 from: "TrainingSession",
//             });
//         } catch (err) {
//             console.log("Navigation error:", err);
//         }
//     };

//     return (
//         <ScrollView
//             style={styles.sectionScrollView}
//             showsVerticalScrollIndicator={false}
//         >
//             {dashboardData?.pendingActions && dashboardData.pendingActions.length > 0 ? (
//                 dashboardData.pendingActions.map((p) => (
//                     <TouchableOpacity
//                         key={p.id}
//                         style={styles.modalListItem}
//                         onPress={() => handlePress(p.id)}
//                     >
//                         <Text allowFontScaling={false} style={styles.modalItemTitle}>
//                             {p.title}  
//                             <Text allowFontScaling={false} style={{ fontSize: 12, color: '#a8b2d1' }}>
//                                 ({p.type})
//                             </Text>
//                         </Text>

//                         <Text allowFontScaling={false} style={styles.modalItemSub}>
//                             Training: {new Date(p.trainingDate).toLocaleString()}
//                         </Text>

//                         <Text allowFontScaling={false} style={styles.modalItemSub}>
//                             Due: {new Date(p.dueDate).toLocaleString()}
//                         </Text>
//                     </TouchableOpacity>
//                 ))
//             ) : (
//                 <View style={styles.emptyContainer}>
//                     <Text allowFontScaling={false} style={styles.emptyText}>No pending actions</Text>
//                 </View>
//             )}

//             <View style={{ height: 40 }} />
//         </ScrollView>
//     );
// };

// PENDING ACTIONS SECTION
const PendingActionsSection = () => {

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy format
        const formattedTime = date.toLocaleTimeString(); // keeps current time format
        return `${formattedDate} ${formattedTime}`;
    };

    const handlePress = async (id) => {
        try {
            const employeeID = await AsyncStorage.getItem("employeeID");

            navigation.navigate("TrainingDetails", {
                trainingSessionId: id,
                employeeID: employeeID,
                from: "TrainingSession",
            });
        } catch (err) {
            console.log("Navigation error:", err);
        }
    };

    return (
        <ScrollView
            style={styles.sectionScrollView}
            showsVerticalScrollIndicator={false}
        >
            {dashboardData?.pendingActions && dashboardData.pendingActions.length > 0 ? (
                dashboardData.pendingActions.map((p) => (
                    <TouchableOpacity
                        key={p.id}
                        style={styles.modalListItem}
                        onPress={() => handlePress(p.id)}
                    >
                        <Text allowFontScaling={false} style={styles.modalItemTitle}>
                            {p.title}
                            <Text allowFontScaling={false} style={{ fontSize: 12, color: '#a8b2d1' }}>
                                ({p.type})
                            </Text>
                        </Text>

                        <Text allowFontScaling={false} style={styles.modalItemSub}>
                            Training: {formatDateTime(p.trainingDate)}
                        </Text>

                        <Text allowFontScaling={false} style={styles.modalItemSub}>
                            Due: {formatDateTime(p.dueDate)}
                        </Text>
                    </TouchableOpacity>
                ))
            ) : (
                <View style={styles.emptyContainer}>
                    <Text allowFontScaling={false} style={styles.emptyText}>No pending actions</Text>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const alertStyle = getAlertStyle();
const alertIconRotateInterpolate = alertIconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
});
return (

    <>
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
                <Header title="Dashboard" onMenuPress={toggleDrawer} onNotificationPress={openNotification} />
                <Animated.View style={[styles.welcomeSection, { transform: [{ translateY: slideAnim }] }]}>
                    <Text allowFontScaling={false} style={styles.welcomeText}>Hello {userName ? userName : 'User'}</Text>

                    <TextTicker
                        style={{ fontSize: 13, color: '#a8b2d1' }}
                        duration={15000}
                        loop
                        bounce={false}
                        repeatSpacer={50}
                        marqueeDelay={1000}
                        allowFontScaling={false}
                    >
                        M: Managing Change, IN: Fostering Innovation, D: Developing Others, S: Strategical/Analytical Thinking, E: Entrepreneurship Orientation, T: Digital Transformation
                    </TextTicker>

                </Animated.View>

                <ScrollView
                    style={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={() => {
                                const currentDate = new Date();




                                const fetchData = async () => {
                                    try {
                                        setIsLoading(true);
                                        const employeeID = await AsyncStorage.getItem("employeeID");
                                        const applicationProfile = await AsyncStorage.getItem("applicationProfile");
                                        const token = await AsyncStorage.getItem("token");
                                        if (!employeeID || !applicationProfile || !token) {
                                            throw new Error("Required user data not found");
                                        }
                                        const apiUrl = `https://lms-api.abisaio.com/api/v1/Dashboard/GetDashboardData?UserID=${employeeID}&type=${applicationProfile}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`;
                                        const response = await fetch(apiUrl, {
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        });

                                        // If unauthorized, force logout flow
                                        if (response.status === 401) {
                                            throw new Error('UNAUTHORIZED');
                                        }

                                        if (!response.ok) {
                                            throw new Error("Failed to fetch dashboard data");
                                        }
                                        const result = await response.json();
                                        if (result.succeeded) {
                                            setDashboardData(result);
                                        } else {
                                            throw new Error(result.message || "Failed to fetch dashboard data");
                                        }
                                    } catch (error) {
                                        console.log("Dashboard refresh error:", error);
                                        setError(error.message);

                                        // If token/session expired, prompt logout-only dialog
                                        if (error?.message === 'UNAUTHORIZED' || (error?.message || '').toLowerCase().includes('unauthorized') || (error?.message || '').toLowerCase().includes('401')) {
                                            const handleForceLogout = async () => {
                                                try {
                                                    // clear relevant storage keys
                                                    await AsyncStorage.multiRemove(['token', 'employeeID', 'applicationProfile', 'sapid', 'userName']);
                                                } catch (e) {
                                                    console.warn('Error clearing storage during forced logout', e);
                                                }
                                                // Reset navigation to Login screen
                                                try {
                                                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                                                } catch (navErr) {
                                                    // fallback
                                                    navigation.navigate('Login');
                                                }
                                            };

                                            showCustomAlert(
                                                'info',
                                                'Logged out',
                                                'You have been logged out due to inactivity. Please login again.',
                                                handleForceLogout,
                                                false
                                            );
                                        } else {
                                            showCustomAlert(
                                                'error',
                                                'Error',
                                                error.message,
                                                () => { },
                                                false
                                            );
                                        }
                                    } finally {
                                        setIsLoading(false);
                                    }
                                };
                                fetchData();
                            }}
                            colors={['#7B68EE']}
                            tintColor="#7B68EE"
                        />
                    }>
                    <View style={styles.statsRow}>
                        {statsData.map((stat, index) => (
                            <Animated.View
                                key={stat.label}
                                style={[
                                    styles.statsCard,
                                    {
                                        transform: [{ scale: statsCardAnims[index] }],
                                        opacity: statsCardAnims[index],
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => handleStatsPress(index)}
                                    activeOpacity={0.9}
                                    style={{ flex: 1 }}
                                >
                                    <LinearGradient
                                        colors={stat.color}
                                        style={styles.statsCardGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <View style={styles.statsIcon}>
                                            <Ionicons name={stat.icon} size={28} color="#fff" />
                                        </View>
                                        <Text allowFontScaling={false} style={styles.statsValue}>{stat.value}</Text>
                                        <Text allowFontScaling={false} style={styles.statsLabel}>{stat.label}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>

                    <View style={styles.navTabsContainer}>
                        <TouchableOpacity
                            style={[styles.navTab, activeNavSection === 'learning' && styles.navTabActive]}
                            onPress={() => handleNavSectionPress('learning', 0)}
                            activeOpacity={0.90}
                        >
                            <View style={styles.navTabGradient}>
                                <Text allowFontScaling={false} style={styles.navTabText}>Learning Journey</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.navTab, activeNavSection === 'leaderboard' && styles.navTabActive]}
                            onPress={() => handleNavSectionPress('leaderboard', 1)}
                            activeOpacity={0.90}
                        >
                            <View style={styles.navTabGradient}>
                                <Text allowFontScaling={false} style={styles.navTabText}>Leaderboard</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.navTab, activeNavSection === 'pending' && styles.navTabActive]}
                            onPress={() => handleNavSectionPress('pending', 2)}
                            activeOpacity={0.90}
                        >
                            <View style={styles.navTabGradient}>
                                <Text allowFontScaling={false} style={styles.navTabText}>Pending Actions</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{
                        width: "100%",
                        paddingHorizontal: 15,   // left-right spacing
                        paddingBottom: 10        // bottom spacing
                    }}>
                        {activeNavSection === "learning" && <LearningJourneySection />}
                        {activeNavSection === "leaderboard" && <LeaderboardSection />}
                        {activeNavSection === "pending" && <PendingActionsSection />}
                    </View>


                    <View style={{ height: 100 }} />
                </ScrollView>
            </Animated.View>

            <NotificationModal />
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
        </View>
        <Modal
            transparent
            visible={alertVisible}
            animationType="none"
            onRequestClose={handleAlertCancel}
        >
            <TouchableWithoutFeedback onPress={alertConfig.showCancel ? handleAlertCancel : null}>
                <Animated.View style={[styles.alertOverlay, { opacity: alertFadeAnim }]}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.alertContainer,
                                {
                                    transform: [
                                        { scale: alertScaleAnim },
                                        { translateY: alertSlideAnim }
                                    ],
                                    opacity: alertFadeAnim,
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={alertStyle.colors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.alertTopBar}
                            />
                            <View style={styles.alertIconSection}>
                                <Animated.View
                                    style={[
                                        styles.alertIconContainer,
                                        {
                                            backgroundColor: alertStyle.iconBg,
                                            transform: [
                                                { rotate: alertIconRotateInterpolate },
                                                { scale: alertIconPulse }
                                            ],
                                        },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={alertStyle.colors}
                                        style={styles.alertIconGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons
                                            name={alertStyle.icon}
                                            size={45}
                                            color="#FFFFFF"
                                        />
                                    </LinearGradient>
                                </Animated.View>
                            </View>
                            <View style={styles.alertContent}>
                                {alertConfig.title && (
                                    <Text allowFontScaling={false} style={styles.alertTitle}>{alertConfig.title}</Text>
                                )}
                                {alertConfig.message && (
                                    <Text allowFontScaling={false} style={styles.alertMessage}>{alertConfig.message}</Text>
                                )}
                            </View>
                            <View style={styles.alertButtonContainer}>
                                {alertConfig.showCancel && (
                                    <TouchableOpacity
                                        style={styles.alertCancelButton}
                                        onPress={handleAlertCancel}
                                        activeOpacity={0.8}
                                    >
                                        <Text allowFontScaling={false} style={styles.alertCancelButtonText}>No</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.alertConfirmButtonWrapper, { flex: alertConfig.showCancel ? 1 : 1 }]}
                                    onPress={handleAlertConfirm}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={alertStyle.colors}
                                        style={styles.alertConfirmButton}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text allowFontScaling={false} style={styles.alertConfirmButtonText}>Yes</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    </>
);

export default DashboardScreen;
