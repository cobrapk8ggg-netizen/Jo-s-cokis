import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  SafeAreaView, 
  Platform,
  Alert,
  StatusBar as RNStatusBar,
  Animated,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, Plus, ChevronRight, Disc as DiscordIcon } from 'lucide-react-native';
import { AssistantModePreference, Settings, TagType } from '../types';
import { ASSISTANT_MODE_STORAGE_KEY } from '../floatingSession';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_GLOW = '#FFD1DC';
const COOKIES_PINK_DARK = '#C96F86';
const COOKIES_DISCORD_URL = 'https://discord.gg/cookiesteam';

const FONT_MIN = 12;
const FONT_MAX = 36;

const COLOR_OPTIONS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#ffffff',
  '#94a3b8',
];

interface SettingsScreenProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onReset: () => void;
  onAssistantModeChange?: (assistantMode: AssistantModePreference) => void;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings: initialSettings,
  onSave,
  onReset,
  onAssistantModeChange,
  onClose
}) => {
  const [settings, setSettings] = React.useState<Settings>(initialSettings);
  const [selectedColorTagId, setSelectedColorTagId] = React.useState<string | null>(null);
  const [rangeWidth, setRangeWidth] = React.useState(0);
  const toggleAnim = React.useRef(new Animated.Value(initialSettings.smartCleaner ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: settings.smartCleaner ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [settings.smartCleaner, toggleAnim]);

  const addTag = () => {
    const newTag: TagType = {
      id: Date.now().toString(),
      symbol: '',
      name: '',
      color: COOKIES_PINK
    };
    setSettings(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    setSelectedColorTagId(newTag.id);
  };

  const updateTag = (id: string, updates: Partial<TagType>) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const removeTag = (id: string) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== id)
    }));
    if (selectedColorTagId === id) {
      setSelectedColorTagId(null);
    }
  };

  const updateFontSizeFromPosition = (positionX: number) => {
    if (rangeWidth <= 0) return;

    const clampedPosition = Math.max(0, Math.min(positionX, rangeWidth));
    const ratio = clampedPosition / rangeWidth;
    const nextFontSize = Math.round(FONT_MIN + ratio * (FONT_MAX - FONT_MIN));

    setSettings(prev => ({
      ...prev,
      fontSize: nextFontSize,
    }));
  };

  const updateAssistantMode = async (assistantMode: AssistantModePreference) => {
    setSettings(prev => ({ ...prev, assistantMode }));
    onAssistantModeChange?.(assistantMode);
    await AsyncStorage.setItem(ASSISTANT_MODE_STORAGE_KEY, assistantMode);
  };

  const handleDiscordPress = async () => {
    try {
      await Linking.openURL(COOKIES_DISCORD_URL);
    } catch (e) {
      Alert.alert('Discord', 'تعذر فتح رابط سيرفر Cookies.');
    }
  };

  const toggleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Container */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <ChevronRight color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView 
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Font Size Configuration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardValue}>{settings.fontSize}</Text>
            <Text style={styles.cardLabel}>حجم نص الفقاعة</Text>
          </View>
          
          <View style={styles.rangeControl}>
            <View
              style={styles.rangeTrack}
              onLayout={(event) => setRangeWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => updateFontSizeFromPosition(event.nativeEvent.locationX)}
              onResponderMove={(event) => updateFontSizeFromPosition(event.nativeEvent.locationX)}
            >
              <View style={[styles.rangeProgress, { width: `${((settings.fontSize - FONT_MIN) / (FONT_MAX - FONT_MIN)) * 100}%` }]} />
              <View style={[styles.rangeThumb, { left: `${((settings.fontSize - FONT_MIN) / (FONT_MAX - FONT_MIN)) * 100}%` }]} />
            </View>
            <View style={styles.rangeTicks}>
              {[12, 18, 24, 30, 36].map(num => (
                <TouchableOpacity 
                  key={num} 
                  onPress={() => setSettings(s => ({ ...s, fontSize: num }))}
                  style={styles.tickBtn}
                >
                  <Text style={[styles.tickLabel, settings.fontSize === num && styles.activeTick]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tags Logic Manager */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>العلامات والألوان</Text>
          <View style={styles.tagsContainer}>
            {settings.tags.map(tag => (
              <View key={tag.id} style={styles.tagBlock}>
                <View style={styles.tagRow}>
                  {/* Trash Icon */}
                  <TouchableOpacity onPress={() => removeTag(tag.id)} style={styles.iconAction}>
                    <Trash2 color="#f43f5e" size={18} />
                  </TouchableOpacity>
                  
                  {/* Symbol Input */}
                  <TextInput
                    value={tag.symbol}
                    onChangeText={(v) => updateTag(tag.id, { symbol: v })}
                    placeholder="الرمز"
                    placeholderTextColor="#4b5563"
                    style={styles.symbolInput}
                  />
                  
                  {/* Name Input */}
                  <TextInput
                    value={tag.name}
                    onChangeText={(v) => updateTag(tag.id, { name: v })}
                    placeholder="الاسم"
                    placeholderTextColor="#4b5563"
                    style={styles.nameInput}
                  />

                  {/* Color Status Indicator */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedColorTagId(selectedColorTagId === tag.id ? null : tag.id)}
                    style={styles.colorIndicatorRow}
                  >
                    <View style={[styles.colorBox, { backgroundColor: tag.color }]} />
                  </TouchableOpacity>
                </View>

                {selectedColorTagId === tag.id && (
                  <View style={styles.colorPalette}>
                    {COLOR_OPTIONS.map(color => (
                      <TouchableOpacity
                        key={color}
                        activeOpacity={0.8}
                        onPress={() => updateTag(tag.id, { color })}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          tag.color.toLowerCase() === color.toLowerCase() && styles.activeColorOption
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={addTag} style={styles.plusBtn}>
              <Plus color="rgba(255,255,255,0.4)" size={18} strokeWidth={3} />
              <Text style={styles.plusBtnText}>+ إضافة علامة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Smart Cleaner Feature Toggle */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setSettings(s => ({ ...s, smartCleaner: !s.smartCleaner }))}
          style={styles.toggleCard}
        >
          <View style={styles.toggleMeta}>
            <Text style={styles.toggleTitle}>المنظف الذكي</Text>
            <Text style={styles.toggleDesc}>إصلاح المسافات والنقاط تلقائيًا</Text>
          </View>
          <View style={[styles.customToggleOuter, settings.smartCleaner ? styles.toggleOn : styles.toggleOff]}>
            <Animated.View style={[styles.customToggleInner, { transform: [{ translateX: toggleTranslateX }] }]} />
          </View>
        </TouchableOpacity>

        {Platform.OS === 'android' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>وضع المساعد</Text>
            <Text style={styles.assistantModeDesc}>
              اختر طريقة فتح الجلسة القادمة عند الضغط على START. لا يؤثر هذا على جلسة مفتوحة حالياً.
            </Text>
            <View style={styles.assistantModeOptions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => updateAssistantMode('floating')}
                style={[
                  styles.assistantModeOption,
                  settings.assistantMode === 'floating' && styles.activeAssistantModeOption,
                ]}
              >
                <Text style={styles.assistantModeTitle}>عائم</Text>
                <Text style={styles.assistantModeHint}>فوق التطبيقات الأخرى</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => updateAssistantMode('inapp')}
                style={[
                  styles.assistantModeOption,
                  (settings.assistantMode || 'inapp') === 'inapp' && styles.activeAssistantModeOption,
                ]}
              >
                <Text style={styles.assistantModeTitle}>داخلي</Text>
                <Text style={styles.assistantModeHint}>داخل CookiesTyper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Official Discord Card */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleDiscordPress} style={styles.discordCard}>
          <View style={styles.discordIconWrapper}>
            <DiscordIcon color={COOKIES_PINK_DARK} size={21} />
          </View>
          <View style={styles.discordMeta}>
            <Text style={styles.discordLabel}>إبلاغ عن مشكلة /! إرسال اقتراح</Text>
            <Text style={styles.discordSubLabel}>Open Cookies Discord Server</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'ios' ? 132 : 118 }} />
      </ScrollView>

      {/* Persistent Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          onPress={() => onSave(settings)}
          activeOpacity={0.8}
          style={styles.saveActionButton}
        >
          <Text style={styles.actionText}>SAVE</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              'Reset Settings',
              'هل أنت متأكد من إعادة تعيين الإعدادات الافتراضية؟',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', onPress: onReset, style: 'destructive' }
              ]
            );
          }}
          activeOpacity={0.8}
          style={styles.resetActionButton}
        >
          <Text style={styles.resetActionText}>RESET</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 18,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: '900',
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollArea: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  card: {
    backgroundColor: 'rgba(15,15,15,0.6)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    color: COOKIES_PINK,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
  },
  rangeControl: {
    paddingVertical: 8,
  },
  rangeTrack: {
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'visible',
    justifyContent: 'center',
  },
  rangeProgress: {
    height: 6,
    backgroundColor: COOKIES_PINK_DARK,
    borderRadius: 10,
  },
  rangeThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 100,
    backgroundColor: COOKIES_PINK_GLOW,
    borderWidth: 3,
    borderColor: COOKIES_PINK_DARK,
    shadowColor: COOKIES_PINK_DARK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 6,
    elevation: 5,
  },
  rangeTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  tickBtn: {
    padding: 6,
  },
  tickLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTick: {
    color: COOKIES_PINK_GLOW,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'right',
  },
  tagsContainer: {
    gap: 8,
  },
  tagBlock: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  iconAction: {
    padding: 6,
  },
  symbolInput: {
    width: 56,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: 'white',
    textAlign: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  nameInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: 'white',
    textAlign: 'right',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  colorIndicatorRow: {
    padding: 4,
  },
  colorBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  colorPalette: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  colorOption: {
    width: 20,
    height: 20,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  activeColorOption: {
    borderColor: 'white',
    transform: [{ scale: 1.08 }],
  },
  plusBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 15,
    gap: 10,
    marginTop: 10,
  },
  plusBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.6)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  toggleMeta: {
    flex: 1,
  },
  toggleTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'right',
  },
  toggleDesc: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  customToggleOuter: {
    width: 50,
    height: 28,
    borderRadius: 100,
    padding: 4,
    overflow: 'hidden',
  },
  toggleOn: {
    backgroundColor: COOKIES_PINK,
  },
  toggleOff: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  customToggleInner: {
    width: 20,
    height: 20,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowRadius: 2,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  assistantModeDesc: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 12,
    lineHeight: 21,
    textAlign: 'right',
    marginBottom: 16,
  },
  assistantModeOptions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  assistantModeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeAssistantModeOption: {
    backgroundColor: 'rgba(242,166,184,0.14)',
    borderColor: 'rgba(242,166,184,0.55)',
  },
  assistantModeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  assistantModeHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'right',
  },
  discordCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(242,166,184,0.05)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,166,184,0.16)',
  },
  discordIconWrapper: {
    padding: 8,
    backgroundColor: 'rgba(242,166,184,0.12)',
    borderRadius: 100,
  },
  discordMeta: {
    flex: 1,
  },
  discordLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  discordSubLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#020202',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  saveActionButton: {
    flex: 2,
    backgroundColor: COOKIES_PINK,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COOKIES_PINK_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 4,
  },
  resetActionButton: {
    flex: 1,
    backgroundColor: 'rgba(244,63,94,0.08)',
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(244,63,94,0.2)',
  },
  resetActionText: {
    color: '#f43f5e',
    fontSize: 16,
    fontWeight: '900',
  },
});