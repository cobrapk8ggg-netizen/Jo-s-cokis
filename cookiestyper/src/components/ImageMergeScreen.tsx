import React from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Item = { id: string; uri: string };
type Props = { onLog: (description: string) => void };

export const ImageMergeScreen: React.FC<Props> = ({ onLog }) => {
  const [name, setName] = React.useState('');
  const [uriInput, setUriInput] = React.useState('');
  const [items, setItems] = React.useState<Item[]>([]);
  const [generated, setGenerated] = React.useState(false);

  const addImage = () => {
    if (!uriInput.trim()) return;
    setItems(prev => [...prev, { id: `${Date.now()}`, uri: uriInput.trim() }]);
    setUriInput('');
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const cp = [...items];
    const [it] = cp.splice(index, 1);
    cp.splice(next, 0, it);
    setItems(cp);
  };

  const merge = () => {
    if (!items.length) return;
    setGenerated(true);
    onLog(`تم توليد معاينة دمج عمودية لـ ${items.length} صورة.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.box}><Text style={styles.boxTitle}>إعدادات الإخراج</Text>
          <Text style={styles.label}>الصيغة: PNG</Text>
          <TextInput placeholder="اسم الصورة الناتجة" placeholderTextColor="#666" value={name} onChangeText={setName} style={styles.input}/>
          <View style={styles.row}><TouchableOpacity onPress={() => { setItems([]); setGenerated(false); onLog('تم مسح كل صور مشروع الدمج.');}} style={styles.ghost}><Text style={styles.ghostText}>مسح الكل</Text></TouchableOpacity><TouchableOpacity onPress={merge} style={styles.primary}><Text style={styles.primaryText}>ابدأ الدمج</Text></TouchableOpacity></View>
        </View>

        <View style={styles.box}><Text style={styles.boxTitle}>رفع الصور</Text>
          <Text style={styles.tip}>أدخل رابط/مسار الصورة ثم اضغط إضافة</Text>
          <TextInput value={uriInput} onChangeText={setUriInput} style={styles.input} placeholder="file:// أو https://..." placeholderTextColor="#666"/>
          <TouchableOpacity onPress={addImage} style={styles.primary}><Text style={styles.primaryText}>إضافة صورة</Text></TouchableOpacity>
        </View>

        <View style={styles.box}><Text style={styles.boxTitle}>المعرض — {items.length}</Text>
          {items.map((it, idx) => <View key={it.id} style={styles.item}><Text style={styles.idx}>{idx + 1}</Text><Text numberOfLines={1} style={styles.uri}>{it.uri}</Text><TouchableOpacity onPress={() => move(idx, -1)}><Text style={styles.control}>↑</Text></TouchableOpacity><TouchableOpacity onPress={() => move(idx, 1)}><Text style={styles.control}>↓</Text></TouchableOpacity><TouchableOpacity onPress={() => {setItems(prev=>prev.filter(x=>x.id!==it.id)); onLog('تم حذف صورة من مشروع الدمج.');}}><Text style={styles.del}>حذف</Text></TouchableOpacity></View>)}
        </View>

        <View style={styles.box}><Text style={styles.boxTitle}>الناتج</Text>
          {!generated ? <Text style={styles.tip}>لم يتم توليد صورة بعد</Text> : <View>{items.map(it => <Image key={it.id} source={{ uri: it.uri }} style={styles.preview} resizeMode="cover" />)}</View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safe:{flex:1}, container:{padding:14,gap:10}, box:{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:16,borderWidth:1,borderStyle:'dashed',borderColor:'rgba(255,255,255,0.2)',padding:12}, boxTitle:{color:'white',fontWeight:'900',textAlign:'right',marginBottom:8}, label:{color:'#ddd',textAlign:'right'}, input:{backgroundColor:'rgba(0,0,0,0.4)',color:'white',borderRadius:10,paddingHorizontal:12,paddingVertical:10,marginTop:8,textAlign:'right'}, row:{flexDirection:'row',gap:8,marginTop:8}, primary:{flex:1,backgroundColor:'#F2A6B8',borderRadius:12,padding:12,alignItems:'center',marginTop:8}, primaryText:{color:'white',fontWeight:'900'}, ghost:{flex:1,borderWidth:1,borderColor:'rgba(255,255,255,0.2)',borderRadius:12,padding:12,alignItems:'center',marginTop:8}, ghostText:{color:'#ddd'}, tip:{color:'rgba(255,255,255,0.6)',textAlign:'right'}, item:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginTop:8,padding:8,backgroundColor:'rgba(255,255,255,0.04)',borderRadius:10}, idx:{color:'#F2A6B8',fontWeight:'900'}, uri:{flex:1,color:'white',fontSize:11}, control:{color:'white',paddingHorizontal:4}, del:{color:'#f87171'}, preview:{width:'100%',height:130,marginTop:2} });
