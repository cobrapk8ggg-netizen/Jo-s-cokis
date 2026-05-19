import React from 'react';
import {
  Animated,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, Disc as DiscordIcon, Edit3, FileType, Plus, RotateCcw, Trash2, X } from 'lucide-react-native';
import { AssistantModePreference, Settings, TagType } from '../types';
import { ASSISTANT_MODE_STORAGE_KEY } from '../floatingSession';
import { ASSISTANT_SCALE_MAX, ASSISTANT_SCALE_MIN, clampAssistantScale, restoreDefaultTagsWithoutCustomLoss } from '../defaults';
import { ThemedModal } from './ThemedModal';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_GLOW = '#FFD1DC';
const COOKIES_PINK_DARK = '#C96F86';
const COOKIES_DISCORD_URL = 'https://discord.gg/cookiesteam';

const FONT_MIN = 12;
const FONT_MAX = 36;

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#eab308', '#f59e0b', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#e5e7eb', '#94a3b8',
];

type DialogState =
  | { type: 'none' }
  | { type: 'editTag'; tag?: TagType }
  | { type: 'deleteTag'; tag: TagType }
  | { type: 'restoreDefaults' }
  | { type: 'reset' }
  | { type: 'error'; title: string; message: string };

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
  onClose,
}) => {
  const [settings, setSettings] = React.useState<Settings>({
    ...initialSettings,
    assistantScale: clampAssistantScale(initialSettings.assistantScale),
  });
  const [fontRangeWidth, setFontRangeWidth] = React.useState(0);
  const [scaleRangeWidth, setScaleRangeWidth] = React.useState(0);
  const [dialog, setDialog] = React.useState<DialogState>({ type: 'none' });
  const toggleAnim = React.useRef(new Animated.Value(initialSettings.smartCleaner ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: settings.smartCleaner ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [settings.smartCleaner, toggleAnim]);

  const updateFontSizeFromPosition = (positionX: number) => {
    if (fontRangeWidth <= 0) return;
    const ratio = Math.max(0, Math.min(positionX, fontRangeWidth)) / fontRangeWidth;
    setSettings(prev => ({ ...prev, fontSize: Math.round(FONT_MIN + ratio * (FONT_MAX - FONT_MIN)) }));
  };

  const updateScaleFromPosition = (positionX: number) => {
    if (scaleRangeWidth <= 0) return;
    const ratio = Math.max(0, Math.min(positionX, scaleRangeWidth)) / scaleRangeWidth;
    setSettings(prev => ({ ...prev, assistantScale: clampAssistantScale(ASSISTANT_SCALE_MIN + ratio * (ASSISTANT_SCALE_MAX - ASSISTANT_SCALE_MIN)) }));
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
      setDialog({ type: 'error', title: 'Discord', message: 'تعذر فتح رابط سيرفر Cookies.' });
    }
  };

  const saveTag = (tag: TagType) => {
    const normalizedTag = { ...tag, symbol: tag.symbol.trim(), name: tag.name.trim(), color: tag.color || COOKIES_PINK };
    if (!normalizedTag.symbol || !normalizedTag.name) {
      setDialog({ type: 'error', title: 'بيانات العلامة', message: 'اكتب رمز العلامة واسمها قبل الحفظ.' });
      return;
    }

    setSettings(prev => {
      const exists = prev.tags.some(item => item.id === normalizedTag.id);
      return {
        ...prev,
        tags: exists
          ? prev.tags.map(item => item.id === normalizedTag.id ? normalizedTag : item)
          : [...prev.tags, normalizedTag],
      };
    });
    setDialog({ type: 'none' });
  };

  const deleteTag = (tag: TagType) => {
    setSettings(prev => ({ ...prev, tags: prev.tags.filter(item => item.id !== tag.id) }));
    setDialog({ type: 'none' });
  };

  const toggleTranslateX = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
  const fontRatio = (settings.fontSize - FONT_MIN) / (FONT_MAX - FONT_MIN);
  const scaleRatio = (settings.assistantScale - ASSISTANT_SCALE_MIN) / (ASSISTANT_SCALE_MAX - ASSISTANT_SCALE_MIN);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <ChevronRight color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات Typer</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardValue}>{settings.fontSize}</Text>
            <Text style={styles.cardLabel}>حجم نص الفقاعة</Text>
          </View>
          <SliderLike
            ratio={fontRatio}
            onLayoutWidth={setFontRangeWidth}
            onMove={updateFontSizeFromPosition}
            ticks={[12, 18, 24, 30, 36]}
            activeValue={settings.fontSize}
            onTick={num => setSettings(prev => ({ ...prev, fontSize: num }))}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardValue}>{settings.assistantScale}%</Text>
            <Text style={styles.cardLabel}>حجم المساعد العائم</Text>
          </View>
          <Text style={styles.sectionHint}>يتحكم بالحجم الكامل للمساعد: الصندوق، النص، الأسهم، السلايدر، والهوامش معًا.</Text>
          <SliderLike
            ratio={scaleRatio}
            onLayoutWidth={setScaleRangeWidth}
            onMove={updateScaleFromPosition}
            ticks={[60, 70, 80, 90, 100, 110, 120]}
            activeValue={settings.assistantScale}
            suffix="%"
            onTick={num => setSettings(prev => ({ ...prev, assistantScale: num }))}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <TouchableOpacity onPress={() => setDialog({ type: 'restoreDefaults' })} style={styles.restoreButton} activeOpacity={0.85}>
              <RotateCcw color={COOKIES_PINK} size={15} />
              <Text style={styles.restoreText}>استعادة الافتراضية</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>العلامات والتنسيق</Text>
          </View>
          <View style={styles.tagsContainer}>
            {settings.tags.map(tag => (
              <TouchableOpacity key={tag.id} activeOpacity={0.85} onPress={() => setDialog({ type: 'editTag', tag })} style={styles.tagRow}>
                <TouchableOpacity onPress={() => setDialog({ type: 'deleteTag', tag })} style={styles.iconAction}>
                  <Trash2 color="#f43f5e" size={17} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDialog({ type: 'editTag', tag })} style={styles.iconAction}>
                  <Edit3 color={COOKIES_PINK} size={16} />
                </TouchableOpacity>
                {tag.fontName && <FileType color="#93c5fd" size={16} />}
                <Text style={styles.tagName} numberOfLines={1}>{tag.name}</Text>
                <Text style={styles.tagSymbol} numberOfLines={1}>{tag.symbol}</Text>
                <View style={[styles.colorBox, { backgroundColor: tag.color }]} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setDialog({ type: 'editTag' })} style={styles.plusBtn}>
              <Plus color="rgba(255,255,255,0.55)" size={18} strokeWidth={3} />
              <Text style={styles.plusBtnText}>إضافة علامة</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setSettings(prev => ({ ...prev, smartCleaner: !prev.smartCleaner }))} style={styles.toggleCard}>
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
            <Text style={styles.assistantModeDesc}>اختر طريقة فتح الجلسة القادمة عند الضغط على START. لا يؤثر هذا على جلسة مفتوحة حالياً.</Text>
            <View style={styles.assistantModeOptions}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => updateAssistantMode('floating')} style={[styles.assistantModeOption, settings.assistantMode === 'floating' && styles.activeAssistantModeOption]}>
                <Text style={styles.assistantModeTitle}>عائم</Text>
                <Text style={styles.assistantModeHint}>فوق التطبيقات الأخرى</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => updateAssistantMode('inapp')} style={[styles.assistantModeOption, (settings.assistantMode || 'inapp') === 'inapp' && styles.activeAssistantModeOption]}>
                <Text style={styles.assistantModeTitle}>داخلي</Text>
                <Text style={styles.assistantModeHint}>داخل CookieTyper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity activeOpacity={0.85} onPress={handleDiscordPress} style={styles.discordCard}>
          <View style={styles.discordIconWrapper}><DiscordIcon color={COOKIES_PINK_DARK} size={21} /></View>
          <View style={styles.discordMeta}>
            <Text style={styles.discordLabel}>إبلاغ / Discord</Text>
            <Text style={styles.discordSubLabel}>فتح سيرفر Cookies على Discord</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'ios' ? 132 : 118 }} />
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity onPress={() => onSave(settings)} activeOpacity={0.8} style={styles.saveActionButton}>
          <Text style={styles.actionText}>حفظ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDialog({ type: 'reset' })} activeOpacity={0.8} style={styles.resetActionButton}>
          <Text style={styles.resetActionText}>إعادة ضبط</Text>
        </TouchableOpacity>
      </View>

      <TagEditorModal
        visible={dialog.type === 'editTag'}
        tag={dialog.type === 'editTag' ? dialog.tag : undefined}
        onSave={saveTag}
        onClose={() => setDialog({ type: 'none' })}
        onError={(title, message) => setDialog({ type: 'error', title, message })}
      />

      <ThemedModal
        visible={dialog.type === 'deleteTag'}
        title="حذف العلامة"
        message={dialog.type === 'deleteTag' ? `هل تريد حذف علامة ${dialog.tag.name}؟ لن يتم حذف أي علامة أخرى.` : ''}
        confirmText="حذف"
        destructive
        onConfirm={() => dialog.type === 'deleteTag' && deleteTag(dialog.tag)}
        onCancel={() => setDialog({ type: 'none' })}
      />

      <ThemedModal
        visible={dialog.type === 'restoreDefaults'}
        title="استعادة العلامات الافتراضية"
        message="سيتم استعادة العلامات الافتراضية مع الإبقاء على علاماتك المخصصة، ولن يتم رفع أو مشاركة أي بيانات."
        confirmText="استعادة"
        onConfirm={() => {
          setSettings(prev => ({ ...prev, tags: restoreDefaultTagsWithoutCustomLoss(prev.tags) }));
          setDialog({ type: 'none' });
        }}
        onCancel={() => setDialog({ type: 'none' })}
      />

      <ThemedModal
        visible={dialog.type === 'reset'}
        title="إعادة ضبط الإعدادات"
        message="هل تريد إعادة تعيين إعدادات Typer؟ سيتم استخدام إعدادات التطبيق الافتراضية."
        confirmText="Reset"
        destructive
        onConfirm={() => { setDialog({ type: 'none' }); onReset(); onClose(); }}
        onCancel={() => setDialog({ type: 'none' })}
      />

      <ThemedModal
        visible={dialog.type === 'error'}
        title={dialog.type === 'error' ? dialog.title : ''}
        message={dialog.type === 'error' ? dialog.message : ''}
        confirmText="حسنًا"
        onConfirm={() => setDialog({ type: 'none' })}
        onCancel={() => setDialog({ type: 'none' })}
      />
    </SafeAreaView>
  );
};

