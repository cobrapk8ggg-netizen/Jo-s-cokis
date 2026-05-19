import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { OperationLogItem } from '../types';

export const formatOperationTime = (createdAt?: number) => {
  if (!createdAt) return 'الآن';
  const now = new Date();
  const date = new Date(createdAt);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  const hh = date.getHours();
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const h12 = hh % 12 || 12;
  const suffix = hh >= 12 ? 'م' : 'ص';
  const time = `${h12}:${mm} ${suffix}`;
  if (diffDays <= 0) return `اليوم، ${time}`;
  if (diffDays === 1) return `أمس، ${time}`;
  if (diffDays === 2) return 'قبل يومين';
  return `قبل ${diffDays} أيام`;
};

export const OperationsScreen = ({ operations, onOpenMenu }: { operations: OperationLogItem[]; onOpenMenu: () => void; }) => (
  <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity onPress={onOpenMenu} style={styles.menu}><Menu color="white" size={22} /></TouchableOpacity><Text style={styles.title}>آخر العمليات</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      {operations.length === 0 ? <Text style={styles.empty}>لا توجد عمليات حقيقية مسجلة بعد.</Text> : operations.map(item => (
        <View key={item.id} style={styles.card}><Text style={styles.tool}>{item.tool}</Text><Text style={styles.desc}>{item.description}</Text><Text style={styles.time}>{formatOperationTime(item.createdAt)}</Text></View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({ safe:{flex:1},header:{flexDirection:'row-reverse',justifyContent:'space-between',padding:16},menu:{width:42,height:42,borderRadius:14,backgroundColor:'rgba(255,255,255,0.08)',justifyContent:'center',alignItems:'center'},title:{color:'white',fontWeight:'900',fontSize:24},content:{padding:16,gap:10},card:{backgroundColor:'rgba(255,255,255,0.05)',borderRadius:18,padding:14,borderWidth:1,borderColor:'rgba(242,166,184,0.2)'},tool:{color:'#F2A6B8',fontWeight:'900',textAlign:'right'},desc:{color:'white',textAlign:'right',marginTop:6},time:{color:'rgba(255,255,255,0.5)',textAlign:'right',marginTop:6},empty:{color:'rgba(255,255,255,0.6)',textAlign:'center',marginTop:20} });
