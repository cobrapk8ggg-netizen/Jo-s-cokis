import React from 'react';
import { Platform, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock3, Menu, PenLine, Settings, Sparkles } from 'lucide-react-native';
import { OperationLogItem } from '../types';

const COOKIES_PINK = '#F2A6B8';

type HomeScreenProps = {
  operations: OperationLogItem[];
  onOpenMenu: () => void;
  onOpenTyper: () => void;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ operations, onOpenMenu, onOpenTyper }) => (
  <SafeAreaView style={styles.safe}>
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenMenu} activeOpacity={0.85} style={styles.menuButton}>
          <Menu color="white" size={23} />
        </TouchableOpacity>
        <View style={styles.brandMark}><Sparkles color={COOKIES_PINK} size={24} /></View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.teamLabel}>Cookies Team</Text>
        <Text style={styles.title}>أدوات Cookies للمحررين</Text>
        <Text style={styles.description}>أدوات بسيطة وسريعة لمساعدة محرري فريق Cookies: كتابة، دمج صور، وتنظيم العمل.</Text>
        <TouchableOpacity onPress={onOpenTyper} activeOpacity={0.88} style={styles.primaryCta}>
          <PenLine color="white" size={19} />
          <Text style={styles.primaryCtaText}>فتح Typer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.shortcutsRow}>
        <View style={styles.shortcutCard}><PenLine color={COOKIES_PINK} size={20} /><Text style={styles.shortcutText}>Typer</Text></View>
        <View style={styles.shortcutCard}><Settings color="rgba(255,255,255,0.55)" size={20} /><Text style={styles.shortcutText}>الإعدادات</Text></View>
      </View>

      <View style={styles.sectionHeader}>
        <Clock3 color={COOKIES_PINK} size={18} />
        <Text style={styles.sectionTitle}>آخر العمليات</Text>
      </View>
      <View style={styles.operationsList}>
        {(operations.length ? operations.slice(0, 5) : [{ id: 'empty', tool: 'Cookies', description: 'لا توجد عمليات بعد. افتح Typer لبدء العمل.', timeLabel: 'الآن' }]).map(item => (
          <View key={item.id} style={styles.operationCard}>
            <Text style={styles.operationTool}>{item.tool}</Text>
            <Text style={styles.operationDesc}>{item.description}</Text>
            <Text style={styles.operationTime}>{item.timeLabel}</Text>
          </View>
        ))}
      </View>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 14 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  menuButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  brandMark: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(242,166,184,0.1)', borderWidth: 1, borderColor: 'rgba(242,166,184,0.18)', justifyContent: 'center', alignItems: 'center' },
  heroCard: { backgroundColor: 'rgba(10,10,14,0.72)', borderRadius: 28, padding: 22, borderWidth: 1.5, borderColor: 'rgba(242,166,184,0.18)' },
  teamLabel: { color: COOKIES_PINK, textAlign: 'right', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  title: { color: 'white', textAlign: 'right', fontSize: 30, lineHeight: 39, fontWeight: '900', marginTop: 8 },
  description: { color: 'rgba(255,255,255,0.58)', textAlign: 'right', fontSize: 14, lineHeight: 24, marginTop: 12 },
  primaryCta: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: COOKIES_PINK, borderRadius: 18, paddingVertical: 14, marginTop: 20 },
  primaryCtaText: { color: 'white', fontSize: 16, fontWeight: '900' },
  shortcutsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 14 },
  shortcutCard: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  shortcutText: { color: 'white', fontWeight: '800' },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  operationsList: { gap: 9 },
  operationCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 17, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  operationTool: { color: COOKIES_PINK, textAlign: 'right', fontWeight: '900', fontSize: 13 },
  operationDesc: { color: 'white', textAlign: 'right', fontWeight: '700', marginTop: 4 },
  operationTime: { color: 'rgba(255,255,255,0.34)', textAlign: 'right', marginTop: 5, fontSize: 12 },
});
