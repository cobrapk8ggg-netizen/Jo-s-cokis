import React from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COOKIES_PINK = '#F2A6B8';
const COOKIES_PINK_DARK = '#C96F86';

type ThemedModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: 'center' | 'sheet';
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
};

export const ThemedModal: React.FC<ThemedModalProps> = ({
  visible,
  title,
  message,
  variant = 'center',
  children,
  confirmText,
  cancelText = 'إلغاء',
  destructive,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 170 : 130,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, visible]);

  const close = () => {
    onCancel?.();
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={close} />
        <Animated.View
          style={[
            styles.panel,
            variant === 'sheet' ? styles.sheetPanel : styles.centerPanel,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [variant === 'sheet' ? 60 : 18, 0],
                  }),
                },
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {variant === 'sheet' && <View style={styles.sheetGrip} />}
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          {children}
          {(confirmText || onConfirm) && (
            <View style={styles.actionsRow}>
              <TouchableOpacity activeOpacity={0.85} onPress={close} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onConfirm}
                style={[styles.primaryButton, destructive && styles.destructiveButton]}
              >
                <Text style={styles.primaryText}>{confirmText || 'تأكيد'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  panel: {
    backgroundColor: 'rgba(7,7,12,0.98)',
    borderWidth: 1.5,
    borderColor: 'rgba(242,166,184,0.2)',
    shadowColor: COOKIES_PINK_DARK,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  centerPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 18,
  },
  sheetPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 22 : 12,
    maxHeight: '88%',
    borderRadius: 28,
    padding: 18,
  },
  sheetGrip: {
    width: 46,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 8,
  },
  message: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'right',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1.2,
    backgroundColor: COOKIES_PINK,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  destructiveButton: {
    backgroundColor: '#f43f5e',
  },
  primaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '800',
  },
});
