import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react-native';
import { SessionData, Settings } from '../types';
import { clampAssistantScale } from '../defaults';

const { height } = Dimensions.get('window');

interface AssistantModeProps {
  session: SessionData;
  settings: Settings;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  onClose: () => void;
}

export const AssistantMode: React.FC<AssistantModeProps> = ({ session, settings, onNext, onPrev, onClose }) => {
  const [copied, setCopied] = useState(false);
  const currentBubble = session.bubbles[session.currentIndex];
  const bubbleAnim = useRef(new Animated.Value(1)).current;
  const copyAnim = useRef(new Animated.Value(0)).current;
  const currentTag = settings.tags.find(t => t.id === currentBubble?.tagId);
  const bubbleColor = currentTag?.color || '#F2A6B8';
  const scale = clampAssistantScale(settings.assistantScale) / 100;

  useEffect(() => {
    bubbleAnim.setValue(0.96);
    Animated.spring(bubbleAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 95 }).start();
  }, [session.currentIndex, bubbleAnim]);

  useEffect(() => {
    Animated.timing(copyAnim, { toValue: copied ? 1 : 0, duration: copied ? 170 : 200, useNativeDriver: true }).start();
  }, [copied, copyAnim]);

  const totalCount = session.bubbles.length;
  const currentCount = session.currentIndex + 1;
  const progressRatio = totalCount > 1 ? session.currentIndex / (totalCount - 1) : 0;

  const handleCopyRequested = async () => {
    if (!currentBubble) return;
    await Clipboard.setStringAsync(currentBubble.text);
    Vibration.vibrate(50);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePrevRequested = () => {
    if (session.currentIndex === 0) return;
    Vibration.vibrate(20);
    onPrev();
  };

  const handleNextRequested = () => {
    if (session.currentIndex === totalCount - 1) return;
    Vibration.vibrate(20);
    onNext();
  };

  if (!currentBubble) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topControlPanel}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.exitActionBtn}>
            <X color="rgba(255,255,255,0.6)" size={22} />
          </TouchableOpacity>
          <Text style={styles.brandingCaption}>كوكيز تايبر</Text>
        </View>

        <View style={[styles.workspace, { transform: [{ scale }] }]}>
          <View style={styles.seekContainer}>
            <View style={styles.seekPagerWrapper}>
              <View style={styles.pagerPill}><Text style={styles.pagerText}>{currentCount} / {totalCount}</Text></View>
            </View>
            <View style={styles.seekBarTrack}><View style={[styles.seekBarProgress, { width: `${progressRatio * 100}%` }]} /></View>
            <View style={styles.seekLabels}><Text style={styles.seekEndText}>النهاية</Text><Text style={styles.seekStartText}>البداية</Text></View>
          </View>

          <Animated.View style={[styles.assistantStrip, { opacity: bubbleAnim, transform: [{ scale: bubbleAnim }] }]}>
            <TouchableOpacity onPress={handlePrevRequested} disabled={session.currentIndex === 0} activeOpacity={0.75} style={[styles.sideArrowButton, session.currentIndex === 0 && styles.dimmedNav]}>
              <ChevronRight color="white" size={30} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyRequested} activeOpacity={0.92} style={[styles.bubbleInteractiveCard, { borderColor: copied ? '#22c55e' : 'rgba(255,255,255,0.12)' }]}>
              {currentTag && (
                <View style={styles.typeTagWrapper}>
                  <Text style={[styles.typeTagTitle, { color: bubbleColor }]}>{currentTag.name.toUpperCase()}</Text>
                </View>
              )}
              <View style={[styles.glowBackdrop, { backgroundColor: bubbleColor }]} />
              <Text style={[styles.payloadText, { fontSize: settings.fontSize, fontFamily: currentTag?.fontName || undefined }]}>{currentBubble.text}</Text>
              {copied && (
                <Animated.View style={[styles.copyOverlay, { opacity: copyAnim, transform: [{ scale: copyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
                  <View style={styles.successIconBox}><Check color="#22c55e" size={38} strokeWidth={3} /></View>
                  <Text style={styles.successFeedbackText}>تم النسخ</Text>
                </Animated.View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextRequested} disabled={session.currentIndex === totalCount - 1} activeOpacity={0.75} style={[styles.sideArrowButton, session.currentIndex === totalCount - 1 && styles.dimmedNav]}>
              <ChevronLeft color="white" size={30} />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.interactionHint}><Text style={styles.hintValue}>انقر على النص للنسخ</Text></View>
        </View>

        <View style={styles.globalPresenceBranding}>
          <Copy color="#F2A6B8" size={14} style={{ opacity: 0.6 }} />
          <Text style={styles.brandingTaglineText}>المساعد نشط</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  topControlPanel: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandingCaption: { color: 'rgba(255,255,255,0.4)', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  exitActionBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 100 },
  workspace: { flex: 1, justifyContent: 'center', gap: 22 },
  seekContainer: { width: '100%' },
  seekPagerWrapper: { alignItems: 'center', marginBottom: 14 },
  pagerPill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pagerText: { color: '#F2A6B8', fontSize: 14, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'monospace' },
  seekBarTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' },
  seekBarProgress: { height: '100%', backgroundColor: '#C96F86' },
  seekLabels: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10 },
  seekStartText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
  seekEndText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800' },
  assistantStrip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, width: '100%' },
  sideArrowButton: { width: 54, height: 78, backgroundColor: 'rgba(255,255,255,0.065)', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dimmedNav: { opacity: 0.18 },
  bubbleInteractiveCard: { flex: 1, backgroundColor: '#000000', borderRadius: 30, paddingVertical: 34, paddingHorizontal: 24, minHeight: 150, maxHeight: height * 0.36, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#F2A6B8', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 8, overflow: 'hidden', position: 'relative' },
  typeTagWrapper: { position: 'absolute', top: 16, right: 22 },
  typeTagTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  glowBackdrop: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.04 },
  payloadText: { color: 'white', textAlign: 'center', lineHeight: 34, fontWeight: '600' },
  copyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', gap: 14 },
  successIconBox: { padding: 10, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 100 },
  successFeedbackText: { color: '#22c55e', fontWeight: '900', fontSize: 16, letterSpacing: 8, paddingLeft: 8 },
  interactionHint: { alignItems: 'center' },
  hintValue: { color: 'rgba(255,255,255,0.22)', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  globalPresenceBranding: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: 0.4, marginBottom: 15 },
  brandingTaglineText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
});
