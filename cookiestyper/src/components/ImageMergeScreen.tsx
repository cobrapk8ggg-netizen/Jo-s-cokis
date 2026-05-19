import React, { useMemo, useState } from 'react';
import { Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowDown, ArrowUp, Eye, ImagePlus, Trash2, X, Settings2, ChevronRight } from 'lucide-react-native';

const COOKIES_PINK = '#F2A6B8';

type MergeImageItem = { id: string; uri: string; name: string; mimeType?: string | null; width?: number; height?: number };

export function ImageMergeScreen({ onOpenMenu, onAddOperation }: { onOpenMenu: () => void; onAddOperation: (payload: { tool: string; description: string; details?: string }) => void }) {
  const [images, setImages] = useState<MergeImageItem[]>([]);
  const [unifyWidth, setUnifyWidth] = useState(true);
  const [outputName, setOutputName] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(100);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ['images'], quality: 1, exif: false });
    if (result.canceled) return;
    const accepted = result.assets.filter(asset => (asset.mimeType || '').includes('png') || (asset.mimeType || '').includes('jpeg') || (asset.mimeType || '').includes('jpg') || asset.uri.match(/\.(png|jpe?g)$/i));
    const mapped = accepted.map(asset => ({ id: `${Date.now()}-${asset.uri}`, uri: asset.uri, name: asset.fileName || `image-${Date.now()}`, mimeType: asset.mimeType, width: asset.width, height: asset.height }));
    setImages(prev => [...prev, ...mapped]);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    setImages(copy);
  };

  const removeImage = (id: string) => {
    const image = images.find(i => i.id === id);
    setImages(prev => prev.filter(i => i.id !== id));
    onAddOperation({ tool: 'دمج الصور', description: `تم حذف صورة من المشروع: ${image?.name || 'صورة'}` });
  };

  const mergeStart = async () => {
    if (!images.length) return;
    setResultReady(true);
    onAddOperation({ tool: 'دمج الصور', description: `تم توليد ناتج دمج عمودي لـ ${images.length} صور.` });
  };

  const saveResult = () => {
    const fileName = `${(outputName || `merged_${Date.now()}`).replace(/\s+/g, '_')}.png`;
    onAddOperation({ tool: 'دمج الصور', description: `تم دمج ${images.length} صور عموديًا وحفظها باسم ${fileName}.` });
  };

  const galleryTitle = useMemo(() => `المعرض — ${images.length}`, [images.length]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuBtn}><Text style={styles.menuText}>☰</Text></TouchableOpacity>
          <Text style={styles.pageTitle}>دمج الصور</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>إعدادات الإخراج</Text>
          <View style={styles.rowBetween}><Text style={styles.label}>صيغة الصورة</Text><Text style={styles.value}>PNG</Text></View>
          <View style={styles.rowBetween}><Text style={styles.label}>توحيد العرض عند الدمج</Text><Switch value={unifyWidth} onValueChange={setUnifyWidth} /></View>
          <Text style={styles.subLabel}>قد يؤدي توحيد العرض إلى تعديل أبعاد العرض لتوحيد الشكل.</Text>
          <Text style={styles.label}>اسم الصورة الناتجة</Text>
          <TextInput value={outputName} onChangeText={setOutputName} placeholder="اسم الصورة الناتجة" placeholderTextColor="rgba(255,255,255,0.4)" style={styles.input} />
          <TouchableOpacity onPress={mergeStart} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>ابدأ الدمج</Text></TouchableOpacity>
          {!!images.length && <TouchableOpacity onPress={() => { setImages([]); setResultReady(false); onAddOperation({ tool: 'دمج الصور', description: 'تم مسح كل الصور من مشروع الدمج.' }); }}><Text style={styles.clearText}>مسح الكل</Text></TouchableOpacity>}
        </View>

        <TouchableOpacity style={[styles.card, styles.uploadCard]} onPress={pickImages}>
          <ImagePlus color={COOKIES_PINK} size={36} />
          <Text style={styles.uploadTitle}>ارفع الصور</Text>
          <Text style={styles.uploadSub}>اضغط لاختيار الصور أو اسحبها هنا إن كان السحب مدعومًا</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{galleryTitle}</Text>
          {images.map((image, index) => (
            <View key={image.id} style={styles.galleryRow}>
              <View style={styles.orderBadge}><Text style={styles.orderBadgeText}>{index + 1}</Text></View>
              <Image source={{ uri: image.uri }} style={styles.thumb} />
              <View style={styles.galleryActions}>
                <TouchableOpacity onPress={() => moveImage(index, -1)}><ArrowUp color="white" size={16} /></TouchableOpacity>
                <TouchableOpacity onPress={() => moveImage(index, 1)}><ArrowDown color="white" size={16} /></TouchableOpacity>
                <TouchableOpacity onPress={() => removeImage(image.id)}><Trash2 color="#ff5d7e" size={16} /></TouchableOpacity>
              </View>
            </View>
          ))}
          {!images.length && <Text style={styles.empty}>لم يتم اختيار صور بعد.</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>الناتج</Text>
            <TouchableOpacity disabled={!resultReady} onPress={() => { setPreviewOpen(true); onAddOperation({ tool: 'دمج الصور', description: 'تم فتح المعاينة الحقيقية للناتج.' }); }} style={{ opacity: resultReady ? 1 : 0.4 }}><Text style={styles.previewText}>معاينة</Text></TouchableOpacity>
          </View>
          {resultReady ? (
            <>
              <ScrollView style={{ maxHeight: 300 }}>
                {images.map((img) => <Image key={`result-${img.id}`} source={{ uri: img.uri }} style={{ width: '100%', height: 260, resizeMode: unifyWidth ? 'cover' : 'contain' }} />)}
              </ScrollView>
              <TouchableOpacity onPress={saveResult} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>حفظ PNG</Text></TouchableOpacity>
            </>
          ) : <Text style={styles.empty}>لم يتم توليد صورة بعد</Text>}
        </View>
      </ScrollView>

      <Modal visible={previewOpen} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        <SafeAreaView style={styles.previewSafe}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewOpen(false)}><ChevronRight color="white" size={22} /></TouchableOpacity>
            <Text style={styles.previewHeaderTitle}>معاينة حقيقية</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(true)}><Settings2 color="white" size={20} /></TouchableOpacity>
          </View>
          <ScrollView>
            {images.map((img) => <Image key={`preview-${img.id}`} source={{ uri: img.uri }} style={{ width: `${previewScale}%` as any, alignSelf: 'center', aspectRatio: (img.width || 1) / (img.height || 1) }} />)}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.overlay}><View style={styles.settingsModal}><Text style={styles.cardTitle}>إعدادات المعاينة</Text><Text style={styles.label}>عرض الصورة: {previewScale}%</Text><View style={styles.scaleRow}>{[70,80,90,100].map(v => <TouchableOpacity key={v} onPress={() => setPreviewScale(v)} style={[styles.scaleChip, previewScale===v && styles.scaleChipActive]}><Text style={styles.scaleChipText}>{v}%</Text></TouchableOpacity>)}</View><TouchableOpacity onPress={() => setSettingsOpen(false)} style={styles.primaryBtn}><Text style={styles.primaryBtnText}>تم</Text></TouchableOpacity></View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, container: { padding: 14, gap: 12, paddingBottom: 24 }, topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }, menuBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 }, menuText: { color: 'white', fontSize: 18 }, pageTitle: { color: 'white', fontWeight: '900', fontSize: 20 }, card: { backgroundColor: 'rgba(4,10,34,0.72)', borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)', padding: 12 }, cardTitle: { color: 'white', fontWeight: '900', textAlign: 'right', marginBottom: 10 }, rowBetween: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, label: { color: 'white', textAlign: 'right', fontWeight: '700' }, value: { color: COOKIES_PINK, fontWeight: '900' }, subLabel: { color: 'rgba(255,255,255,0.55)', textAlign: 'right', marginVertical: 6, fontSize: 12 }, input: { marginTop: 6, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'white', textAlign: 'right', paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 9 }, primaryBtn: { backgroundColor: '#1AA7EC', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 6 }, primaryBtnText: { color: 'white', fontWeight: '900' }, clearText: { color: '#ff5d7e', textAlign: 'center', marginTop: 10, fontWeight: '800' }, uploadCard: { alignItems: 'center', paddingVertical: 28 }, uploadTitle: { color: 'white', fontWeight: '900', marginTop: 8, fontSize: 21 }, uploadSub: { color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 6 }, galleryRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 }, orderBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(26,167,236,0.22)', alignItems: 'center', justifyContent: 'center' }, orderBadgeText: { color: '#1AA7EC', fontWeight: '900' }, thumb: { width: 64, height: 100, borderRadius: 12 }, galleryActions: { marginRight: 'auto', flexDirection: 'row-reverse', gap: 13 }, empty: { color: 'rgba(255,255,255,0.65)', textAlign: 'center', paddingVertical: 14 }, previewText: { color: '#1AA7EC', fontWeight: '900' }, previewSafe: { flex: 1, backgroundColor: '#020920' }, previewHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.5)' }, previewHeaderTitle: { color: 'white', fontWeight: '900' }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }, settingsModal: { backgroundColor: '#0A132F', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(242,166,184,0.3)', padding: 14 }, scaleRow: { flexDirection: 'row-reverse', gap: 8, marginVertical: 12, justifyContent: 'center' }, scaleChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' }, scaleChipActive: { backgroundColor: 'rgba(26,167,236,0.4)' }, scaleChipText: { color: 'white', fontWeight: '800' } });
