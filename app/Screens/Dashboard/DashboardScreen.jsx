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
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import TextTicker from 'react-native-text-ticker';
import BottomNavigation from '../../Components/BottomNavigation';
import CustomDrawer from '../../Components/CustomDrawer';

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



const DashboardScreen = ({ navigation }) => {
    // Add this with your other refs
    const bannerScrollIndexRef = useRef(1); // Tracks current position in extended array

    const { openNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userName, setUserName] = useState("");


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
                const apiUrl = `https://lms-api-qa.abisaio.com/api/v1/Dashboard/GetDashboardData?UserID=${employeeID}&type=${applicationProfile}&year=${year}&month=${month}`;
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
                    'https://lms-api-qa.abisaio.com/api/v1/Microlearning/GetActiveMicrolearning',
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
                'https://lms-api-qa.abisaio.com/api/v1/Journey/user-progress',
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
                                            const apiUrl = `https://lms-api-qa.abisaio.com/api/v1/Dashboard/GetDashboardData?UserID=${employeeID}&type=${applicationProfile}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`;
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
                                            console.log("Dashboard refresh error:", error);
                                            setError(error.message);
                                            showCustomAlert(
                                                'error',
                                                'Error',
                                                error.message,
                                                () => { },
                                                false
                                            );
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
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    mainContent: {
        flex: 1,
    },
    welcomeSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    subText: {
        fontSize: 14,
        color: '#a8b2d1',
        fontStyle: 'italic',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 20,
        justifyContent: 'space-between',
        alignItems: 'stretch',
    },
    statsCard: {
        flex: 1,
        marginHorizontal: 5,
        minHeight: 120,
    },
    statsCardGradient: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 10,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        minHeight: 120,
    },
    statsIcon: {
        marginBottom: 8,
    },
    statsValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    statsLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 13,
    },
    navTabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 15,
        gap: 10,
    },

    navTabActive: {
        borderColor: '#7B68EE',
        backgroundColor: 'rgba(123, 104, 238, 0.2)',
    },
    navTab: {
        flex: 1,
        minHeight: 44,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'transparent',
    },

    navTabGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },

    navTabText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4, // a bit smaller so text has more room
        flexWrap: 'wrap',   // allow multiline
        includeFontPadding: false, // Android: reduce weird clipping
    },

    horizontalSectionContainer: {
        height: 1400,
        marginBottom: 20,
        backgroundColor: 'rgba(123, 104, 238, 0.05)',
        borderRadius: 16,
        marginHorizontal: 15,
    },
    horizontalSection: {
        width: width - 30,
        height: 1400,
        paddingHorizontal: 0,
    },
    journeyHeaderTop: {
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    journeyNameTop: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginBottom: 4,
    },
    journeyDatesTop: {
        fontSize: 12,
        color: '#555',
    },
    ljmapContainer: {
        width: '100%',
        height: 600,
        overflow: 'hidden',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionScrollView: {
        flex: 1,
        paddingHorizontal: 5,
        paddingTop: 10,
        paddingBottom: 20,
    },
    summarySection: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 15,
    },
    // ✅ FIXED BANNER STYLES
    bannerSection: {
        height: 140,
        marginBottom: 20,
    },
    bannerCard: {
        width: BANNER_WIDTH,
        paddingHorizontal: 10,
    },

    bannerGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        height: 120,
        borderRadius: 16,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bannerArrow: {
        padding: 5,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 6,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(123, 104, 238, 0.3)',
    },
    paginationDotActive: {
        width: 20,
        backgroundColor: '#7B68EE',
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 8,
        justifyContent: 'center',
        gap: 12,
    },
    periodButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    periodButtonGradient: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    periodButtonInactive: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(123, 104, 238, 0.15)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(123, 104, 238, 0.3)',
    },
    periodText: {
        color: '#a8b2d1',
        fontSize: 13,
        fontWeight: '600',
    },
    periodTextActive: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    podiumContainer: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        marginBottom: 15,
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        minHeight: 50,
    },
    podiumItem: {
        alignItems: 'center',
        flex: 1,
    },
    firstPlace: {
        zIndex: 3,
    },
    secondPlace: {
        zIndex: 2,
    },
    thirdPlace: {
        zIndex: 1,
    },
    rankNumber: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    podiumName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        textAlign: "center"
    },
    firstPlaceName: {
        fontSize: 16,
    },
    podiumPoints: {
        fontSize: 12,
        color: '#a8b2d1',
        marginBottom: 10,
    },
    podiumBase: {
        width: '100%',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 10,
    },
    podiumMedal: {
        fontSize: 32,
    },
    leaderboardList: {
        paddingHorizontal: 0,
        gap: 10,
        marginTop: 10,
    },
    leaderboardItem: {
        borderRadius: 16,
        overflow: 'hidden',
        //marginBottom: 6,
        //marginHorizontal: 5,
    },
    leaderboardItemContent: {
        flex: 1,
    },
    leaderboardItemGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(123, 104, 238, 0.2)',
    },
    leaderboardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 12,
    },
    rankCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(123, 104, 238, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankCircleText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    leaderboardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
        flexShrink: 1,
    },
    leaderboardPoints: {
        fontSize: 15,
        fontWeight: '700',
        color: '#7B68EE',
        flexShrink: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        color: '#a8b2d1',
        fontSize: 14,
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 20,
        backgroundColor: 'rgba(123, 104, 238, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(123, 104, 238, 0.2)',
    },
    emptyText: {
        color: '#a8b2d1',
        fontSize: 14,
        textAlign: 'center',
    },
    modalListItem: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 10,
    },
    modalItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalItemSub: {
        color: '#a8b2d1',
        fontSize: 13,
        marginTop: 6,
    },
    alertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 15,
        },
        shadowOpacity: 0.3,
        shadowRadius: 25,
        elevation: 15,
    },
    alertTopBar: {
        height: 5,
        width: '100%',
    },
    alertIconSection: {
        alignItems: 'center',
        marginTop: 25,
        marginBottom: 20,
    },
    alertIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    alertIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContent: {
        paddingHorizontal: 25,
        paddingBottom: 25,
        alignItems: 'center',
    },
    alertTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    alertMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    alertButtonContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    alertCancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 25,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    alertCancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    alertConfirmButtonWrapper: {
        flex: 1,
    },
    alertConfirmButton: {
        borderRadius: 25,
        paddingVertical: 14,
        alignItems: 'center',
    },
    alertConfirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Journey Map Styles
    centerContainer: {
        flex: 1,
        backgroundColor: '#0f0f23',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: 14,
        color: '#a0a0a0',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#6c5ce7',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    journeyTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    dateText: {
        fontSize: 13,
        color: '#7a7a8e',
    },
    startContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    stepContainer: {
        marginBottom: 60,
        position: 'relative',
    },
    connectingLine: {
        position: 'absolute',
        top: -60,
        width: 4,
        height: 60,
        left: '50%',
        marginLeft: -2,
        overflow: 'hidden',
    },
    lineGradient: {
        flex: 1,
    },
    dashedLine: {
        flex: 1,
        backgroundColor: '#2a2a3e',
        borderStyle: 'dashed',
    },
    lineToLeft: {
        transform: [{ translateX: -70 }],
    },
    lineToRight: {
        transform: [{ translateX: 70 }],
    },
    flowingParticle: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00d4aa',
        left: -1,
        top: '50%',
    },
    stepContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    stepLeft: {
        justifyContent: 'flex-end',
    },
    stepRight: {
        justifyContent: 'flex-start',
    },
    stepCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    completedCircle: {
        shadowColor: '#00d4aa',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    inactiveCircle: {
        backgroundColor: '#2a2a3e',
        borderWidth: 2,
        borderColor: '#3a3a4e',
    },
    gradientCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
    },
    glowRingCompleted: {
        borderColor: '#00d4aa',
    },
    glowRingActive: {
        borderColor: '#6c5ce7',
    },
    sparkleContainer: {
        position: 'absolute',
        width: 100,
        height: 100,
    },
    sparkle: {
        position: 'absolute',
        fontSize: 16,
    },
    pulseRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: '#6c5ce7',
    },
    pulseRing1: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    pulseRing2: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    progressRing: {
        position: 'absolute',
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 2,
        borderColor: '#a44aff',
        borderStyle: 'dashed',
    },
    checkmark: {
        fontSize: 32,
        color: '#fff',
        fontWeight: 'bold',
    },
    stepNumber: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    stepNumberInactive: {
        fontSize: 22,
        color: '#5a5a6e',
        fontWeight: '600',
    },
    lockOverlay: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 2,
    },
    lockIcon: {
        fontSize: 16,
    },
    stepInfo: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2a2a3e',
    },
    stepInfoActive: {
        borderColor: '#6c5ce7',
        borderWidth: 2,
        shadowColor: '#6c5ce7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
        backgroundColor: '#1f1f35',
    },
    stepInfoCompleted: {
        borderColor: '#00d4aa',
        backgroundColor: '#1a2e2a',
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepTitle: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '700',
    },
    completedText: {
        color: '#00d4aa',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#2a2a3e',
    },
    statusBadgeCompleted: {
        backgroundColor: 'rgba(0, 212, 170, 0.2)',
    },
    statusBadgeActive: {
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
    },
    statusText: {
        fontSize: 11,
        color: '#a0a0a0',
        fontWeight: '600',
    },
    stepDescription: {
        fontSize: 13,
        color: '#7a7a8e',
        marginBottom: 12,
        lineHeight: 18,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#2a2a3e',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    progressGradient: {
        flex: 1,
    },
    finishContainer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 40,
        position: 'relative',
    },
    flagPole: {
        width: 4,
        height: 70,
        backgroundColor: '#2a2a3e',
        marginBottom: 0,
    },
    flagPoleActive: {
        backgroundColor: '#ffd700',
        shadowColor: '#ffd700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    flag: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#2a2a3e',
        borderWidth: 2,
        borderColor: '#3a3a4e',
        overflow: 'hidden',
    },
    flagActive: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        shadowColor: '#ffd700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 12,
    },
    readMoreText: {
        color: '#fff',
        fontSize: 12,
        marginTop: -3
    },
    flagGradient: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flagText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f0f23',
    },
    flagTextInactive: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7a7a8e',
    },
    starburst: {
        position: 'absolute',
        top: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starburstText: {
        fontSize: 80,
    },
    confettiContainer: {
        position: 'absolute',
        top: -20,
        width: width,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    confetti: {
        fontSize: 24,
        position: 'absolute',
    },
    celebration: {
        marginTop: 24,
        alignItems: 'center',
    },
    celebrationText: {
        fontSize: 28,
        marginBottom: 12,
    },
    congratsText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffd700',
        marginBottom: 8,
        textShadowColor: 'rgba(255, 215, 0, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    congratsSubtext: {
        fontSize: 16,
        color: '#a0a0a0',
        marginBottom: 4,
    },
    congratsSubtext2: {
        fontSize: 14,
        color: '#7a7a8e',
        fontStyle: 'italic',
    },


});
export default DashboardScreen;
