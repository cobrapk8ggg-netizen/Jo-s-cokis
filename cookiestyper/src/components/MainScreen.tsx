import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  Easing,
  StatusBar as RNStatusBar
} from 'react-native';
import { Menu, Settings as SettingsIcon, Play } from 'lucide-react-native';
import { Settings } from '../types';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_DARK = '#C96F86';

interface MainScreenProps {
  inputText: string;
  onStart: (text: string) => void;
  onOpenSettings: () => void;
  onOpenMenu?: () => void;
  bubbleCount: number;
  settings: Settings;
}

export const MainScreen: React.FC<MainScreenProps> = ({ 
  inputText: initialText, 
  onStart, 
  onOpenSettings,
  onOpenMenu,
  bubbleCount,
  settings
}) => {
  const [text, setText] = useState(initialText);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const startScale = useRef(new Animated.Value(1)).current;
  const settingsScale = useRef(new Animated.Value(1)).current;
  const settingsRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(45, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(inputAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(actionsAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, inputAnim, actionsAnim, footerAnim]);

  const handleStartPress = () => {
    if (!text.trim()) return;

    Animated.sequence([
      Animated.timing(startScale, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(startScale, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
    onStart(text);
  };

  const handleSettingsPress = () => {
    settingsRotate.setValue(0);
    onOpenSettings();

    Animated.parallel([
      Animated.timing(settingsScale, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(settingsRotate, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => settingsScale.setValue(1));
  };

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-26, 0],
  });

  const inputTranslateY = inputAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  const actionsTranslateY = actionsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  const footerTranslateY = footerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const settingsRotation = settingsRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Top Navigation Row */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton} activeOpacity={0.85}>
            <Menu color="white" size={22} />
          </TouchableOpacity>

          <View style={styles.titleGroup}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{bubbleCount || 0}</Text>
            </View>
            <Text style={styles.brandTitle}>كوكيز تايبر</Text>
          </View>

        </Animated.View>

        {/* Glossy Text Input Container */}
        <Animated.View
          style={[
            styles.inputAreaContainer,
            {
              opacity: inputAnim,
              transform: [
                { translateY: inputTranslateY },
                {
                  scale: inputAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.inputGlassLayer}>
            <TextInput
              multiline
              value={text}
              onChangeText={setText}
              placeholder="الصق النص هنا..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              style={styles.textInput}
              textAlignVertical="top"
              selectionColor={COOKIES_PINK}
            />
          </View>
        </Animated.View>

        {/* Action Controls */}
        <Animated.View
          style={[
            styles.actionRow,
            {
              opacity: actionsAnim,
              transform: [{ translateY: actionsTranslateY }],
            },
          ]}
        >
          {/* Start Project Button */}
          <TouchableOpacity 
            onPress={handleStartPress}
            disabled={!text.trim()}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <Animated.View
              style={[
                styles.startBtn,
                !text.trim() && styles.disabledStartBtn,
                {
                  transform: [{ scale: startScale }],
                },
              ]}
            >
              <Play color="white" size={22} fill="white" />
              <Text style={styles.startBtnText}>ابدأ</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Quick Settings Access */}
          <TouchableOpacity 
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.settingsIconBtn,
                {
                  transform: [
                    { scale: settingsScale },
                    { rotate: settingsRotation },
                  ],
                },
              ]}
            >
              <SettingsIcon color="white" size={24} strokeWidth={2.5} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Link / Branding */}
        <Animated.View
          style={[
            styles.footerInfo,
            {
              opacity: footerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
              transform: [{ translateY: footerTranslateY }],
            },
          ]}
        >
          <Text style={styles.discordInfo}>كوكيز تايبر</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 0,
    paddingBottom: Platform.OS === 'android' ? 14 : 18,
  },
  header: {
    marginTop: 8,
    marginBottom: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(242,166,184,0.34)',
    minWidth: 50,
    alignItems: 'center',
  },
  counterText: {
    color: COOKIES_PINK,
    fontWeight: '900',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  brandTitle: {
    color: 'white',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  inputAreaContainer: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  inputGlassLayer: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  highlightLayer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  highlightLineWrapper: {
    width: '100%',
    alignItems: 'flex-end',
  },
  highlightLine: {
    color: 'white',
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'right',
    textAlignVertical: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 6,
    marginBottom: 0,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 19,
    lineHeight: 28,
    textAlign: 'right',
    textAlignVertical: 'top',
    zIndex: 2,
  },
  transparentTextInput: {
    color: 'transparent',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    marginTop: 14,
    gap: 12,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: COOKIES_PINK,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COOKIES_PINK_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledStartBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  startBtnText: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 5,
  },
  settingsIconBtn: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  footerInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
  discordInfo: {
    color: '#94a3b8',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});