import { useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const useDrawer = (currentScreenIndex = 0) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState(currentScreenIndex);

    // Animation references
    const drawerSlideAnim = useRef(new Animated.Value(-width * 0.75)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const menuItemAnims = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

    const toggleDrawer = () => {
        const toValue = drawerVisible ? 0 : 1;

        if (!drawerVisible) {
            setDrawerVisible(true);

            // Animate menu items with staggered effect
            menuItemAnims.forEach((anim, index) => {
                setTimeout(() => {
                    Animated.spring(anim, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }).start();
                }, index * 50);
            });
        } else {
            // Reset menu items animation
            menuItemAnims.forEach((anim) => {
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            });
        }

        // Animate drawer slide and overlay
        Animated.parallel([
            Animated.spring(drawerSlideAnim, {
                toValue: toValue ? 0 : -width * 0.75,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: toValue ? 0.5 : 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (drawerVisible) setDrawerVisible(false);
        });
    };

    const handleMenuItemPress = (index, navigation) => {
        setSelectedMenuItem(index);

        // Animate the pressed menu item
        Animated.sequence([
            Animated.spring(menuItemAnims[index], {
                toValue: 1.1,
                tension: 100,
                friction: 3,
                useNativeDriver: true,
            }),
            Animated.spring(menuItemAnims[index], {
                toValue: 1,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();

        // Close drawer and navigate
        setTimeout(() => {
            toggleDrawer();

            // Navigation mapping based on menu item index
            const navigationMap = {
                0: 'Dashboard',
                1: 'LearningHub',
                2: 'Courses',
                3: 'TrainingSession',
                4: 'Calendar',
                5: 'ELearning',
                6: 'Certificate',
                7: 'UserManual',
            };

            if (navigationMap[index]) {
                navigation.navigate(navigationMap[index]);
            }
        }, 300);
    };

    return {
        drawerVisible,
        selectedMenuItem,
        drawerSlideAnim,
        overlayOpacity,
        menuItemAnims,
        toggleDrawer,
        handleMenuItemPress,
    };
};

// Dummy default export — required by Expo Router route scanning
export default function UseDrawerPlaceholder() { return null; }
