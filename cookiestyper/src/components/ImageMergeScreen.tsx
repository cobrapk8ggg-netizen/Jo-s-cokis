import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Trash2,
  Settings2,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_DARK = '#C96F86';
const BG_CARD = 'rgba(15,15,15,0.6)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const TEXT_HINT = 'rgba(255,255,255,0.38)';
const GAP = 0; // تم جعله 0 لدمج احترافي بدون فراغات بيضاء، يمكنك تغييره إن أردت

// قم بتغيير هذا الرابط إلى رابط خادمك على Railway
const SERVER_URL = 'https://oppp-production.up.railway.app';

type MergeImageItem = {
  id: string;
  uri: string;
  name: string;
  mimeType?: string | null;
  width?: number;
  height?: number;
};

export function ImageMergeScreen({
  onOpenMenu,
  onAddOperation,
}: {
  onOpenMenu: () => void;
  onAddOperation: (payload: {
    tool: string;
    description: string;
    details?: string;
  }) => void;
}) {
  const [images, setImages] = useState<MergeImageItem[]>([]);
  const [unifyWidth, setUnifyWidth] = useState(true);
  const [outputName, setOutputName] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [mergedImageUri, setMergedImageUri] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // أنميشن للواجهة الأسطورية
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getErrorMessage = (error: any) => {
    return (
      error?.message ||
      error?.toString?.() ||
      'خطأ غير معروف'
    );
  };

  const downloadResultToLocalFile = async (resultUrl: string): Promise<string | null> => {
    try {
      const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;

      if (!baseDirectory) {
        console.error('No local directory available for saving merged image.');
        return null;
      }

      const localFileName = `merged_result_${Date.now()}.png`;
      const localFileUri = baseDirectory + localFileName;

      const downloaded = await FileSystem.downloadAsync(
        resultUrl,
        localFileUri,
        {
          headers: {
            Accept: 'image/png,image/*,*/*',
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (downloaded.status !== 200) {
        console.error('Result download failed:', downloaded.status, downloaded);
        return null;
      }

      const fileInfo = await FileSystem.getInfoAsync(downloaded.uri, {
        size: true,
      });

      if (!fileInfo.exists) {
        console.error('Downloaded merged file does not exist:', downloaded.uri);
        return null;
      }

      return downloaded.uri;
    } catch (error) {
      console.error('Download merged result failed:', error);
      return null;
    }
  };

  const saveLocalImageToDevice = async (localUri: string) => {
    const fileInfo = await FileSystem.getInfoAsync(localUri, {
      size: true,
    });

    if (!fileInfo.exists) {
      throw new Error('ملف الصورة غير موجود داخل التطبيق.');
    }

    const permission = await MediaLibrary.requestPermissionsAsync(false);

    if (!permission.granted) {
      throw new Error('مطلوب إذن الوصول إلى المكتبة لحفظ الصورة.');
    }

    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch (saveError) {
      console.error('saveToLibraryAsync failed, trying createAssetAsync:', saveError);

      const asset = await MediaLibrary.createAssetAsync(localUri);
      const album = await MediaLibrary.getAlbumAsync('CookieTyper');

      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('CookieTyper', asset, false);
      }
    }
  };

  // دالة رفع الصور للخادم والدمج
  const uploadAndMerge = async (): Promise<string | null> => {
    if (images.length === 0) return null;

    setIsMerging(true);
    try {
      const formData = new FormData();

      // إضافة كل الصور إلى FormData
      images.forEach((img, index) => {
        formData.append('images', {
          uri: img.uri,
          type: img.mimeType || 'image/png',
          name: img.name || `image_${index}.png`,
        } as any);
      });

      // إرسال إعداد توحيد العرض
      formData.append('unifyWidth', unifyWidth ? 'true' : 'false');

      // إرسال الطلب إلى الخادم
      const response = await fetch(`${SERVER_URL}/merge`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Server error:', response.status, responseText);
        return null;
      }

      const data = JSON.parse(responseText);

      if (!data?.url) {
        console.error('No result URL returned:', data);
        return null;
      }

      // تحميل الصورة الناتجة فورًا من الرابط إلى ملف محلي داخل الجهاز
      const localUri = await downloadResultToLocalFile(data.url);

      if (!localUri) {
        console.error('Failed to download result image to local file.');
        return null;
      }

      return localUri;
    } catch (error) {
      console.error('Merge upload failed', error);
      return null;
    } finally {
      setIsMerging(false);
    }
  };

  const mergeStart = async () => {
    if (!images.length) return;
    const uri = await uploadAndMerge();
    if (uri) {
      setMergedImageUri(uri);
      setResultReady(true);

      try {
        await saveLocalImageToDevice(uri);

        onAddOperation({
          tool: 'دمج الصور',
          description: `تم توليد ناتج دمج عمودي لـ ${images.length} صور بجودة أصلية وحفظه تلقائيًا في الجهاز.`,
        });

        alert('تم الدمج وحفظ الصورة تلقائيًا في الاستوديو بنجاح!');
      } catch (error) {
        console.error('Auto save failed:', error);

        onAddOperation({
          tool: 'دمج الصور',
          description: `تم توليد ناتج دمج عمودي لـ ${images.length} صور بجودة أصلية.`,
        });

        alert(`تم الدمج بنجاح، لكن فشل الحفظ التلقائي: ${getErrorMessage(error)}`);
      }
    } else {
      alert('فشل الدمج على الخادم، تأكد من اتصالك بالإنترنت ومن أن الخادم يعمل.');
    }
  };

  const saveResult = async () => {
    if (!mergedImageUri) {
      alert('لا توجد صورة مدمجة للحفظ. قم بالدمج أولاً.');
      return;
    }

    try {
      const fileName = `${(outputName || `merged_${Date.now()}`).replace(
        /\s+/g,
        '_'
      )}.png`;

      await saveLocalImageToDevice(mergedImageUri);

      onAddOperation({
        tool: 'دمج الصور',
        description: `تم دمج ${images.length} صور عموديًا وحفظها باسم ${fileName}.`,
      });
      alert('تم حفظ الصورة في المعرض بأعلى جودة بنجاح!');
    } catch (error) {
      console.error('Save failed full error:', error);
      alert(`فشل الحفظ: ${getErrorMessage(error)}`);
    }
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
    });
    if (result.canceled) return;
    const accepted = result.assets.filter(
      (asset) =>
        (asset.mimeType || '').includes('png') ||
        (asset.mimeType || '').includes('jpeg') ||
        (asset.mimeType || '').includes('jpg') ||
        asset.uri.match(/\.(png|jpe?g)$/i)
    );
    const mapped = accepted.map((asset) => ({
      id: `${Date.now()}-${asset.uri}`,
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}`,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
    }));
    setImages((prev) => [...prev, ...mapped]);
    setResultReady(false);
    setMergedImageUri(null);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    setImages(copy);
    setResultReady(false);
    setMergedImageUri(null);
  };

  const removeImage = (id: string) => {
    const image = images.find((i) => i.id === id);
    setImages((prev) => prev.filter((i) => i.id !== id));
    setResultReady(false);
    setMergedImageUri(null);
    onAddOperation({
      tool: 'دمج الصور',
      description: `تم حذف صورة من المشروع: ${image?.name || 'صورة'}`,
    });
  };

  const galleryTitle = useMemo(() => `المعرض — ${images.length}`, [images.length]);

  const getStatusBarHeight = () => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight || 0;
    }
    return 44;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.ScrollView
        contentContainerStyle={styles.container}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header iOS Style */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}>
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.pageTitle}>دمج الصور</Text>
            <View style={styles.titleBadge} />
          </View>
        </View>

        {/* Settings Glass Card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>إعدادات الإخراج</Text>
          <View style={styles.divider} />
          
          <View style={styles.rowBetween}>
            <Text style={styles.label}>صيغة الصورة</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PNG - أصلية</Text>
            </View>
          </View>
          
          <View style={styles.rowBetween}>
            <Text style={styles.label}>توحيد العرض (احترافي)</Text>
            <Switch
              value={unifyWidth}
              onValueChange={setUnifyWidth}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: COOKIES_PINK }}
              thumbColor={'white'}
              ios_backgroundColor="rgba(255,255,255,0.1)"
            />
          </View>
          <Text style={styles.subLabel}>
            يحافظ على الجودة الأسطورية مع توحيد مقاسات العرض لتجنب التعرجات.
          </Text>

          <Text style={[styles.label, { marginTop: 12 }]}>اسم الصورة الناتجة</Text>
          <TextInput
            value={outputName}
            onChangeText={setOutputName}
            placeholder="مثال: دمج_مشروع_العمل"
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.input}
          />

          <TouchableOpacity
            onPress={mergeStart}
            activeOpacity={0.8}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>ابدأ الدمج بأعلى جودة</Text>
          </TouchableOpacity>

          {!!images.length && (
            <TouchableOpacity
              onPress={() => {
                setImages([]);
                setResultReady(false);
                setMergedImageUri(null);
                onAddOperation({
                  tool: 'دمج الصور',
                  description: 'تم مسح كل الصور من مشروع الدمج.',
                });
              }}
              style={styles.clearBtn}
            >
              <Trash2 color="#ff5d7e" size={16} />
              <Text style={styles.clearText}>إفراغ المشروع</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Upload Dotted Glass Card */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.glassCard, styles.uploadCard]}
          onPress={pickImages}
        >
          <View style={styles.iconGlow}>
            <ImagePlus color={COOKIES_PINK} size={42} />
          </View>
          <Text style={styles.uploadTitle}>استيراد الصور</Text>
          <Text style={styles.uploadSub}>
            اختر صورك ليتم دمجها بدقة البكسل الأصلية
          </Text>
        </TouchableOpacity>

        {/* Gallery Glass Card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>{galleryTitle}</Text>
          <View style={styles.divider} />
          
          {images.map((image, index) => (
            <Animated.View key={image.id} style={styles.galleryRow}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <Image source={{ uri: image.uri }} style={styles.thumb} />
              
              <View style={styles.galleryActionsGlass}>
                <TouchableOpacity onPress={() => moveImage(index, -1)} style={styles.actionIcon}>
                  <ArrowUp color="white" size={18} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveImage(index, 1)} style={styles.actionIcon}>
                  <ArrowDown color="white" size={18} />
                </TouchableOpacity>
                <View style={styles.verticalDivider} />
                <TouchableOpacity onPress={() => removeImage(image.id)} style={styles.actionIcon}>
                  <Trash2 color="#ff5d7e" size={18} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
          {!images.length && (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>لم يتم إضافة صور للدمج بعد.</Text>
            </View>
          )}
        </View>

        {/* Output Glass Card */}
        <View style={[styles.glassCard, { marginBottom: 30 }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>النتيجة النهائية</Text>
            <TouchableOpacity
              disabled={!resultReady}
              onPress={() => {
                if (resultReady) {
                  setPreviewOpen(true);
                  onAddOperation({
                    tool: 'دمج الصور',
                    description: 'تم فتح المعاينة الحقيقية للناتج.',
                  });
                }
              }}
              style={[styles.previewBtnGlass, { opacity: resultReady ? 1 : 0.4 }]}
            >
              <Text style={styles.previewText}>معاينة تفصيلية</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {resultReady && mergedImageUri ? (
            <View style={styles.resultContainer}>
              <Image
                source={{ uri: mergedImageUri }}
                style={styles.resultImage}
              />
              <TouchableOpacity onPress={saveResult} activeOpacity={0.8} style={styles.saveBtn}>
                <CheckCircle2 color="white" size={20} />
                <Text style={styles.saveBtnText}>حفظ في الاستوديو</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>النتيجة ستظهر هنا بعد الدمج</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* شاشة التحميل الأسطورية أثناء الدمج */}
      {isMerging && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingGlassBox}>
            <ActivityIndicator size="large" color={COOKIES_PINK} />
            <Text style={styles.loadingText}>جاري الدمج بأعلى جودة...</Text>
            <Text style={styles.loadingSubText}>يرجى الانتظار، تتم المعالجة بالبيكسل</Text>
          </View>
        </View>
      )}

      {/* Real preview modal */}
      <Modal
        visible={previewOpen}
        animationType="slide"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <SafeAreaView style={styles.previewSafe}>
          <View
            style={[
              styles.previewHeader,
              { paddingTop: getStatusBarHeight() + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setPreviewOpen(false)} style={styles.circleBtn}>
              <ChevronRight color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>معاينة حقيقية للمخرج</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.circleBtn}>
              <Settings2 color="white" size={22} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
            {mergedImageUri && (
              <Image
                source={{ uri: mergedImageUri }}
                style={{
                  width: `${previewScale}%`,
                  alignSelf: 'center',
                  aspectRatio: 1, // ملاحظة: المعاينة هنا شكلية لتوضيح الجودة، لكن الحفظ بأبعاده الحقيقية
                }}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.settingsModalGlass}>
            <Text style={styles.cardTitle}>تغيير حجم المعاينة</Text>
            <Text style={[styles.label, { textAlign: 'center', marginVertical: 10 }]}>
              الحجم الحالي: {previewScale}%
            </Text>
            <View style={styles.scaleRow}>
              {[50, 70, 80, 100].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setPreviewScale(v)}
                  style={[
                    styles.scaleChip,
                    previewScale === v && styles.scaleChipActive,
                  ]}
                >
                  <Text style={[styles.scaleChipText, previewScale === v && { color: 'white' }]}>
                    {v}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setSettingsOpen(false)}
              style={[styles.primaryBtn, { marginTop: 20 }]}
            >
              <Text style={styles.primaryBtnText}>تم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { padding: 16, gap: 18, paddingTop: 20 },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuText: { color: 'white', fontSize: 18, fontWeight: '700' },
  headerTitleContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: { color: 'white', fontWeight: '900', fontSize: 26, letterSpacing: 0.5 },
  titleBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COOKIES_PINK,
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  
  // ستايلات زجاجية احترافية (iOS Glassmorphism)
  glassCard: {
    backgroundColor: 'rgba(22, 22, 22, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '900',
    textAlign: 'right',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: { color: 'white', textAlign: 'right', fontWeight: '700', fontSize: 15 },
  badge: {
    backgroundColor: 'rgba(242, 166, 184, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(242, 166, 184, 0.3)',
  },
  badgeText: { color: COOKIES_PINK, fontWeight: '900', fontSize: 13 },
  subLabel: {
    color: TEXT_HINT,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: 'white',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: COOKIES_PINK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  clearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  clearText: {
    color: '#ff5d7e',
    fontWeight: '800',
    fontSize: 15,
  },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 36,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(242, 166, 184, 0.3)',
    backgroundColor: 'rgba(242, 166, 184, 0.03)',
  },
  iconGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(242, 166, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 5,
  },
  uploadTitle: { color: 'white', fontWeight: '900', fontSize: 22, letterSpacing: 0.5 },
  uploadSub: { color: TEXT_HINT, textAlign: 'center', marginTop: 8, fontSize: 14 },
  
  galleryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(242,166,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242,166,184,0.3)',
  },
  orderBadgeText: { color: COOKIES_PINK, fontWeight: '900', fontSize: 15 },
  thumb: { 
    width: 70, 
    height: 90, 
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  galleryActionsGlass: {
    marginRight: 'auto',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionIcon: {
    padding: 8,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: { color: TEXT_HINT, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  previewBtnGlass: {
    backgroundColor: 'rgba(242, 166, 184, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(242, 166, 184, 0.3)',
  },
  previewText: { color: COOKIES_PINK, fontWeight: '800', fontSize: 14 },
  resultContainer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  resultImage: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    resizeMode: 'contain',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  saveBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1dd1a1',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1dd1a1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 17 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingGlassBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    shadowColor: COOKIES_PINK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  loadingText: { color: 'white', fontWeight: '900', fontSize: 18, marginTop: 16 },
  loadingSubText: { color: TEXT_SECONDARY, fontSize: 13, marginTop: 6 },

  previewSafe: { flex: 1, backgroundColor: '#050505' },
  previewHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(15,15,15,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderTitle: { color: 'white', fontWeight: '900', fontSize: 18 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  settingsModalGlass: {
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  scaleRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginVertical: 16,
    justifyContent: 'center',
  },
  scaleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scaleChipActive: { 
    backgroundColor: COOKIES_PINK,
    borderColor: COOKIES_PINK_DARK,
  },
  scaleChipText: { color: TEXT_SECONDARY, fontWeight: '800', fontSize: 15 },
});