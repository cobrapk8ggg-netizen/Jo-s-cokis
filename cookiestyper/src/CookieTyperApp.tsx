import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, I18nManager, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainScreen } from './components/MainScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AssistantMode } from './components/AssistantMode';
import { SpaceBackground } from './components/SpaceBackground';
import { AppDrawer, ToolScreen } from './components/AppDrawer';
import { ThemedModal } from './components/ThemedModal';
import { useCookieTyper } from './hooks/useCookieTyper';
import { FloatingAssistantNative, floatingAssistantEvents } from './native/FloatingAssistantNative';
import { buildFloatingSession, MAIN_SESSION_STORAGE_KEY, persistFloatingSession } from './floatingSession';
import { DEFAULT_SETTINGS } from './defaults';
import { OperationLogItem } from './types';
import { OperationsScreen } from './components/OperationsScreen';
import { ImageMergeScreen } from './components/ImageMergeScreen';

type AppScreen = ToolScreen | 'settings' | 'assistant';
const OPERATIONS_STORAGE_KEY = 'cookies_recent_operations';
const COOKIES_DISCORD_URL = 'https://discord.gg/cookiesteam';
const DRAWER_HINT_SHOWN = 'drawer_hint_shown';
const DRAWER_OPENED = 'drawer_opened_once';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('typer');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notice, setNotice] = useState({ visible: false, title: '', message: '', confirmText: 'حسنًا', onConfirm: undefined as undefined | (() => void) });
  const [operations, setOperations] = useState<OperationLogItem[]>([]);
  const [showDrawerHint, setShowDrawerHint] = useState(false);

  const { settings, setSettings, session, parseText, nextBubble, prevBubble, goToBubble, setSession, updateAssistantMode, isLoaded } = useCookieTyper();

  useEffect(() => { I18nManager.allowRTL(false); I18nManager.forceRTL(false); }, []);

  useEffect(() => {
    AsyncStorage.getItem(OPERATIONS_STORAGE_KEY).then(saved => saved && setOperations(JSON.parse(saved))).catch(() => {});
    const timer = setTimeout(async () => {
      const [shown, opened] = await Promise.all([AsyncStorage.getItem(DRAWER_HINT_SHOWN), AsyncStorage.getItem(DRAWER_OPENED)]);
      if (!shown && !opened) { setShowDrawerHint(true); await AsyncStorage.setItem(DRAWER_HINT_SHOWN, '1'); }
    }, 60000);
    return () => clearTimeout(timer);
  }, []);

  const addOperation = (tool: string, description: string) => {
    const nextItem: OperationLogItem = { id: `${Date.now()}-${tool}`, tool, description, timeLabel: 'الآن', createdAt: Date.now() };
    setOperations(prev => {
      const next = [nextItem, ...prev].slice(0, 120);
      AsyncStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const showNotice = (title: string, message: string, confirmText = 'حسنًا', onConfirm?: () => void) => setNotice({ visible: true, title, message, confirmText, onConfirm });

  useEffect(() => {
    if (!isLoaded || Platform.OS !== 'android' || settings.assistantMode) return;
    showNotice('وضع المساعد', 'اختر من إعدادات تايبر طريقة عمل المساعد: عائم أو داخلي.', 'فتح الإعدادات', () => setScreen('settings'));
  }, [isLoaded, settings.assistantMode]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const syncProgress = async () => { const saved = await AsyncStorage.getItem(MAIN_SESSION_STORAGE_KEY); if (saved) setSession(JSON.parse(saved)); };
    const appStateSubscription = AppState.addEventListener('change', state => { if (state === 'active') syncProgress(); });
    const closeSubscription = floatingAssistantEvents?.addListener('FloatingAssistantClosed', syncProgress);
    return () => { appStateSubscription.remove(); closeSubscription?.remove(); };
  }, [setSession]);

  if (!isLoaded) return <View style={styles.loadingHost}><ActivityIndicator size="large" color="#F2A6B8" /></View>;

  const startFloatingAssistant = async (payload: string) => {
    const nextSession = parseText(payload);
    await AsyncStorage.setItem(MAIN_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    await persistFloatingSession(buildFloatingSession(nextSession.bubbles, nextSession.currentIndex, settings));
    addOperation('تايبر', `تم تشغيل النص ومعالجة ${nextSession.bubbles.length} فقاعة.`);
    if (!FloatingAssistantNative.isAvailable) return setScreen('assistant');
    const hasPermission = await FloatingAssistantNative.hasOverlayPermission();
    if (!hasPermission) return showNotice('إذن الظهور فوق التطبيقات', 'فعّل الإذن ثم أعد المحاولة.', 'فتح الإعدادات', () => FloatingAssistantNative.openOverlaySettings());
    await FloatingAssistantNative.start(JSON.stringify(buildFloatingSession(nextSession.bubbles, nextSession.currentIndex, settings)));
  };

  const handleStartRequested = (payload: string) => {
    if (Platform.OS === 'android' && settings.assistantMode === 'floating') return void startFloatingAssistant(payload);
    const nextSession = parseText(payload);
    addOperation('تايبر', `تم تشغيل النص ومعالجة ${nextSession.bubbles.length} فقاعة.`);
    setScreen('assistant');
  };

  const openDrawer = async () => { setDrawerVisible(v => !v); setShowDrawerHint(false); await AsyncStorage.setItem(DRAWER_OPENED, '1'); };

  const handleDrawerSelect = async (target: ToolScreen) => {
    setDrawerVisible(false);
    if (target === 'about') {
      try { await Linking.openURL(COOKIES_DISCORD_URL); addOperation('الدعم', 'تم فتح رابط Discord.'); } catch { showNotice('Discord', 'تعذر فتح رابط Discord.'); }
      return;
    }
    setScreen(target);
  };

  return (
    <SpaceBackground>
      <StatusBar style="light" />
      <View style={styles.viewPort}>
        {screen === 'typer' && <MainScreen inputText={session.inputText} onStart={handleStartRequested} onOpenSettings={() => setScreen('settings')} onOpenMenu={openDrawer} bubbleCount={session.bubbles.length} settings={settings} />}
        {screen === 'settings' && <SettingsScreen settings={settings} onSave={(cfg) => { setSettings(cfg); addOperation('الإعدادات', 'تم حفظ إعدادات تايبر.'); setScreen('typer'); }} onReset={() => setSettings({ ...DEFAULT_SETTINGS, assistantMode: Platform.OS === 'android' ? settings.assistantMode || 'inapp' : 'inapp' })} onAssistantModeChange={updateAssistantMode} onClose={() => setScreen('typer')} />}
        {screen === 'assistant' && <AssistantMode session={session} settings={settings} onNext={nextBubble} onPrev={prevBubble} onGoTo={goToBubble} onClose={() => setScreen('typer')} />}
        {screen === 'operations' && <OperationsScreen operations={operations} />}
        {screen === 'imageMerge' && <ImageMergeScreen onLog={(d) => addOperation('دمج الصور', d)} />}
        {showDrawerHint && screen === 'typer' && <View style={styles.hint}><Text style={styles.hintText}>اضغط هنا للوصول إلى دمج الصور وآخر العمليات</Text></View>}
      </View>
      <AppDrawer visible={drawerVisible} active={screen === 'assistant' || screen === 'settings' ? 'typer' : screen} onClose={() => setDrawerVisible(false)} onSelect={handleDrawerSelect} />
      <ThemedModal visible={notice.visible} title={notice.title} message={notice.message} confirmText={notice.confirmText} onConfirm={() => { setNotice(prev => ({ ...prev, visible: false })); notice.onConfirm?.(); }} onCancel={() => setNotice(prev => ({ ...prev, visible: false }))} />
    </SpaceBackground>
  );
}

const styles = StyleSheet.create({
  loadingHost: { flex: 1, backgroundColor: '#020202', justifyContent: 'center', alignItems: 'center' },
  viewPort: { flex: 1 },
  hint: { position: 'absolute', top: 78, right: 62, backgroundColor: 'rgba(0,0,0,0.88)', borderColor: 'rgba(242,166,184,0.45)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  hintText: { color: 'white', fontSize: 12 },
});
