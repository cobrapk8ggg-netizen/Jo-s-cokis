import React from 'react';
import { Platform, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { OperationLogItem } from '../types';

const COOKIES_PINK = '#F2A6B8';

export const formatOperationTime = (ts?: number) => {
  if (!ts) return 'الآن';
  const now = new Date();
  const date = new Date(ts);
  const hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, '0');
  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'م' : 'ص';
  const diffDays = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
  if (diffDays === 0) return `اليوم، ${h12}:${mins} ${ampm}`;
  if (diffDays === 1) return `أمس، ${h12}:${mins} ${ampm}`;
  if (diffDays === 2) return 'قبل يومين';
  return `قبل ${diffDays} أيام`;
};

export const OperationsScreen = ({operations,onOpenMenu}:{operations:OperationLogItem[];onOpenMenu:()=>void}) => (
<SafeAreaView style={styles.safe}><View style={styles.container}>
<View style={styles.header}><TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}><Menu color="white" size={22}/></TouchableOpacity><Text style={styles.title}>آخر العمليات</Text></View>
{operations.length===0?<Text style={styles.empty}>لا توجد عمليات مسجلة بعد.</Text>:operations.map(op=><View key={op.id} style={styles.card}><Text style={styles.tool}>{op.tool}</Text><Text style={styles.desc}>{op.description}</Text><Text style={styles.time}>{formatOperationTime(op.createdAt)}</Text></View>)}
</View></SafeAreaView>);

const styles=StyleSheet.create({safe:{flex:1},container:{flex:1,padding:18,paddingTop:Platform.OS==='android'?(RNStatusBar.currentHeight||0)+8:12},header:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',marginBottom:16},menuButton:{width:42,height:42,borderRadius:14,backgroundColor:'rgba(255,255,255,0.07)',alignItems:'center',justifyContent:'center'},title:{color:'white',fontSize:28,fontWeight:'900'},card:{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:16,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.08)',marginBottom:10},tool:{color:COOKIES_PINK,fontWeight:'900',textAlign:'right'},desc:{color:'white',fontWeight:'700',textAlign:'right',marginTop:4},time:{color:'rgba(255,255,255,0.5)',textAlign:'right',marginTop:4},empty:{color:'rgba(255,255,255,0.55)',textAlign:'right'}});
