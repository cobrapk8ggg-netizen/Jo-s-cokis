import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, MoreVertical, X } from 'lucide-react-native';
import { FloatingAssistantNative } from '../native/FloatingAssistantNative';
import {
  FLOATING_SESSION_STORAGE_KEY,
  FloatingAssistantSession,
  MAIN_SESSION_STORAGE_KEY,
  persistFloatingSession,
} from '../floatingSession';

const { width } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(width - 32, 390);

const fallbackSession: FloatingAssistantSession = {
  elements: [],
  currentIndex: 0,
  fontSize: 18,
  smartCleaner: true,
  updatedAt: Date.now(),
};

export const FloatingAssistantUI: React.FC = () => {
  const [session, setSession] = useState<FloatingAssistantSession>(fallbackSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const copyOpacity = useRef(new Animated.Value(0)).current;

  const totalCount = session.elements.length;
  const currentIndex = Math.min(session.currentIndex, Math.max(totalCount - 1, 0));
  const currentElement = session.elements[currentIndex];
  const progressRatio = totalCount > 1 ? currentIndex / (totalCount - 1) : 0;

  const stars = useMemo(() => Array.from({ length: 18 }).map((_, index) => ({
    id: index,
    left: Math.random() * PANEL_WIDTH,
    top: Math.random() * 170,
    size: Math.random() * 1.8 + 0.8,
    opacity: Math.random() * 0.45 + 0.15,
  })), []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      dragOffset.current = { x: 0, y: 0 };
      setMenuOpen(false);
    },
    onPanResponderMove: (_, gesture) => {
      const deltaX = gesture.dx - dragOffset.current.x;
      const deltaY = gesture.dy - dragOffset.current.y;
      dragOffset.current = { x: gesture.dx, y: gesture.dy };
      FloatingAssistantNative.moveBy(deltaX, deltaY);
    },
  }), []);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const saved = await AsyncStorage.getItem(FLOATING_SESSION_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as FloatingAssistantSession;
      setSession({
        ...parsed,
        currentIndex: Math.min(parsed.currentIndex || 0, Math.max(parsed.elements.length - 1, 0)),
      });
    } catch (error) {
      console.error('Failed to load floating session', error);
    }
  };

  const persistIndex = async (nextIndex: number) => {
    const nextSession = {
      ...session,
      currentIndex: nextIndex,
      updatedAt: Date.now(),
    };

    setSession(nextSession);
    await persistFloatingSession(nextSession);

    const savedMainSession = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY);
    if (savedMainSession) {
      try {
        const parsedMainSession = JSON.parse(savedMainSession);
        parsedMainSession.currentIndex = nextIndex;
        await AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(parsedMainSession));
      } catch (error) {
        console.error('Failed to sync floating progress', error);
      }
    }
  };

  const goToIndex = (nextIndex: number) => {
    if (totalCount === 0) return;
    const boundedIndex = Math.max(0, Math.min(nextIndex, totalCount - 1));
    persistIndex(boundedIndex);
  };

  const handleCopy = async () => {
    if (!currentElement) return;

    await Clipboard.setStringAsync(currentElement.text);
    if (Platform.OS === 'android') {
      ToastAndroid.show('تم النسخ', ToastAndroid.SHORT);
    }

    copyOpacity.setValue(1);
    Animated.timing(copyOpacity, {
      toValue: 0,
      duration: 950,
      delay: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleSliderPress = (locationX: number) => {
    if (totalCount <= 1) return;
    const ratio = Math.max(0, Math.min(locationX / (PANEL_WIDTH - 44), 1));
    goToIndex(Math.round(ratio * (totalCount - 1)));
  };

  const handleHide = async () => {
    setMenuOpen(false);
    await FloatingAssistantNative.hide();
  };

  const handleStop = async () => {
    setMenuOpen(false);
    await AsyncStorage.removeItem(FLOATING_SESSION_STORAGE_KEY);
    await FloatingAssistantNative.stop();
  };

  const handleOpenApp = async () => {
    setMenuOpen(false);
    await FloatingAssistantNative.bringAppToFront();
  };

  if (!currentElement) {
    return (
      <View style={styles.host}>
        <Text style={styles.emptyText}>لا توجد جلسة نشطة</Text>
      </View>
    );
  }

  return (
    <View style={styles.host}>
      <LinearGradient
        colors={['rgba(2,2,2,0.96)', 'rgba(15,6,30,0.93)', 'rgba(2,2,2,0.96)']}
        style={styles.panel}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {stars.map(star => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <View style={styles.grip} />
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMenuOpen(value => !value)} style={styles.menuBtn}>
            {menuOpen ? <X color="white" size={16} /> : <MoreVertical color="white" size={17} />}
          </TouchableOpacity>

          <View style={styles.brandBlock}>
            <Text style={styles.brandText}>CookieTyper</Text>
            <Text style={styles.counterText}>{currentIndex + 1} / {totalCount}</Text>
          </View>

          <View style={[styles.typeDot, { backgroundColor: currentElement.color }]} />
        </View>

        {menuOpen && (
          <View style={styles.menuCard}>
            <TouchableOpacity onPress={handleHide} style={styles.menuItem}>
              <Text style={styles.menuText}>إخفاء مؤقت</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenApp} style={styles.menuItem}>
              <Text style={styles.menuText}>العودة للتطبيق</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStop} style={styles.menuItem}>
              <Text style={[styles.menuText, styles.dangerText]}>إنهاء الجلسة</Text>
            </TouchableOpacity>
          </View>
        )}

        <Pressable
          onPress={handleCopy}
          style={[styles.textCard, { backgroundColor: hexToRgba(currentElement.color, 0.18), borderColor: hexToRgba(currentElement.color, 0.38) }]}
        >
          <Text style={styles.typeLabel}>{currentElement.type}</Text>
          <Text style={[styles.payloadText, { fontSize: session.fontSize }]} numberOfLines={5}>
            {currentElement.text}
          </Text>
          <Animated.View pointerEvents="none" style={[styles.copyToast, { opacity: copyOpacity }]}>
            <Text style={styles.copyToastText}>تم النسخ</Text>
          </Animated.View>
        </Pressable>

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => goToIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={[styles.navBtn, currentIndex === 0 && styles.disabledBtn]}
          >
            <ChevronRight color="white" size={24} />
            <Text style={styles.navText}>السابق</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => goToIndex(currentIndex + 1)}
            disabled={currentIndex === totalCount - 1}
            style={[styles.navBtn, currentIndex === totalCount - 1 && styles.disabledBtn]}
          >
            <Text style={styles.navText}>التالي</Text>
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
        </View>

        <View
          style={styles.sliderTrack}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={event => handleSliderPress(event.nativeEvent.locationX)}
          onResponderMove={event => handleSliderPress(event.nativeEvent.locationX)}
        >
          <View style={[styles.sliderProgress, { width: `${progressRatio * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${progressRatio * 100}%` }]} />
        </View>
      </LinearGradient>
    </View>
  );
};

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return `rgba(168,85,247,${alpha})`;

  const red = parseInt(cleanHex.substring(0, 2), 16);
  const green = parseInt(cleanHex.substring(2, 4), 16);
  const blue = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

