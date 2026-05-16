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
  Dimensions,
  Animated,
  Linking
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, Plus, ChevronRight, Disc as DiscordIcon } from 'lucide-react-native';
import { AssistantModePreference, Settings, TagType } from '../types';
import { ASSISTANT_MODE_STORAGE_KEY } from '../floatingSession';

const { width } = Dimensions.get('window');

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
      color: '#A855F7'
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
    await Clipboard.setStringAsync('yassiniq');

    const discordAppUrl = 'discord://';
    const discordWebUrl = 'https://discord.com/app';

    try {
      const canOpenDiscord = await Linking.canOpenURL(discordAppUrl);
      if (canOpenDiscord) {
        await Linking.openURL(discordAppUrl);
      } else {
        await Linking.openURL(discordWebUrl);
      }
    } catch (e) {
      Alert.alert('Copied', 'تم نسخ yassiniq');
    }
  };

  const toggleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 0],
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Container */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <ChevronRight color="white" size={28} />
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
                    <Trash2 color="#f43f5e" size={20} />
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
              <Plus color="rgba(255,255,255,0.4)" size={20} strokeWidth={3} />
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
                <Text style={styles.assistantModeHint}>داخل CookieTyper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Official Discord Card */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleDiscordPress} style={styles.discordCard}>
          <View style={styles.discordIconWrapper}>
            <DiscordIcon color="#6366f1" size={24} />
          </View>
          <View style={styles.discordMeta}>
            <Text style={styles.discordLabel}>إبلاغ عن مشكلة /! إرسال اقتراح</Text>
            <Text style={styles.discordSubLabel}>Copy yassiniq' & Open Discord</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 160 }} />
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
    padding: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 34,
    fontWeight: '900',
  },
  backBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  card: {
    backgroundColor: 'rgba(15,15,15,0.6)',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 17,
    fontWeight: '600',
  },
  cardValue: {
    color: '#a855f7',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
  },
  rangeControl: {
    paddingVertical: 8,
  },
  rangeTrack: {
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'visible',
    justifyContent: 'center',
  },
  rangeProgress: {
    height: 6,
    backgroundColor: '#9333ea',
    borderRadius: 10,
  },
  rangeThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 100,
    backgroundColor: '#d8b4fe',
    borderWidth: 3,
    borderColor: '#7c3aed',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  rangeTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  tickBtn: {
    padding: 6,
  },
  tickLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTick: {
    color: '#d8b4fe',
  },
  cardTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'right',
  },
  tagsContainer: {
    gap: 14,
  },
  tagBlock: {
    gap: 10,
  },
  tagRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  iconAction: {
    padding: 6,
  },
  symbolInput: {
    width: 65,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: 'white',
    textAlign: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: 'bold',
  },
  nameInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: 'white',
    textAlign: 'right',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  colorIndicatorRow: {
    padding: 4,
  },
  colorBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  colorPalette: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  colorOption: {
    width: 28,
    height: 28,
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
    padding: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    gap: 12,
    marginTop: 10,
  },
  plusBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 17,
    fontWeight: '700',
  },
  toggleCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.6)',
    borderRadius: 26,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  toggleMeta: {
    flex: 1,
  },
  toggleTitle: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'right',
  },
  toggleDesc: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right',
  },
  customToggleOuter: {
    width: 58,
    height: 32,
    borderRadius: 100,
    padding: 4,
    overflow: 'hidden',
  },
  toggleOn: {
    backgroundColor: '#7c3aed',
  },
  toggleOff: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  customToggleInner: {
    width: 24,
    height: 24,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowRadius: 2,
    shadowOpacity: 0.2,
    elevation: 2,
  },
  assistantModeDesc: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
    marginBottom: 16,
  },
  assistantModeOptions: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  assistantModeOption: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeAssistantModeOption: {
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(168,85,247,0.55)',
  },
  assistantModeTitle: {
    color: 'white',
    fontSize: 18,
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
    gap: 16,
    backgroundColor: 'rgba(99,102,241,0.05)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  discordIconWrapper: {
    padding: 10,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 100,
  },
  discordMeta: {
    flex: 1,
  },
  discordLabel: {
    color: 'white',
    fontSize: 15,
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
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#020202',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  saveActionButton: {
    flex: 2,
    backgroundColor: '#7c3aed',
    padding: 20,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
  },
  resetActionButton: {
    flex: 1,
    backgroundColor: 'rgba(244,63,94,0.08)',
    padding: 20,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(244,63,94,0.2)',
  },
  resetActionText: {
    color: '#f43f5e',
    fontSize: 18,
    fontWeight: '900',
  },
});