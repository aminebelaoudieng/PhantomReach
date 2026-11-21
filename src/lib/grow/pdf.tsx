import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { sections, rankColor, rankLabel, type GrowAudit } from "./model";
const green="#114537", ink="#142b25", muted="#54665e";
const styles=StyleSheet.create({
  page:{padding:38,fontFamily:"Helvetica",fontSize:10,color:ink,backgroundColor:"#ffffff"},
  header:{flexDirection:"row",justifyContent:"space-between",borderBottom:"1 solid #dce7e0",paddingBottom:12,marginBottom:26},
  brand:{fontSize:12,fontWeight:"bold",color:green,letterSpacing:1},
  muted:{color:muted,fontSize:9,lineHeight:1.4},
  eyebrow:{fontSize:9,letterSpacing:1.8,color:green,fontWeight:"bold",marginBottom:10},
  title:{fontSize:28,fontWeight:"bold",lineHeight:1.14,marginBottom:12,color:green},
  intro:{fontSize:11,lineHeight:1.5,marginBottom:16,color:muted},
  metrics:{flexDirection:"row",gap:8,marginBottom:16},
  metric:{flex:1,padding:12,backgroundColor:"#edf5f0",borderRadius:7},
  metricValue:{fontSize:17,fontWeight:"bold",color:green,marginBottom:5},
  row:{paddingVertical:8,borderBottom:"1 solid #e6eee9",flexDirection:"row",gap:10},
  label:{width:"32%",fontWeight:"bold",fontSize:10},
  rest:{flex:1},value:{fontSize:10,lineHeight:1.35},detail:{fontSize:8.5,color:muted,marginTop:3,lineHeight:1.35},
  grid:{alignSelf:"center",marginVertical:10,gap:6},gridRow:{flexDirection:"row",gap:6},dot:{width:41,height:41,borderRadius:21,justifyContent:"center",alignItems:"center"},dotText:{color:"white",fontWeight:"bold",fontSize:12},
  barRow:{flexDirection:"row",alignItems:"center",marginBottom:6,gap:8},barLabel:{width:140,fontSize:9},barTrack:{flex:1,height:9,backgroundColor:"#edf1ee",borderRadius:3},barValue:{width:32,textAlign:"right",fontSize:9},
  note:{backgroundColor:"#f4f7f5",padding:10,marginTop:12,color:muted,fontSize:8.5,lineHeight:1.4,borderRadius:5},
  footer:{position:"absolute",bottom:24,left:38,right:38,borderTop:"1 solid #dce7e0",paddingTop:8,flexDirection:"row",justifyContent:"space-between",fontSize:8,color:muted}
});
const colors={ok:"#16835d",improve:"#b45309",unknown:"#64748b"};
const short=(s:string,max=200)=>s.length>max?s.slice(0,max-1)+"…":s;
export function GrowPDF({audit}:{audit:GrowAudit}) {
  return <Document title={"Audit de visibilité - "+audit.name} author="Grow System">
    {sections(audit).map((s,i)=><Page size="A4" key={i} style={styles.page} wrap={false}>
      <View style={styles.header}><Text style={styles.brand}>GROW SYSTEM</Text><Text style={styles.muted}>{audit.date} · Audit de visibilité locale</Text></View>
      <Text style={styles.eyebrow}>{s.eyebrow}</Text>
      <Text style={styles.title}>{i===0?short(audit.name,100):s.title}</Text>
      {i===0&&<Text style={{fontSize:16,color:green,marginBottom:10}}>{s.title} · {short(audit.location,70)}</Text>}
      <Text style={styles.intro}>{short(s.intro,230)}</Text>
      {!!s.metrics?.length&&<View style={styles.metrics}>{s.metrics.map(m=><View style={styles.metric} key={m.label}><Text style={styles.metricValue}>{m.value}</Text><Text style={styles.muted}>{m.label}</Text></View>)}</View>}
      {!!s.grid?.length&&<View style={styles.grid}>{Array.from({length:Math.sqrt(s.grid!.length)},(_,r)=><View style={styles.gridRow} key={r}>{s.grid!.slice(r*Math.sqrt(s.grid!.length),(r+1)*Math.sqrt(s.grid!.length)).map((p,j)=><View style={[styles.dot,{backgroundColor:rankColor(p)}]} key={j}><Text style={styles.dotText}>{rankLabel(p)}</Text></View>)}</View>)}</View>}
      {!!s.bars?.length&&<View style={{marginVertical:10}}>{s.bars.map((b,j)=><View style={styles.barRow} key={j}><Text style={styles.barLabel}>{short(b.label,35)}</Text><View style={styles.barTrack}><View style={{width:(b.value/Math.max(1,...s.bars!.map(v=>v.value))*100)+"%",height:9,backgroundColor:b.own?green:"#82a997",borderRadius:3}}/></View><Text style={styles.barValue}>{b.value}</Text></View>)}</View>}
      {s.rows?.map((r,j)=><View style={styles.row} key={j}><Text style={[styles.label,r.state?{color:colors[r.state]}:{}]}>{short(r.label,85)}</Text><View style={styles.rest}><Text style={styles.value}>{short(r.value,180)}</Text>{r.detail&&<Text style={styles.detail}>{short(r.detail,175)}</Text>}</View></View>)}
      {s.note&&<Text style={styles.note}>{short(s.note,420)}</Text>}
      <View style={styles.footer} fixed><Text>{short(audit.name,65)} · {audit.source}</Text><Text>{i+1} / 9</Text></View>
    </Page>)}
  </Document>;
}
export async function generateGrowPDF(audit:GrowAudit){return renderToBuffer(<GrowPDF audit={audit}/>);}
