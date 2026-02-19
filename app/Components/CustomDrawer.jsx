


import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const BANNER_CACHE_KEY = '@banner_data_cache';
const BANNER_CACHE_EXPIRY_KEY = '@banner_cache_expiry';
const CACHE_DURATION_HOURS = 24;

// Custom Logout Modal Component
const LogoutModal = ({ visible, onCancel, onConfirm }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const iconRotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const buttonScaleYes = useRef(new Animated.Value(1)).current;
    const buttonScaleNo = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
            slideAnim.setValue(50);
            iconRotateAnim.setValue(0);

            // Run entrance animations
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(iconRotateAnim, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.elastic(1.2),
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous pulse animation for icon
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [visible]);

    const handleCancel = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onCancel());
    };

    const handleConfirm = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onConfirm());
    };

    const handleButtonPressIn = (animValue) => {
        Animated.spring(animValue, {
            toValue: 0.92,
            useNativeDriver: true,
        }).start();
    };

    const handleButtonPressOut = (animValue) => {
        Animated.spring(animValue, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const iconRotate = iconRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleCancel}
        >
            <View style={logoutStyles.modalContainer}>
                <Animated.View style={[logoutStyles.overlay, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={handleCancel}
                    />
                </Animated.View>

                <View style={logoutStyles.centeredView}>
                    <Animated.View
                        style={[
                            logoutStyles.modalView,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { scale: scaleAnim },
                                    { translateY: slideAnim }
                                ],
                            },
                        ]}
                    >
                        {/* Gradient Background */}
                        <LinearGradient
                            colors={['#2a2a3e', '#1a1a2e']}
                            style={logoutStyles.gradientBackground}
                        />

                        {/* Animated Icon */}
                        <Animated.View
                            style={[
                                logoutStyles.iconContainer,
                                {
                                    transform: [
                                        { rotate: iconRotate },
                                        { scale: pulseAnim }
                                    ],
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={['#FF6B6B', '#EE5A6F']}
                                style={logoutStyles.iconGradient}
                            >
                                <Ionicons name="log-out-outline" size={40} color="#fff" />
                            </LinearGradient>
                        </Animated.View>

                        {/* Title */}
                        <Text allowFontScaling={false} style={logoutStyles.modalTitle}>Logout</Text>

                        {/* Message */}
                        <Text allowFontScaling={false} style={logoutStyles.modalMessage}>
                            Are you sure you want to logout?
                        </Text>

                        {/* Buttons */}
                        <View style={logoutStyles.buttonContainer}>
                            {/* No Button */}
                            <Animated.View style={{ transform: [{ scale: buttonScaleNo }], flex: 1 }}>
                                <TouchableOpacity
                                    onPressIn={() => handleButtonPressIn(buttonScaleNo)}
                                    onPressOut={() => handleButtonPressOut(buttonScaleNo)}
                                    onPress={handleCancel}
                                    activeOpacity={0.9}
                                    style={logoutStyles.button}
                                >
                                    <LinearGradient
                                        colors={['#4a4a5e', '#3a3a4e']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={logoutStyles.buttonGradient}
                                    >
                                        <Text allowFontScaling={false} style={logoutStyles.buttonTextCancel}>No</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* Yes Button */}
                            <Animated.View style={{ transform: [{ scale: buttonScaleYes }], flex: 1 }}>
                                <TouchableOpacity
                                    onPressIn={() => handleButtonPressIn(buttonScaleYes)}
                                    onPressOut={() => handleButtonPressOut(buttonScaleYes)}
                                    onPress={handleConfirm}
                                    activeOpacity={0.9}
                                    style={logoutStyles.button}
                                >
                                    <LinearGradient
                                        colors={['#FF6B6B', '#EE5A6F', '#FF8787']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={logoutStyles.buttonGradient}
                                    >
                                        <Text allowFontScaling={false} style={logoutStyles.buttonTextConfirm}>Yes</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
};

const CustomDrawer = ({
    drawerVisible,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    selectedMenuItem,
    handleMenuItemPress,
    toggleDrawer,
    navigation
}) => {
    // All your existing animations remain the same
    const floatAnim = useRef(new Animated.Value(0)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const iconBounceAnims = useRef(
        Array(8).fill(0).map(() => new Animated.Value(1))
    ).current;

    const [userName, setUserName] = useState("");
    const [profile, setProfile] = useState("");
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);

    useEffect(() => {
        // All your existing animation logic remains unchanged
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(waveAnim, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: false,
                }),
                Animated.timing(waveAnim, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: false,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: false,
                }),
            ])
        ).start();

        if (drawerVisible) {
            iconBounceAnims.forEach((anim, index) => {
                Animated.sequence([
                    Animated.delay(index * 50),
                    Animated.spring(anim, {
                        toValue: 1.2,
                        friction: 3,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(anim, {
                        toValue: 1,
                        friction: 3,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }
    }, [drawerVisible]);

    useEffect(() => {
        if (selectedMenuItem !== null) {
            Animated.sequence([
                Animated.spring(iconBounceAnims[selectedMenuItem], {
                    toValue: 1.3,
                    friction: 2,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(iconBounceAnims[selectedMenuItem], {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.sequence([
                Animated.spring(pulseAnim, {
                    toValue: 1.05,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.spring(pulseAnim, {
                    toValue: 1,
                    friction: 3,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [selectedMenuItem]);

    const menuItems = [
        { name: 'Dashboard', icon: 'widgets', type: 'MaterialIcons' },
        { name: 'Learning Hub', icon: 'graduation-cap', type: 'FontAwesome5' },
        { name: 'Offline Courses', icon: 'book', type: 'FontAwesome5' },
        { name: 'Training Session', icon: 'chalkboard-teacher', type: 'FontAwesome5' },
        { name: 'Calendar', icon: 'calendar', type: 'FontAwesome5' },
        { name: 'E-Learning Courses', icon: 'laptop', type: 'FontAwesome5' },
        { name: 'Certificates', icon: 'certificate', type: 'FontAwesome5' },
        { name: 'User Manual', icon: 'book-reader', type: 'FontAwesome5' },
    ];

    const renderIcon = (item, isSelected, iconSize = 22, index) => {
        const iconColor = isSelected ? '#fff' : '#8B7AA3';
        const IconComponent = (
            <Animated.View style={{ transform: [{ scale: iconBounceAnims[index] }] }}>
                {item.type === 'MaterialIcons' ? (
                    <MaterialIcons name={item.icon} size={iconSize} color={iconColor} />
                ) : item.type === 'FontAwesome5' ? (
                    <FontAwesome5 name={item.icon} size={iconSize} color={iconColor} />
                ) : item.type === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons name={item.icon} size={iconSize} color={iconColor} />
                ) : (
                    <Ionicons name={item.icon} size={iconSize} color={iconColor} />
                )}
            </Animated.View>
        );
        return IconComponent;
    };

    const floatingTransform = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    const waveScale = waveAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 1.02, 1],
    });

    const waveOpacity = waveAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0.85, 1],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    useEffect(() => {
        const loadUserName = async () => {
            try {
                const storedName = await AsyncStorage.getItem("name");
                const storedProfile = "User";
                if (storedName) {
                    setUserName(storedName);
                    setProfile(storedProfile);
                }
            } catch (error) {
                console.log("Error fetching name:", error);
            }
        };

        loadUserName();
    }, []);

    const handleLogout = () => {
        console.log('Logout button pressed, showing modal');
        setLogoutModalVisible(true);
    };

    const handleLogoutConfirm = async () => {
        setLogoutModalVisible(false);
        try {
            await AsyncStorage.removeItem(BANNER_CACHE_KEY);
            await AsyncStorage.removeItem(BANNER_CACHE_EXPIRY_KEY);
            console.log('🗑️ Banner cache cleared on logout');

            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('name');
            await AsyncStorage.removeItem('applicationProfile');

            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.log('❌ Logout error:', error);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        }
    };

    const handleLogoutCancel = () => {
        console.log('Logout cancelled');
        setLogoutModalVisible(false);
    };

    return (
        <>
            {/* Logout Modal */}
            <LogoutModal
                visible={logoutModalVisible}
                onCancel={handleLogoutCancel}
                onConfirm={handleLogoutConfirm}
            />

            {/* Overlay */}
            {drawerVisible && (
                <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={toggleDrawer}
                    />
                </Animated.View>
            )}

            {/* Drawer - All your existing drawer code remains exactly the same */}
            {(drawerVisible || drawerSlideAnim._value > -width * 0.75) && (
                <Animated.View
                    style={[
                        styles.drawerContainer,
                        { transform: [{ translateX: drawerSlideAnim }] }
                    ]}
                >
                    <View style={styles.drawerSolid}>
                        {/* Drawer Header */}
                        <View style={styles.drawerHeader}>
                            <TouchableOpacity
                                onPress={toggleDrawer}
                                style={styles.backButton}
                                activeOpacity={0.7}
                            >
                                <View style={styles.backButtonRipple}>
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </View>
                            </TouchableOpacity>

                            {userName && (
                                <Animated.View
                                    style={[
                                        styles.profileSection,
                                        { transform: [{ translateY: floatingTransform }] }
                                    ]}
                                >
                                    <ImageBackground
                                        source={require('../Images/1edu.png')}
                                        style={styles.profileImageBackground}
                                        imageStyle={styles.profileImageStyle}
                                        resizeMode="cover"
                                    >
                                        <View style={styles.profileOverlay}>
                                            <Text allowFontScaling={false} style={styles.userName}>{userName}</Text>
                                        </View>
                                    </ImageBackground>
                                </Animated.View>
                            )}
                        </View>

                        {/* Menu Items */}
                        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                            {menuItems.map((item, index) => {
                                const isSelected = selectedMenuItem === index;
                                const scale = menuItemAnims[index].interpolate({
                                    inputRange: [0, 1, 1.1],
                                    outputRange: [0.95, 1, 1.05],
                                });
                                const translateX = menuItemAnims[index].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-30, 0],
                                });
                                const opacity = menuItemAnims[index];

                                return (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.menuItemWrapper,
                                            {
                                                opacity,
                                                transform: [
                                                    { scale: isSelected ? pulseAnim : scale },
                                                    { translateX }
                                                ]
                                            },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => handleMenuItemPress(index)}
                                            activeOpacity={0.8}
                                            style={[styles.menuItem, isSelected && styles.menuItemActive]}
                                        >
                                            {isSelected && (
                                                <>
                                                    <Animated.View
                                                        style={[
                                                            styles.menuItemGlow,
                                                            { opacity: glowOpacity }
                                                        ]}
                                                    />
                                                    <LinearGradient
                                                        colors={['#7B68EE', '#9D7FEA']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={styles.activeMenuGradient}
                                                    />
                                                </>
                                            )}
                                            <View style={[
                                                styles.menuIconContainer,
                                                isSelected && styles.menuIconContainerActive
                                            ]}>
                                                {renderIcon(item, isSelected, 22, index)}
                                            </View>
                                            <Text allowFontScaling={false} style={[styles.menuText, isSelected && styles.menuTextActive]}>
                                                {item.name}
                                            </Text>
                                            {isSelected && (
                                                <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </ScrollView>

                        {/* Logout Button */}
                        <View style={styles.logoutButton}>
                            <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={styles.logoutTouchable}>
                                <Animated.View
                                    style={{
                                        transform: [{ scale: waveScale }],
                                        opacity: waveOpacity,
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#FF6B6B', '#EE5A6F', '#FF8787']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.logoutGradient}
                                    >
                                        <View style={styles.logoutContent}>
                                            <Ionicons name="log-out-outline" size={22} color="#fff" />
                                            <Text allowFontScaling={false} style={styles.logoutText}>Logout</Text>
                                        </View>
                                    </LinearGradient>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}
        </>
    );
};

// Add new styles for the logout modal
const logoutStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        position: 'relative',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalView: {
        width: width * 0.85,
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    iconContainer: {
        alignSelf: 'center',
        marginTop: 30,
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    modalMessage: {
        fontSize: 16,
        color: '#B8A7C7',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 25,
        gap: 12,
    },
    button: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    buttonGradient: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextCancel: {
        color: '#B8A7C7',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextConfirm: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

// All your existing styles remain unchanged
const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
    },
    drawerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: width * 0.75,
        elevation: 20,
        shadowColor: '#7B68EE',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    drawerSolid: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: '#1a1a2e',
    },
    drawerHeader: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButtonRipple: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(123, 104, 238, 0.2)',
    },
    profileSection: {
        alignItems: 'center',
    },
    profileImageBackground: {
        width: '100%',
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        overflow: 'hidden',
        borderRadius: 12,
        textAlign: 'center',
    },
    profileImageStyle: {
        borderRadius: 12,
    },
    profileOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        textAlign: 'center',
    },
    userId: {
        fontSize: 14,
        color: '#B8A7C7',
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    menuItemWrapper: {
        marginVertical: 3,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
    },
    menuItemActive: {
        backgroundColor: 'transparent',
        elevation: 5,
        shadowColor: '#7B68EE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    menuItemGlow: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: 15,
        backgroundColor: '#7B68EE',
        opacity: 0.3,
    },
    activeMenuGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
    },
    menuIconContainer: {
        width: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIconContainerActive: {
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: '#B8A7C7',
        marginLeft: 12,
        fontWeight: '500',
    },
    menuTextActive: {
        color: '#fff',
        fontWeight: '600',
        textShadowColor: 'rgba(123, 104, 238, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    chevron: {
        marginLeft: 'auto',
    },
    logoutButton: {
        margin: 20,
        marginTop: 10,
        elevation: 8,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    logoutTouchable: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    logoutGradient: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    logoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default CustomDrawer;
