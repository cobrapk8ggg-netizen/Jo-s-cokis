import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OperationLogItem } from '../types';

type Props = { operations: OperationLogItem[] };

const formatArabicTime = (timestamp?: number) => {
  if (!timestamp) return 'الآن';
  const now = new Date();
  const t = new Date(timestamp);
  const dayDiff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
  const hours = t.getHours();
  const mins = `${t.getMinutes()}`.padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;
  if (dayDiff <= 0) return `اليوم، ${h12}:${mins} ${period}`;
  if (dayDiff === 1) return `أمس، ${h12}:${mins} ${period}`;
  if (dayDiff === 2) return 'قبل يومين';
  return `قبل ${dayDiff} أيام`;
};

export const OperationsScreen: React.FC<Props> = ({ operations }) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>آخر العمليات</Text>
      {(operations.length ? operations : [{ id: '0', tool: 'كوكيز تايبر', description: 'لا توجد عمليات بعد.', timeLabel: 'الآن' }]).map(item => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.tool}>{item.tool}</Text>
          <Text style={styles.desc}>{item.description}</Text>
          <Text style={styles.time}>{formatArabicTime(item.createdAt)}</Text>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, gap: 10 },
  title: { color: 'white', fontSize: 24, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12 },
  tool: { color: '#F2A6B8', fontWeight: '900', textAlign: 'right' },
  desc: { color: 'white', textAlign: 'right', marginTop: 4 },
  time: { color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 6, fontSize: 12 },
});
