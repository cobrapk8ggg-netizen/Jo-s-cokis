import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainScreen } from './components/MainScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AssistantMode } from './components/AssistantMode';
import { SpaceBackground } from './components/SpaceBackground';
import { HomeScreen } from './components/HomeScreen';
import { AppDrawer, ToolScreen } from './components/AppDrawer';
import { ThemedModal } from './components/ThemedModal';
import { useCookieTyper } from './hooks/useCookieTyper';
import { FloatingAssistantNative, floatingAssistantEvents } from './native/FloatingAssistantNative';
import { buildFloatingSession, MAIN_SESSION_STORAGE_KEY, persistFloatingSession } from './floatingSession';
import { DEFAULT_SETTINGS } from './defaults';
import { OperationLogItem } from './types';

type AppScreen = ToolScreen | 'assistant';
type NoticeState = { visible: boolean; title: string; message: string; confirmText?: string; onConfirm?: () => void };

const OPERATIONS_STORAGE_KEY = 'cookies_recent_operations';
const COOKIES_DISCORD_URL = 'https://discord.gg/cookiesteam';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notice, setNotice] = useState<NoticeState>({ visible: false, title: '', message: '' });
  const [operations, setOperations] = useState<OperationLogItem[]>([]);

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
    isLoaded,
  } = useCookieTyper();

  useEffect(() => {
    AsyncStorage.getItem(OPERATIONS_STORAGE_KEY).then(saved => {
      if (saved) setOperations(JSON.parse(saved));
    }).catch(error => console.error('Failed to load recent operations', error));
  }, []);

  const addOperation = (item: Omit<OperationLogItem, 'id' | 'createdAt' | 'timeLabel'>) => {
    const nextItem: OperationLogItem = {
      ...item,
      id: `${Date.now()}-${item.tool}`,
      createdAt: Date.now(),
      timeLabel: 'الآن',
    };
    setOperations(prev => {
      const next = [nextItem, ...prev].slice(0, 5);
      AsyncStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const showNotice = (title: string, message: string, confirmText = 'حسنًا', onConfirm?: () => void) => {
    setNotice({ visible: true, title, message, confirmText, onConfirm });
  };

  useEffect(() => {
    if (!isLoaded || Platform.OS !== 'android' || settings.assistantMode) return;
    showNotice(
      'وضع المساعد',
      'اختر من إعدادات Typer طريقة عمل المساعد على أندرويد: العائم فوق التطبيقات الأخرى، أو الداخلي داخل التطبيق.',
      'فتح الإعدادات',
      () => {
        updateAssistantMode('inapp');
        setPreviousScreen(screen);
        setScreen('settings');
      }
    );
  }, [isLoaded, settings.assistantMode]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const syncProgress = async () => {
      const savedSession = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY);
      if (!savedSession) return;
      try {
        setSession(JSON.parse(savedSession));
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

    const appStateSubscription = AppState.addEventListener('change', state => { if (state === 'active') syncProgress(); });
    const closeSubscription = floatingAssistantEvents?.addListener('FloatingAssistantClosed', syncProgress);
    const indexSubscription = floatingAssistantEvents?.addListener('FloatingAssistantIndexChanged', event => {
      if (typeof event?.currentIndex === 'number') applyFloatingIndex(event.currentIndex);
    });
    const errorSubscription = floatingAssistantEvents?.addListener('FloatingAssistantError', event => console.error('Floating assistant native error', event));

    return () => {
      appStateSubscription.remove();
      closeSubscription?.remove();
      indexSubscription?.remove();
      errorSubscription?.remove();
    };
  }, [setSession]);

  if (!isLoaded) {
    return <View style={styles.loadingHost}><ActivityIndicator size="large" color="#F2A6B8" /></View>;
  }

  const startFloatingAssistant = async (payload: string) => {
    const nextSession = parseText(payload);
    const floatingSession = buildFloatingSession(nextSession.bubbles, nextSession.currentIndex, settings);
    await AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    await persistFloatingSession(floatingSession);
    addOperation({ tool: 'Typer', description: `آخر تشغيل: ${nextSession.bubbles.length} فقاعة` });

    if (!FloatingAssistantNative.isAvailable) {
      showNotice('Development Build مطلوب', 'المساعد العائم يحتاج نسخة Expo Development Build تحتوي الوحدة الأصلية. سيتم فتح المساعد الداخلي الآن.');
      setScreen('assistant');
      return;
    }

    const hasPermission = await FloatingAssistantNative.hasOverlayPermission();
    if (!hasPermission) {
      showNotice('إذن الظهور فوق التطبيقات', 'يحتاج CookieTyper إذن الظهور فوق التطبيقات لتشغيل المساعد العائم. فعّل الإذن ثم اضغط Start مرة أخرى.', 'فتح الإعدادات', () => FloatingAssistantNative.openOverlaySettings());
      return;
    }

    try {
      await FloatingAssistantNative.start(JSON.stringify(floatingSession));
    } catch (error) {
      console.error('Failed to start floating assistant', error);
      showNotice('تعذر تشغيل المساعد العائم', 'حدث خطأ أثناء تشغيل النافذة العائمة. سيتم فتح المساعد الداخلي الآن حتى لا تفقد جلستك.');
      setScreen('assistant');
    }
  };

  const handleStartRequested = (payload: string) => {
    if (Platform.OS === 'android' && settings.assistantMode === 'floating') {
      startFloatingAssistant(payload);
      return;
    }
    const nextSession = parseText(payload);
    addOperation({ tool: 'Typer', description: `آخر تشغيل: ${nextSession.bubbles.length} فقاعة` });
    setScreen('assistant');
  };

  const navToSettings = () => {
    setPreviousScreen(screen);
    setScreen('settings');
  };

  const navBackFromSettings = () => setScreen(previousScreen === 'settings' ? 'home' : previousScreen);

  const persistSettings = (config: any) => {
    setSettings(config);
    navBackFromSettings();
  };

  const triggerFactoryReset = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      assistantMode: Platform.OS === 'android' ? settings.assistantMode || 'inapp' : 'inapp',
    });
  };

  const handleDrawerSelect = async (target: ToolScreen) => {
    setDrawerVisible(false);
    if (target === 'about') {
      try {
        await Linking.openURL(COOKIES_DISCORD_URL);
      } catch (error) {
        showNotice('Discord', 'تعذر فتح رابط سيرفر Cookies.');
      }
      return;
    }
    if (target === 'imageMerge') {
      setScreen('imageMerge');
      return;
    }
    if (target === 'settings') {
      navToSettings();
      return;
    }
    setScreen(target);
  };

  const activeDrawerScreen: ToolScreen = screen === 'assistant' ? 'typer' : (screen as ToolScreen);

  return (
    <SpaceBackground>
      <StatusBar style="light" />
      <View style={styles.viewPort}>
        {screen === 'home' && <HomeScreen operations={operations} onOpenMenu={() => setDrawerVisible(true)} onOpenTyper={() => setScreen('typer')} />}

        {screen === 'typer' && (
          <MainScreen
            inputText={session.inputText}
            onStart={handleStartRequested}
            onOpenSettings={navToSettings}
            onOpenMenu={() => setDrawerVisible(true)}
            onBackHome={() => setScreen('home')}
            bubbleCount={session.bubbles.length}
            settings={settings}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen settings={settings} onSave={persistSettings} onReset={triggerFactoryReset} onAssistantModeChange={updateAssistantMode} onClose={navBackFromSettings} />
        )}

        {screen === 'assistant' && <AssistantMode session={session} settings={settings} onNext={nextBubble} onPrev={prevBubble} onGoTo={goToBubble} onClose={() => setScreen('typer')} />}

        {screen === 'imageMerge' && (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderTitle}>دمج الصور</Text>
            <Text style={styles.placeholderText}>هذه أداة مستقبلية مستقلة لا تؤثر على Typer. سيتم لاحقًا دعم اختيار الصور، ترتيبها، دمجها، وحفظ الناتج.</Text>
            <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.placeholderButton}><Text style={styles.placeholderButtonText}>فتح القائمة</Text></TouchableOpacity>
          </View>
        )}
      </View>
      <AppDrawer visible={drawerVisible} active={activeDrawerScreen} onClose={() => setDrawerVisible(false)} onSelect={handleDrawerSelect} />
      <ThemedModal
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        confirmText={notice.confirmText || 'حسنًا'}
        onConfirm={() => { const cb = notice.onConfirm; setNotice(prev => ({ ...prev, visible: false })); cb?.(); }}
        onCancel={() => setNotice(prev => ({ ...prev, visible: false }))}
      />
    </SpaceBackground>
  );
}

const styles = StyleSheet.create({
  loadingHost: { flex: 1, backgroundColor: '#020202', justifyContent: 'center', alignItems: 'center' },
  viewPort: { flex: 1 },
  placeholderScreen: { flex: 1, justifyContent: 'center', padding: 24 },
  placeholderTitle: { color: 'white', fontSize: 30, fontWeight: '900', textAlign: 'right' },
  placeholderText: { color: 'rgba(255,255,255,0.56)', fontSize: 14, lineHeight: 24, textAlign: 'right', marginTop: 12 },
  placeholderButton: { marginTop: 18, backgroundColor: '#F2A6B8', borderRadius: 18, padding: 14, alignItems: 'center' },
  placeholderButtonText: { color: 'white', fontWeight: '900' },
});