type SliderLikeProps = {
  ratio: number;
  ticks: number[];
  activeValue: number;
  suffix?: string;
  onLayoutWidth: (width: number) => void;
  onMove: (position: number) => void;
  onTick: (value: number) => void;
};

const SliderLike: React.FC<SliderLikeProps> = ({ ratio, ticks, activeValue, suffix = '', onLayoutWidth, onMove, onTick }) => (
  <View style={styles.rangeControl}>
    <View
      style={styles.rangeTrack}
      onLayout={(event) => onLayoutWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => onMove(event.nativeEvent.locationX)}
      onResponderMove={(event) => onMove(event.nativeEvent.locationX)}
    >
      <View style={[styles.rangeProgress, { width: `${ratio * 100}%` }]} />
      <View style={[styles.rangeThumb, { left: `${ratio * 100}%` }]} />
    </View>
    <View style={styles.rangeTicks}>
      {ticks.map(num => (
        <TouchableOpacity key={num} onPress={() => onTick(num)} style={styles.tickBtn}>
          <Text style={[styles.tickLabel, activeValue === num && styles.activeTick]}>{num}{suffix}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

type TagEditorModalProps = {
  visible: boolean;
  tag?: TagType;
  onSave: (tag: TagType) => void;
  onClose: () => void;
  onError: (title: string, message: string) => void;
};

const TagEditorModal: React.FC<TagEditorModalProps> = ({ visible, tag, onSave, onClose, onError }) => {
  const [draft, setDraft] = React.useState<TagType>(tag || { id: Date.now().toString(), symbol: '', name: '', color: COOKIES_PINK });

  React.useEffect(() => {
    if (visible) setDraft(tag || { id: Date.now().toString(), symbol: '', name: '', color: COOKIES_PINK });
  }, [tag, visible]);

  const chooseFont = () => {
    onError('اختيار الخط', 'اختيار ملفات الخط يحتاج إضافة منتقي ملفات أصلي في نسخة البناء. الخطوط المدعومة هي TTF و OTF، ولن يتم رفع أي خط خارج الجهاز.');
  };

  return (
    <ThemedModal visible={visible} title={tag ? 'تعديل علامة' : 'إضافة علامة'} variant="sheet" onCancel={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>رمز العلامة</Text>
        <TextInput value={draft.symbol} onChangeText={symbol => setDraft(prev => ({ ...prev, symbol }))} placeholder="مثال: ()" placeholderTextColor="#5b6472" style={styles.sheetInput} />
        <Text style={styles.fieldLabel}>اسم العلامة</Text>
        <TextInput value={draft.name} onChangeText={name => setDraft(prev => ({ ...prev, name }))} placeholder="مثال: تفكير" placeholderTextColor="#5b6472" style={styles.sheetInput} />
        <Text style={styles.fieldLabel}>اللون</Text>
        <View style={styles.colorPalette}>
          {COLOR_OPTIONS.map(color => (
            <TouchableOpacity key={color} onPress={() => setDraft(prev => ({ ...prev, color }))} style={[styles.colorOption, { backgroundColor: color }, draft.color.toLowerCase() === color.toLowerCase() && styles.activeColorOption]} />
          ))}
        </View>
        <Text style={styles.fieldLabel}>الخط (اختياري)</Text>
        <View style={styles.fontPanel}>
          <TouchableOpacity activeOpacity={0.85} onPress={chooseFont} style={styles.fontButton}>
            <FileType color={COOKIES_PINK} size={18} />
            <Text style={styles.fontButtonText}>اختيار خط من ملفات الجهاز</Text>
          </TouchableOpacity>
          <Text style={styles.fontStatus}>{draft.fontName ? `الخط المختار: ${draft.fontName}` : 'لا يوجد خط مخصص - سيتم استخدام خط التطبيق.'}</Text>
          {!!draft.fontName && (
            <TouchableOpacity onPress={() => setDraft(prev => ({ ...prev, fontName: undefined, fontUri: undefined }))} style={styles.removeFontButton}>
              <X color="#f43f5e" size={15} />
              <Text style={styles.removeFontText}>إزالة الخط</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.fieldLabel}>معاينة مباشرة</Text>
        <View style={[styles.previewBubble, { borderColor: draft.color, backgroundColor: `${draft.color}22` }]}>
          <Text style={[styles.previewTagName, { color: draft.color }]}>{draft.name || 'اسم العلامة'}</Text>
          <Text style={[styles.previewText, { fontFamily: draft.fontName || undefined }]}>تجربة الفقاعة</Text>
        </View>
        <View style={styles.editorActions}>
          <TouchableOpacity onPress={onClose} style={styles.editorCancel}><Text style={styles.editorCancelText}>إلغاء</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave(draft)} style={styles.editorSave}><Text style={styles.editorSaveText}>حفظ</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedModal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 18, paddingBottom: 10 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
  backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scrollArea: { paddingHorizontal: 18, paddingTop: 4 },
  card: { backgroundColor: 'rgba(15,15,15,0.6)', borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  cardValue: { color: COOKIES_PINK, fontSize: 15, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace' },
  sectionHint: { color: 'rgba(255,255,255,0.38)', fontSize: 12, lineHeight: 20, textAlign: 'right', marginBottom: 8 },
  rangeControl: { paddingVertical: 8 },
  rangeTrack: { height: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'visible', justifyContent: 'center' },
  rangeProgress: { height: 6, backgroundColor: COOKIES_PINK_DARK, borderRadius: 10 },
  rangeThumb: { position: 'absolute', width: 18, height: 18, marginLeft: -9, borderRadius: 100, backgroundColor: COOKIES_PINK_GLOW, borderWidth: 3, borderColor: COOKIES_PINK_DARK },
  rangeTicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  tickBtn: { paddingVertical: 4, paddingHorizontal: 3 },
  tickLabel: { color: 'rgba(255,255,255,0.32)', fontSize: 11, fontWeight: '800' },
  activeTick: { color: COOKIES_PINK },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  restoreButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(242,166,184,0.08)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,166,184,0.16)' },
  restoreText: { color: COOKIES_PINK, fontSize: 12, fontWeight: '800' },
  tagsContainer: { gap: 8 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  iconAction: { padding: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10 },
  tagName: { flex: 1, color: 'white', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  tagSymbol: { color: COOKIES_PINK, minWidth: 34, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  colorBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  plusBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)', borderRadius: 15, gap: 10, marginTop: 4 },
  plusBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '800' },
  toggleCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,15,15,0.6)', borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
  toggleMeta: { flex: 1 },
  toggleTitle: { color: 'white', fontSize: 17, fontWeight: '900', textAlign: 'right' },
  toggleDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4, textAlign: 'right' },
  customToggleOuter: { width: 50, height: 28, borderRadius: 100, padding: 4, overflow: 'hidden' },
  toggleOn: { backgroundColor: COOKIES_PINK },
  toggleOff: { backgroundColor: 'rgba(255,255,255,0.1)' },
  customToggleInner: { width: 20, height: 20, borderRadius: 50, backgroundColor: 'white' },
  assistantModeDesc: { color: 'rgba(255,255,255,0.38)', fontSize: 12, lineHeight: 21, textAlign: 'right', marginBottom: 16 },
  assistantModeOptions: { flexDirection: 'row-reverse', gap: 10 },
  assistantModeOption: { flex: 1, padding: 16, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  activeAssistantModeOption: { backgroundColor: 'rgba(242,166,184,0.14)', borderColor: 'rgba(242,166,184,0.55)' },
  assistantModeTitle: { color: 'white', fontSize: 16, fontWeight: '900', textAlign: 'right' },
  assistantModeHint: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 5, textAlign: 'right' },
  discordCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: 'rgba(242,166,184,0.05)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(242,166,184,0.16)' },
  discordIconWrapper: { padding: 8, backgroundColor: 'rgba(242,166,184,0.12)', borderRadius: 100 },
  discordMeta: { flex: 1 },
  discordLabel: { color: 'white', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  discordSubLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4, textAlign: 'right' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 20, flexDirection: 'row', gap: 12, backgroundColor: '#020202', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  saveActionButton: { flex: 2, backgroundColor: COOKIES_PINK, padding: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: 4 },
  resetActionButton: { flex: 1, backgroundColor: 'rgba(244,63,94,0.08)', padding: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(244,63,94,0.2)' },
  resetActionText: { color: '#f43f5e', fontSize: 16, fontWeight: '900' },
  fieldLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 12, marginBottom: 7 },
  sheetInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, color: 'white', paddingHorizontal: 12, paddingVertical: 11, textAlign: 'right', fontSize: 15 },
  colorPalette: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, backgroundColor: 'rgba(255,255,255,0.035)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  colorOption: { width: 23, height: 23, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  activeColorOption: { borderColor: 'white', transform: [{ scale: 1.08 }] },
  fontPanel: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  fontButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(242,166,184,0.08)', borderRadius: 14, paddingVertical: 12 },
  fontButtonText: { color: COOKIES_PINK, fontWeight: '900', fontSize: 14 },
  fontStatus: { color: 'rgba(255,255,255,0.5)', marginTop: 9, textAlign: 'right', fontSize: 12 },
  removeFontButton: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  removeFontText: { color: '#f43f5e', fontWeight: '800', fontSize: 12 },
  previewBubble: { borderWidth: 1.5, borderRadius: 18, padding: 16, minHeight: 86, justifyContent: 'center', alignItems: 'center' },
  previewTagName: { fontSize: 11, fontWeight: '900', marginBottom: 8 },
  previewText: { color: 'white', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  editorCancel: { flex: 1, padding: 13, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)' },
  editorCancelText: { color: 'rgba(255,255,255,0.8)', fontWeight: '800' },
  editorSave: { flex: 1.3, padding: 13, alignItems: 'center', borderRadius: 16, backgroundColor: COOKIES_PINK },
  editorSaveText: { color: 'white', fontWeight: '900' },
});
