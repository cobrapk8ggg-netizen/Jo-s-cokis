import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Menu, Upload, ChevronUp, ChevronDown, Trash2 } from 'lucide-react-native';

type Img = { id: string; uri: string };

export const ImageMergeScreen = ({ onOpenMenu, onLog }: { onOpenMenu: () => void; onLog: (text: string) => void; }) => {
  const [images, setImages] = useState<Img[]>([]);
  const [fileName, setFileName] = useState('');
  const [unifyWidth, setUnifyWidth] = useState(true);

  const addMock = () => {
    const id = `${Date.now()}`;
    setImages(prev => [...prev, { id, uri: 'https://picsum.photos/500/900' }]);
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={onOpenMenu} style={styles.menu}><Menu color='white' size={22} /></TouchableOpacity><Text style={styles.title}>دمج الصور</Text></View>
    <View style={styles.card}><Text style={styles.label}>الصيغة</Text><Text style={styles.value}>PNG</Text><View style={styles.row}><Text style={styles.label}>توحيد العرض عند الدمج</Text><Switch value={unifyWidth} onValueChange={setUnifyWidth} /></View><TextInput value={fileName} onChangeText={setFileName} placeholder='اسم الصورة الناتجة' placeholderTextColor='rgba(255,255,255,0.4)' style={styles.input}/><TouchableOpacity style={styles.primary} onPress={()=>onLog(`تم توليد ناتج دمج ${images.length} صورة عموديًا.`)}><Text style={styles.primaryText}>ابدأ الدمج</Text></TouchableOpacity></View>
    <TouchableOpacity style={styles.upload} onPress={addMock}><Upload color='#F2A6B8' /><Text style={styles.uploadText}>ارفع الصور</Text><Text style={styles.hint}>اضغط لاختيار الصور أو اسحبها هنا إن كان السحب مدعومًا</Text></TouchableOpacity>
    <View style={styles.card}><Text style={styles.label}>المعرض — {images.length}</Text>{images.map((img, i)=><View key={img.id} style={styles.item}><Text style={styles.idx}>{i+1}</Text><Image source={{uri:img.uri}} style={styles.thumb}/><View style={styles.actions}><TouchableOpacity onPress={()=> i>0 && setImages(p=>{const n=[...p];[n[i-1],n[i]]=[n[i],n[i-1]];return n;})}><ChevronUp color='white' /></TouchableOpacity><TouchableOpacity onPress={()=> i<images.length-1 && setImages(p=>{const n=[...p];[n[i+1],n[i]]=[n[i],n[i+1]];return n;})}><ChevronDown color='white' /></TouchableOpacity><TouchableOpacity onPress={()=>{setImages(p=>p.filter(x=>x.id!==img.id));onLog('تم حذف صورة من مشروع الدمج.')}}><Trash2 color='#f87171' /></TouchableOpacity></View></View>)}</View>
    <View style={styles.card}><Text style={styles.label}>الناتج</Text><Text style={styles.hint}>{images.length ? 'معاينة حقيقية داخلية (عمودية)' : 'لم يتم توليد صورة بعد'}</Text>{images.length>0 && <ScrollView style={{maxHeight:320}}>{images.map(x=><Image key={x.id} source={{uri:x.uri}} style={styles.preview}/>)}</ScrollView>}</View>
  </ScrollView></SafeAreaView>;
};

const styles=StyleSheet.create({safe:{flex:1},content:{padding:16,gap:12},header:{flexDirection:'row-reverse',justifyContent:'space-between'},menu:{width:42,height:42,borderRadius:14,backgroundColor:'rgba(255,255,255,0.08)',justifyContent:'center',alignItems:'center'},title:{color:'white',fontWeight:'900',fontSize:24},card:{backgroundColor:'rgba(10,10,14,0.72)',borderRadius:22,padding:14,borderWidth:1,borderColor:'rgba(242,166,184,0.18)'},label:{color:'white',textAlign:'right',fontWeight:'800'},value:{color:'#F2A6B8',textAlign:'right',fontWeight:'900',marginTop:6},row:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',marginVertical:8},input:{backgroundColor:'rgba(255,255,255,0.06)',borderRadius:12,padding:10,color:'white',textAlign:'right',marginTop:8},primary:{backgroundColor:'#0ea5e9',borderRadius:14,padding:12,alignItems:'center',marginTop:10},primaryText:{color:'white',fontWeight:'900'},upload:{borderStyle:'dashed',borderWidth:1.5,borderColor:'rgba(242,166,184,0.4)',borderRadius:22,padding:24,alignItems:'center'},uploadText:{color:'white',fontSize:20,fontWeight:'900',marginTop:8},hint:{color:'rgba(255,255,255,0.5)',textAlign:'center',marginTop:6},item:{flexDirection:'row-reverse',gap:8,alignItems:'center',marginTop:10},idx:{color:'#F2A6B8',fontWeight:'900'},thumb:{width:70,height:70,borderRadius:12},actions:{flexDirection:'row',gap:8},preview:{width:'100%',height:220,resizeMode:'cover'}})
