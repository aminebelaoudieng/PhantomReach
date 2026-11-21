import React from "react";
import { Document, Page, Text, View, Link, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { sections,rankColor,rankLabel,type GrowAudit,type Tone } from "./model";
const green="#114537", ink="#17312A", muted="#53665D", red="#B42318", pale="#F0F6F2";
const S=StyleSheet.create({
 page:{width:595.28,height:841.89,minHeight:841.89,maxHeight:841.89,paddingHorizontal:38,paddingTop:33,paddingBottom:55,fontFamily:"Helvetica",fontSize:10,color:ink,backgroundColor:"#FFFFFF"},
 hero:{backgroundColor:green,color:"#FFFFFF",padding:25,borderRadius:12,marginBottom:17},
 header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderBottom:"1 solid #D9E6DE",paddingBottom:10,marginBottom:19},
 brand:{fontSize:11,fontWeight:"bold",letterSpacing:1.6,color:green},
 small:{fontSize:8,color:muted,lineHeight:1.3},
 eyebrow:{fontSize:9,fontWeight:"bold",letterSpacing:1.4,color:green,marginBottom:8},
 title:{fontSize:25,fontWeight:"bold",lineHeight:1.12,marginBottom:9,color:green},
 intro:{fontSize:10.5,lineHeight:1.4,color:muted,marginBottom:12},
 metrics:{flexDirection:"row",gap:7,marginBottom:13},metric:{flex:1,padding:11,borderRadius:6,minHeight:66},
 metricValue:{fontSize:19,fontWeight:"bold",marginBottom:4},metricLabel:{fontSize:9,fontWeight:"bold",lineHeight:1.2},
 row:{flexDirection:"row",gap:9,paddingVertical:6,borderBottom:"0.7 solid #DFE9E2"},label:{width:"32%",fontSize:9.3,fontWeight:"bold",lineHeight:1.3},rest:{flex:1},value:{fontSize:10,lineHeight:1.3},detail:{fontSize:8.5,color:muted,lineHeight:1.3,marginTop:3},
 grid:{alignSelf:"center",gap:4,marginBottom:10,padding:10,borderRadius:8,backgroundColor:pale},gridRow:{flexDirection:"row",gap:4},dot:{width:37,height:37,borderRadius:19,justifyContent:"center",alignItems:"center"},dotText:{fontSize:10.5,fontWeight:"bold",color:"white"},
 barRow:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:7},barLabel:{width:140,fontSize:9,lineHeight:1.2},barTrack:{flex:1,height:10,borderRadius:3,backgroundColor:"#E6EEE8"},barNumber:{width:29,textAlign:"right",fontSize:10,fontWeight:"bold"},
 insight:{marginTop:12,padding:11,borderRadius:7,backgroundColor:"#FFF2EF",borderLeft:"3 solid #B42318"},solution:{marginTop:8,padding:11,borderRadius:7,backgroundColor:pale,borderLeft:"3 solid #114537"},
 insightLabel:{fontSize:8.5,fontWeight:"bold",marginBottom:4,letterSpacing:0.7},insightText:{fontSize:10,lineHeight:1.4},
 note:{fontSize:7.6,color:muted,lineHeight:1.32,marginTop:9},footer:{position:"absolute",left:38,right:38,bottom:24,borderTop:"1 solid #DFE9E2",paddingTop:8,flexDirection:"row",justifyContent:"space-between",fontSize:8,color:muted},
 cta:{backgroundColor:green,padding:14,borderRadius:8,marginTop:12},ctaText:{fontSize:12,color:"#FFFFFF",fontWeight:"bold",lineHeight:1.4}
});
const tones:Record<Tone,{bg:string;fg:string}>={alert:{bg:"#FFF0ED",fg:red},good:{bg:"#E8F4EC",fg:green},neutral:{bg:"#F1F4F2",fg:ink}};
const colors={ok:green,improve:red,unknown:"#64748B"};
const clean=(s:string,n:number)=>s.length>n?s.slice(0,n-1).trim()+"…":s;
export function GrowPDF({audit}:{audit:GrowAudit}){
 const report=sections(audit), name=audit.name.split(" | ")[0];
 return <Document title={"Audit de croissance locale – "+name} author="Grow System">
 {report.map((s,i)=><Page key={i} size={{width:595.28,height:841.89}} wrap={false} style={S.page}>
  <View style={S.header}><Text style={S.brand}>GROW SYSTEM</Text><Text style={S.small}>{audit.date} · Audit de visibilité locale</Text></View>
  <Text style={S.eyebrow}>{s.eyebrow}</Text>
  {i===0||s.offer?<View style={S.hero}><Text style={{fontSize:10,color:"#CADED2",marginBottom:8}}>{i===0?"AUDIT PERSONNALISÉ":"VOTRE ACCOMPAGNEMENT"}</Text><Text style={{fontSize:27,fontWeight:"bold",lineHeight:1.12,color:"#FFFFFF",marginBottom:8}}>{i===0?clean(name,115):s.title}</Text><Text style={{fontSize:12,color:"#E4F0E8",lineHeight:1.4}}>{i===0?audit.location+" · "+s.title:s.intro}</Text></View>:<Text style={S.title}>{s.title}</Text>}
  {!s.offer&&<Text style={S.intro}>{clean(s.intro,310)}</Text>}
  {!!s.metrics?.length&&<View style={S.metrics}>{s.metrics.map(m=>{const t=tones[m.tone||"neutral"];return <View key={m.label} style={[S.metric,{backgroundColor:t.bg}]}><Text style={[S.metricValue,{color:t.fg,fontSize:m.value.length>18?13:m.value.length>12?16:19}]}>{m.value}</Text><Text style={S.metricLabel}>{m.label}</Text>{m.detail&&<Text style={[S.small,{marginTop:3}]}>{m.detail}</Text>}</View>})}</View>}
  {!!s.grid?.length&&Number.isInteger(Math.sqrt(s.grid.length))&&<View style={S.grid}><Text style={[S.small,{textAlign:"center",marginBottom:3}]}>NORD ↑ · {audit.spacingKm.toString().replace(".",",")} km entre points</Text>{Array.from({length:Math.sqrt(s.grid.length)},(_,j)=><View style={S.gridRow} key={j}>{s.grid!.slice(j*Math.sqrt(s.grid!.length),(j+1)*Math.sqrt(s.grid!.length)).map((p,k)=><View key={k} style={[S.dot,{backgroundColor:rankColor(p)}]}><Text style={S.dotText}>{rankLabel(p)}</Text></View>)}</View>)}<Text style={[S.small,{textAlign:"center",marginTop:3}]}>Vert : Top 3 · Orange : 4–10 · Rouge : hors résultats</Text></View>}
  {!!s.bars?.length&&<View style={{marginBottom:8}}>{s.bars.map((b,j)=><View key={j} style={S.barRow}><Text style={[S.barLabel,{fontWeight:b.own?"bold":"normal",color:b.own?red:ink}]}>{clean(b.label,48)}</Text><View style={S.barTrack}><View style={{height:10,width:Math.max(0,b.value/Math.max(1,...s.bars!.map(v=>v.value))*100)+"%",backgroundColor:b.own?red:"#70A28B",borderRadius:3}}/></View><Text style={S.barNumber}>{b.value}</Text></View>)}</View>}
  {s.rows?.map((r,j)=><View style={S.row} key={j}><Text style={[S.label,r.state?{color:colors[r.state]}:{}]}>{clean(r.label,85)}</Text><View style={S.rest}><Text style={[S.value,r.state?{color:colors[r.state]}:{}]}>{clean(r.value,205)}</Text>{r.detail&&<Text style={S.detail}>{clean(r.detail,215)}</Text>}</View></View>)}
  {s.impact&&<View style={S.insight}><Text style={[S.insightLabel,{color:red}]}>{s.scenario?"À RETENIR":"IMPACT POUR VOTRE ENTREPRISE"}</Text><Text style={S.insightText}>{s.impact}</Text></View>}
  {s.solution&&(s.offer?<View style={S.cta}>{audit.commercial?.bookingUrl?<Link src={audit.commercial.bookingUrl} style={S.ctaText}>{s.solution}</Link>:<Text style={S.ctaText}>{s.solution}</Text>}</View>:<View style={S.solution}><Text style={[S.insightLabel,{color:green}]}>COMMENT NOUS POUVONS VOUS AIDER</Text><Text style={S.insightText}>{s.solution}</Text></View>)}
  {s.note&&<Text style={S.note}>{s.note}</Text>}
  <View style={S.footer} fixed><Text>{clean(name,62)} · {audit.source}</Text><Text>{i+1} / {report.length}</Text></View>
 </Page>)}
 </Document>;
}
export async function generateGrowPDF(audit:GrowAudit){return renderToBuffer(<GrowPDF audit={audit}/>);}
