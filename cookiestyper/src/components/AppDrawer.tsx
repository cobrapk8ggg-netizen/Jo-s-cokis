import React from 'react';
import { Animated, Easing, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Disc as DiscordIcon, ImagePlus, ListOrdered, PenLine, X } from 'lucide-react-native';

const COOKIES_PINK = '#F2A6B8';

export type ToolScreen = 'typer' | 'imageMerge' | 'operations' | 'about';

type AppDrawerProps = {
  visible: boolean;
  active: ToolScreen;
  onClose: () => void;
  onSelect: (screen: ToolScreen) => void;
};

const items = [
  { id: 'typer' as ToolScreen, label: 'تايبر', Icon: PenLine },
  { id: 'imageMerge' as ToolScreen, label: 'دمج الصور', Icon: ImagePlus },
  { id: 'operations' as ToolScreen, label: 'آخر العمليات', Icon: ListOrdered },
  { id: 'about' as ToolScreen, label: 'الدعم / Discord', Icon: DiscordIcon },
];

export const AppDrawer: React.FC<AppDrawerProps> = ({ visible, active, onClose, onSelect }) => {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: visible ? 200 : 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [anim, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}> 
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [340, 0] }) }] }]}> 
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.drawerHeader}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}><X color="white" size={20} /></TouchableOpacity>
              <Text style={styles.drawerTitle}>CookieTyper</Text>
            </View>
            <View style={styles.itemsList}>
              {items.map(({ id, label, Icon }) => {
                const isActive = active === id;
                return (
                  <TouchableOpacity key={id} activeOpacity={0.85} onPress={() => onSelect(id)} style={[styles.drawerItem, isActive && styles.activeDrawerItem]}>
                    <Icon color={isActive ? COOKIES_PINK : 'rgba(255,255,255,0.62)'} size={19} />
                    <Text style={[styles.drawerItemText, isActive && styles.activeDrawerItemText]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', alignItems: 'flex-end' },
  drawer: { width: '80%', maxWidth: 320, height: '100%', backgroundColor: 'rgba(7,7,12,0.98)', borderTopLeftRadius: 26, borderBottomLeftRadius: 26, paddingHorizontal: 14, paddingTop: Platform.OS === 'android' ? 10 : 4, borderLeftWidth: 1.5, borderColor: 'rgba(242,166,184,0.18)' },
  safeArea: { flex: 1 },
  drawerHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  closeButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  drawerTitle: { color: 'white', fontSize: 24, fontWeight: '900', textAlign: 'right' },
  itemsList: { gap: 10 },
  drawerItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  activeDrawerItem: { backgroundColor: 'rgba(242,166,184,0.12)', borderColor: 'rgba(242,166,184,0.3)' },
  drawerItemText: { color: 'rgba(255,255,255,0.72)', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'right' },
  activeDrawerItemText: { color: 'white' },
});
