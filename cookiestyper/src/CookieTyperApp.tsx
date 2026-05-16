import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, AppState, Platform } from 'react-native';
import { MainScreen } from './components/MainScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AssistantMode } from './components/AssistantMode';
import { SpaceBackground } from './components/SpaceBackground';
import { useCookieTyper } from './hooks/useCookieTyper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FloatingAssistantNative, floatingAssistantEvents } from './native/FloatingAssistantNative';
import { buildFloatingSession, MAIN_SESSION_STORAGE_KEY, persistFloatingSession } from './floatingSession';

type AppScreen = 'main' | 'settings' | 'assistant';

/**
 * Main Application Hub - CookieTyper
 */
export default function App() {
  const [screen, setScreen] = useState<AppScreen>('main');
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('main');
  
  const { 
    settings, 
    setSettings, 
    session, 
    parseText, 
    nextBubble, 
    prevBubble, 
    goToBubble, 
    setSession,
    updateAssistantMode,
    isLoaded 
  } = useCookieTyper();

  useEffect(() => {
    if (!isLoaded || Platform.OS !== 'android' || settings.assistantMode) return;

    Alert.alert(
      'وضع المساعد',
      'اختر طريقة عمل المساعد على أندرويد. المساعد العائم يظهر فوق التطبيقات الأخرى، والداخلي يبقى داخل التطبيق مثل تجربة آيفون.',
      [
        {
          text: 'اختيار المساعد الداخلي',
          onPress: () => updateAssistantMode('inapp'),
        },
        {
          text: 'اختيار المساعد العائم',
          onPress: () => updateAssistantMode('floating'),
        },
      ],
      { cancelable: false }
    );
  }, [isLoaded, settings.assistantMode]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const syncProgress = async () => {
      const savedSession = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY);
      if (!savedSession) return;

      try {
        const parsedSession = JSON.parse(savedSession);
        setSession(parsedSession);
      } catch (error) {
        console.error('Failed to resync floating assistant progress', error);
      }
    };

    const applyFloatingIndex = async (currentIndex: number) => {
      const savedSession = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY);
      if (!savedSession) return;

      try {
        const parsedSession = JSON.parse(savedSession);
        parsedSession.currentIndex = currentIndex;
        await AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(parsedSession));
        setSession(parsedSession);
      } catch (error) {
        console.error('Failed to apply floating assistant index', error);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') syncProgress();
    });
    const closeSubscription = floatingAssistantEvents?.addListener('FloatingAssistantClosed', syncProgress);
    const indexSubscription = floatingAssistantEvents?.addListener('FloatingAssistantIndexChanged', event => {
      if (typeof event?.currentIndex === 'number') {
        applyFloatingIndex(event.currentIndex);
      }
    });
    const errorSubscription = floatingAssistantEvents?.addListener('FloatingAssistantError', event => {
      console.error('Floating assistant native error', event);
    });

    return () => {
      appStateSubscription.remove();
      closeSubscription?.remove();
      indexSubscription?.remove();
      errorSubscription?.remove();
    };
  }, [setSession]);

  // Show a themed loader while persistent data is being fetched
  if (!isLoaded) {
    return (
      <View style={styles.loadingHost}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const startFloatingAssistant = async (payload: string) => {
    const nextSession = parseText(payload);
    const floatingSession = buildFloatingSession(nextSession.bubbles, nextSession.currentIndex, settings);

    await AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    await persistFloatingSession(floatingSession);

    if (!FloatingAssistantNative.isAvailable) {
      Alert.alert(
        'Development Build مطلوب',
        'المساعد العائم يحتاج نسخة Expo Development Build تحتوي الوحدة الأصلية. سيتم فتح المساعد الداخلي الآن.'
      );
      setScreen('assistant');
      return;
    }

    const hasPermission = await FloatingAssistantNative.hasOverlayPermission();
    if (!hasPermission) {
      Alert.alert(
        'إذن الظهور فوق التطبيقات',
        'يحتاج CookieTyper إذن الظهور فوق التطبيقات لتشغيل المساعد العائم. فعّل الإذن ثم اضغط Start مرة أخرى.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'فتح الإعدادات', onPress: () => FloatingAssistantNative.openOverlaySettings() },
        ]
      );
      return;
    }

    try {
      await FloatingAssistantNative.start(JSON.stringify(floatingSession));
    } catch (error) {
      console.error('Failed to start floating assistant', error);
      Alert.alert(
        'تعذر تشغيل المساعد العائم',
        'حدث خطأ أثناء تشغيل النافذة العائمة. سيتم فتح المساعد الداخلي الآن حتى لا تفقد جلستك.'
      );
      setScreen('assistant');
    }
  };

  const handleStartRequested = (payload: string) => {
    if (Platform.OS === 'android' && settings.assistantMode === 'floating') {
      startFloatingAssistant(payload);
      return;
    }

    parseText(payload);
    setScreen('assistant');
  };

  const navToSettings = () => {
    setPreviousScreen(screen);
    setScreen('settings');
  };

  const navBackFromSettings = () => {
    setScreen(previousScreen);
  };

  const persistSettings = (config: any) => {
    setSettings(config);
    navBackFromSettings();
  };

  const triggerFactoryReset = () => {
    setSettings({
      fontSize: 18,
      smartCleaner: true,
      assistantMode: Platform.OS === 'android' ? settings.assistantMode || 'inapp' : 'inapp',
      tags: [
        { id: '1', symbol: '#', name: 'خارجي', color: '#ef4444' },
        { id: '2', symbol: '*', name: 'جانبي', color: '#22c55e' },
        { id: '3', symbol: '"', name: 'مؤثر', color: '#eab308' },
      ],
    });
  };

  return (
    <SpaceBackground>
      <StatusBar style="light" />
      <View style={styles.viewPort}>
        {/* Screen Routing Manager */}
        {screen === 'main' && (
          <MainScreen
            inputText={session.inputText}
            onStart={handleStartRequested}
            onOpenSettings={navToSettings}
            bubbleCount={session.bubbles.length}
            settings={settings}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={persistSettings}
            onReset={triggerFactoryReset}
            onAssistantModeChange={updateAssistantMode}
            onClose={navBackFromSettings}
          />
        )}

        {screen === 'assistant' && (
          <AssistantMode
            session={session}
            settings={settings}
            onNext={nextBubble}
            onPrev={prevBubble}
            onGoTo={goToBubble}
            onClose={() => setScreen('main')}
          />
        )}
      </View>
    </SpaceBackground>
  );
}

const styles = StyleSheet.create({
  loadingHost: {
    flex: 1,
    backgroundColor: '#020202',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewPort: {
    flex: 1,
  },
});