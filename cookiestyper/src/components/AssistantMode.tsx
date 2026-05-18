import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform,
  Dimensions,
  Vibration,
  Animated
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight, ChevronLeft, Copy, X, Check } from 'lucide-react-native';
import { SessionData, Settings } from '../types';

const { width, height } = Dimensions.get('window');

interface AssistantModeProps {
  session: SessionData;
  settings: Settings;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
  onClose: () => void;
}

export const AssistantMode: React.FC<AssistantModeProps> = ({
  session,
  settings,
  onNext,
  onPrev,
  onGoTo,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const currentBubble = session.bubbles[session.currentIndex];

  const bubbleAnim = useRef(new Animated.Value(1)).current;
  const copyAnim = useRef(new Animated.Value(0)).current;
  
  const currentTag = settings.tags.find(t => t.id === currentBubble?.tagId);
  const bubbleColor = currentTag?.color || '#F2A6B8';

  useEffect(() => {
    bubbleAnim.setValue(0.92);

    Animated.spring(bubbleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [session.currentIndex, bubbleAnim]);

  useEffect(() => {
    Animated.timing(copyAnim, {
      toValue: copied ? 1 : 0,
      duration: copied ? 180 : 220,
      useNativeDriver: true,
    }).start();
  }, [copied, copyAnim]);

  const handleCopyRequested = async () => {
    if (!currentBubble) return;
    
    // Copy the text without the tag symbol as per specs
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

  const currentCount = session.currentIndex + 1;
  const totalCount = session.bubbles.length;
  const progressRatio = totalCount > 1 ? session.currentIndex / (totalCount - 1) : 0;

  if (!currentBubble) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Superior Header Control */}
        <View style={styles.topControlPanel}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.exitActionBtn}>
            <X color="rgba(255,255,255,0.6)" size={22} />
          </TouchableOpacity>
          
          <View style={styles.statusDisplay}>
            <Text style={styles.brandingCaption}>CookiesTyper</Text>
          </View>
        </View>

        {/* Central Assistant Workspace */}
        <View style={styles.workspace}>
          {/* Progress Seek Bar Section */}
          <View style={styles.seekContainer}>
            <View style={styles.seekPagerWrapper}>
              <View style={styles.pagerPill}>
                <Text style={styles.pagerText}>{currentCount} / {totalCount}</Text>
              </View>
            </View>

            <View style={styles.seekBarTrack}>
              <View style={[styles.seekBarProgress, { width: `${progressRatio * 100}%` }]} />
            </View>
            <View style={styles.seekLabels}>
              <Text style={styles.seekEndText}>النهاية</Text>
              <Text style={styles.seekStartText}>البداية</Text>
            </View>
          </View>

          {/* Dynamic Bubble Presentation */}
          <View style={styles.presentationNode}>
            <Animated.View
              style={[
                styles.animatedBubbleNode,
                {
                  opacity: bubbleAnim,
                  transform: [
                    {
                      scale: bubbleAnim,
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity 
                onPress={handleCopyRequested}
                activeOpacity={0.92}
                style={[
                  styles.bubbleInteractiveCard,
                  { borderColor: copied ? '#22c55e' : 'rgba(255,255,255,0.12)' }
                ]}
              >
                {/* Type Category Indicator */}
                {currentTag && (
                  <View style={styles.typeTagWrapper}>
                    <Text style={[styles.typeTagTitle, { color: bubbleColor }]}>
                      {currentTag.name.toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Glowing Background Ambiance */}
                <View style={[styles.glowBackdrop, { backgroundColor: bubbleColor }]} />

                {/* Actual Text Payload */}
                <Text 
                  style={[
                    styles.payloadText, 
                    { fontSize: settings.fontSize }
                  ]}
                >
                  {currentBubble.text}
                </Text>

                {/* Succesful Copy Animation Overlay */}
                {copied && (
                  <Animated.View
                    style={[
                      styles.copyOverlay,
                      {
                        opacity: copyAnim,
                        transform: [
                          {
                            scale: copyAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.94, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <View style={styles.successIconBox}>
                      <Check color="#22c55e" size={44} strokeWidth={3} />
                    </View>
                    <Text style={styles.successFeedbackText}>COPIED</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
            
            <View style={styles.interactionHint}>
              <Text style={styles.hintValue}>انقر على النص للنسخ</Text>
            </View>
          </View>

          {/* Precision Navigation Array */}
          <View style={styles.navController}>
            <TouchableOpacity 
              onPress={handlePrevRequested}
              disabled={session.currentIndex === 0}
              activeOpacity={0.7}
              style={[styles.navActionBtn, session.currentIndex === 0 && styles.dimmedNav]}
            >
              <ChevronRight color="white" size={36} />
            </TouchableOpacity>

            <View style={styles.navVerticalDivider}>
              <View style={styles.dividerCore} />
              <Text style={styles.dividerCaption}>NAVIGATE</Text>
            </View>

            <TouchableOpacity 
              onPress={handleNextRequested}
              disabled={session.currentIndex === totalCount - 1}
              activeOpacity={0.7}
              style={[styles.navActionBtn, session.currentIndex === totalCount - 1 && styles.dimmedNav]}
            >
              <ChevronLeft color="white" size={36} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Global Assistant State Branding */}
        <View style={styles.globalPresenceBranding}>
          <Copy color="#F2A6B8" size={14} style={{ opacity: 0.6 }} />
          <Text style={styles.brandingTaglineText}>ASSISTANT ACTIVE</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  topControlPanel: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusDisplay: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  brandingCaption: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pagerPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pagerText: {
    color: '#F2A6B8',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'monospace',
  },
  exitActionBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
  },
  workspace: {
    flex: 1,
    justifyContent: 'center',
    gap: 45,
  },
  seekContainer: {
    width: '100%',
  },
  seekPagerWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  seekBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  seekBarProgress: {
    height: '100%',
    backgroundColor: '#C96F86',
  },
  seekLabels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  seekStartText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
  },
  seekEndText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
  },
  presentationNode: {
    alignItems: 'center',
    gap: 18,
  },
  animatedBubbleNode: {
    width: '100%',
  },
  bubbleInteractiveCard: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 36,
    paddingVertical: 45,
    paddingHorizontal: 30,
    minHeight: 220,
    maxHeight: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#F2A6B8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  typeTagWrapper: {
    position: 'absolute',
    top: 24,
    right: 32,
  },
  typeTagTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  glowBackdrop: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.04,
  },
  payloadText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: 34,
    fontWeight: '600',
  },
  copyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  successIconBox: {
    padding: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 100,
  },
  successFeedbackText: {
    color: '#22c55e',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 10,
    paddingLeft: 10, // Adjust for RTL letter spacing
  },
  interactionHint: {
    marginTop: 4,
  },
  hintValue: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navController: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  navActionBtn: {
    width: 76,
    height: 76,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dimmedNav: {
    opacity: 0.15,
  },
  navVerticalDivider: {
    alignItems: 'center',
    gap: 12,
  },
  dividerCore: {
    height: 50,
    width: 3.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
  },
  dividerCaption: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
  },
  globalPresenceBranding: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    opacity: 0.4,
    marginBottom: 15,
  },
  brandingTaglineText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
  },
});