const styles = StyleSheet.create({
  host: {
    width: PANEL_WIDTH,
    borderRadius: 28,
    overflow: 'hidden',
  },
  panel: {
    width: PANEL_WIDTH,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
  },
  star: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 999,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  grip: {
    width: 54,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  brandBlock: {
    alignItems: 'center',
  },
  brandText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
  counterText: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  typeDot: {
    width: 14,
    height: 14,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  menuCard: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 20,
    minWidth: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    color: 'white',
    fontWeight: '800',
    textAlign: 'right',
  },
  dangerText: {
    color: '#fb7185',
  },
  textCard: {
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  typeLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'right',
    marginBottom: 8,
  },
  payloadText: {
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  copyToast: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
  copyToastText: {
    color: '#22c55e',
    fontWeight: '900',
    fontSize: 18,
  },
  navRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
  },
  navBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledBtn: {
    opacity: 0.28,
  },
  navText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
  },
  sliderTrack: {
    height: 20,
    justifyContent: 'center',
    marginTop: 12,
  },
  sliderProgress: {
    height: 5,
    borderRadius: 99,
    backgroundColor: '#9333ea',
  },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 99,
    backgroundColor: '#d8b4fe',
    borderWidth: 3,
    borderColor: '#7c3aed',
  },
  emptyText: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 18,
    borderRadius: 18,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
