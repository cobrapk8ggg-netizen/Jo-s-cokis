import React, { useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  ImagePlus,
  Trash2,
  Settings2,
  ChevronRight,
} from 'lucide-react-native';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_DARK = '#C96F86';
const BG_CARD = 'rgba(15,15,15,0.6)';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const TEXT_SECONDARY = 'rgba(255,255,255,0.7)';
const TEXT_HINT = 'rgba(255,255,255,0.38)';
const GAP = 10; // pixels between images

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

  const mergeViewRef = useRef<View>(null);

  // Function to perform the actual merge and produce a PNG URI
  const performMerge = async (): Promise<string | null> => {
    if (images.length === 0) return null;

    setIsMerging(true);

    try {
      // Calculate dimensions
      let maxWidth = 0;
      for (const img of images) {
        const w = img.width || 1;
        if (w > maxWidth) maxWidth = w;
      }

      const items = images.map((img) => {
        const originalWidth = img.width || 1;
        const originalHeight = img.height || 1;
        const targetWidth = unifyWidth ? maxWidth : originalWidth;
        const targetHeight = (originalHeight * targetWidth) / originalWidth;
        return {
          ...img,
          targetWidth,
          targetHeight,
        };
      });

      let totalHeight = 0;
      for (let i = 0; i < items.length; i++) {
        totalHeight += items[i].targetHeight;
        if (i < items.length - 1) totalHeight += GAP;
      }

      // Create a temporary View that will be captured
      // We place it off-screen but still visible to the capture system.
      // This view is not part of the main UI, it's only for capturing.
      // We'll render it conditionally, but captureRef requires it to be mounted.
      // So we always keep it but with opacity 0 and position absolute.
      // We need to ensure it's rendered before capture.
      // Since we are inside a ScrollView, we'll put it outside the ScrollView
      // but inside the same root view.

      // We'll capture using the ref after the view is updated.
      // To be safe we set a small delay.
      if (!mergeViewRef.current) return null;

      const uri = await captureRef(mergeViewRef.current, {
        format: 'png',
        quality: 1,
      });
      return uri;
    } catch (error) {
      console.error('Merge failed', error);
      return null;
    } finally {
      setIsMerging(false);
    }
  };

  const mergeStart = async () => {
    if (!images.length) return;
    const uri = await performMerge();
    if (uri) {
      setMergedImageUri(uri);
      setResultReady(true);
      onAddOperation({
        tool: 'دمج الصور',
        description: `تم توليد ناتج دمج عمودي لـ ${images.length} صور.`,
      });
    } else {
      alert('فشل دمج الصور، حاول مرة أخرى.');
    }
  };

  const saveResult = async () => {
    if (!mergedImageUri) {
      alert('لا توجد صورة مدمجة للحفظ. قم بالدمج أولاً.');
      return;
    }
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      alert('مطلوب إذن الوصول إلى المكتبة لحفظ الصورة.');
      return;
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(mergedImageUri);
      await MediaLibrary.createAlbumAsync('CookieTyper', asset, false);
      const fileName = `${(outputName || `merged_${Date.now()}`).replace(
        /\s+/g,
        '_'
      )}.png`;
      onAddOperation({
        tool: 'دمج الصور',
        description: `تم دمج ${images.length} صور عموديًا وحفظها باسم ${fileName}.`,
      });
      alert('تم حفظ الصورة في المعرض بنجاح');
    } catch (error) {
      console.error('Save failed', error);
      alert('حدث خطأ أثناء حفظ الصورة.');
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

  // Helper to get status bar height for modal header
  const getStatusBarHeight = () => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight || 0;
    }
    return 20;
  };

  // Build the hidden merge view
  const renderMergeCaptureView = () => {
    if (images.length === 0) return null;
    // Calculate max width and sizes
    let maxWidth = 0;
    for (const img of images) {
      const w = img.width || 1;
      if (w > maxWidth) maxWidth = w;
    }
    const items = images.map((img) => {
      const originalWidth = img.width || 1;
      const originalHeight = img.height || 1;
      const targetWidth = unifyWidth ? maxWidth : originalWidth;
      const targetHeight = (originalHeight * targetWidth) / originalWidth;
      return { ...img, targetWidth, targetHeight };
    });
    let totalHeight = 0;
    for (let i = 0; i < items.length; i++) {
      totalHeight += items[i].targetHeight;
      if (i < items.length - 1) totalHeight += GAP;
    }

    return (
      <View
        ref={mergeViewRef}
        style={{
          position: 'absolute',
          top: -10000,
          left: 0,
          width: maxWidth,
          height: totalHeight,
          opacity: 0,
          backgroundColor: 'black',
        }}
        collapsable={false}
      >
        <View style={{ flexDirection: 'column', width: maxWidth }}>
          {items.map((item, idx) => (
            <View key={item.id}>
              <Image
                source={{ uri: item.uri }}
                style={{ width: item.targetWidth, height: item.targetHeight }}
                resizeMode="contain"
              />
              {idx < items.length - 1 && <View style={{ height: GAP }} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}>
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>دمج الصور</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>إعدادات الإخراج</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>صيغة الصورة</Text>
            <Text style={styles.value}>PNG</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>توحيد العرض عند الدمج</Text>
            <Switch value={unifyWidth} onValueChange={setUnifyWidth} />
          </View>
          <Text style={styles.subLabel}>
            قد يؤدي توحيد العرض إلى تعديل أبعاد العرض لتوحيد الشكل.
          </Text>
          <Text style={styles.label}>اسم الصورة الناتجة</Text>
          <TextInput
            value={outputName}
            onChangeText={setOutputName}
            placeholder="اسم الصورة الناتجة"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
          />
          <TouchableOpacity onPress={mergeStart} style={styles.primaryBtn}>
            {isMerging ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>ابدأ الدمج</Text>
            )}
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
            >
              <Text style={styles.clearText}>مسح الكل</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.card, styles.uploadCard]} onPress={pickImages}>
          <ImagePlus color={COOKIES_PINK} size={36} />
          <Text style={styles.uploadTitle}>ارفع الصور</Text>
          <Text style={styles.uploadSub}>
            اضغط لاختيار الصور أو اسحبها هنا إن كان السحب مدعومًا
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{galleryTitle}</Text>
          {images.map((image, index) => (
            <View key={image.id} style={styles.galleryRow}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{index + 1}</Text>
              </View>
              <Image source={{ uri: image.uri }} style={styles.thumb} />
              <View style={styles.galleryActions}>
                <TouchableOpacity onPress={() => moveImage(index, -1)}>
                  <ArrowUp color="white" size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveImage(index, 1)}>
                  <ArrowDown color="white" size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeImage(image.id)}>
                  <Trash2 color="#ff5d7e" size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!images.length && (
            <Text style={styles.empty}>لم يتم اختيار صور بعد.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>الناتج</Text>
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
              style={{ opacity: resultReady ? 1 : 0.4 }}
            >
              <Text style={styles.previewText}>معاينة</Text>
            </TouchableOpacity>
          </View>
          {resultReady && mergedImageUri ? (
            <>
              <Image
                source={{ uri: mergedImageUri }}
                style={{ width: '100%', height: 300, resizeMode: 'contain' }}
              />
              <TouchableOpacity onPress={saveResult} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>حفظ PNG</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.empty}>لم يتم توليد صورة بعد</Text>
          )}
        </View>
      </ScrollView>

      {/* Hidden capture view */}
      {renderMergeCaptureView()}

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
            <TouchableOpacity onPress={() => setPreviewOpen(false)}>
              <ChevronRight color="white" size={22} />
            </TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>معاينة حقيقية</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(true)}>
              <Settings2 color="white" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
            {mergedImageUri && (
              <Image
                source={{ uri: mergedImageUri }}
                style={{
                  width: `${previewScale}%`,
                  alignSelf: 'center',
                  aspectRatio: 1, // will be overridden by actual image dimensions
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
          <View style={styles.settingsModal}>
            <Text style={styles.cardTitle}>إعدادات المعاينة</Text>
            <Text style={styles.label}>عرض الصورة: {previewScale}%</Text>
            <View style={styles.scaleRow}>
              {[70, 80, 90, 100].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setPreviewScale(v)}
                  style={[
                    styles.scaleChip,
                    previewScale === v && styles.scaleChipActive,
                  ]}
                >
                  <Text style={styles.scaleChipText}>{v}%</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setSettingsOpen(false)}
              style={styles.primaryBtn}
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
  safe: { flex: 1 },
  container: { padding: 14, gap: 12, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  menuText: { color: 'white', fontSize: 18 },
  pageTitle: { color: 'white', fontWeight: '900', fontSize: 20 },
  card: {
    backgroundColor: BG_CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: 'white', textAlign: 'right', fontWeight: '700' },
  value: { color: COOKIES_PINK, fontWeight: '900' },
  subLabel: {
    color: TEXT_HINT,
    textAlign: 'right',
    marginVertical: 6,
    fontSize: 12,
  },
  input: {
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: 'white',
    textAlign: 'right',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
  },
  primaryBtn: {
    backgroundColor: COOKIES_PINK,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  clearText: {
    color: '#ff5d7e',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '800',
  },
  uploadCard: { alignItems: 'center', paddingVertical: 28 },
  uploadTitle: { color: 'white', fontWeight: '900', marginTop: 8, fontSize: 21 },
  uploadSub: { color: TEXT_HINT, textAlign: 'center', marginTop: 6 },
  galleryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(242,166,184,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: { color: COOKIES_PINK, fontWeight: '900' },
  thumb: { width: 64, height: 100, borderRadius: 12 },
  galleryActions: { marginRight: 'auto', flexDirection: 'row-reverse', gap: 13 },
  empty: { color: TEXT_HINT, textAlign: 'center', paddingVertical: 14 },
  previewText: { color: COOKIES_PINK, fontWeight: '900' },
  previewSafe: { flex: 1, backgroundColor: '#020202' },
  previewHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewHeaderTitle: { color: 'white', fontWeight: '900' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  settingsModal: {
    backgroundColor: BG_CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(242,166,184,0.3)',
    padding: 14,
  },
  scaleRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginVertical: 12,
    justifyContent: 'center',
  },
  scaleChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scaleChipActive: { backgroundColor: COOKIES_PINK },
  scaleChipText: { color: 'white', fontWeight: '800' },
});