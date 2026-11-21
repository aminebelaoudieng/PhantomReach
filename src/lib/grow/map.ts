import type { Point } from "./model";
export type Road={points:[number,number][];major:boolean};
export type MapData={roads:Road[];labels:{x:number;y:number;name:string}[];pins:{x:number;y:number}[]};
export function mapProjection(grid:Point[]){
 if(!grid.length||grid.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lng)))return null;
 const lats=grid.map(p=>p.lat), lngs=grid.map(p=>p.lng);
 const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
 const dy=Math.max(maxLat-minLat,.003),dx=Math.max(maxLng-minLng,.003),lat=(minLat+maxLat)/2,lng=(minLng+maxLng)/2;
 const h=dy*1.28, w=Math.max(dx*1.28,h*1.65/Math.max(.2,Math.cos(lat*Math.PI/180)));
 const south=lat-h/2,north=lat+h/2,west=lng-w/2,east=lng+w/2;
 const project=(y:number,x:number):[number,number]=>[(x-west)/(east-west)*480,(north-y)/(north-south)*290];
 return {south,north,west,east,project};
}
export async function loadMap(grid:Point[]):Promise<MapData|undefined>{
 const p=mapProjection(grid);if(!p||grid.length<2||p.north-p.south>.12||p.east-p.west>.2||process.env.GROW_OSM_MAP==="off")return;
 // Read only a small geographic extract, cached by Next. No paid map API or SerpKite call.
 const box=[p.south,p.west,p.north,p.east].map(v=>v.toFixed(5)).join(",");
 const query='[out:json][timeout:5];(way["highway"~"^(primary|secondary|tertiary|residential|unclassified|trunk|motorway)$"]('+box+');node["place"~"^(suburb|neighbourhood|quarter)$"]('+box+'););out geom;';
 try{
  const res=await fetch("https://overpass-api.de/api/interpreter?data="+encodeURIComponent(query),{headers:{"User-Agent":"GrowSystemAudit/1.0 (local visibility report)"},signal:AbortSignal.timeout(7000),next:{revalidate:604800}});
  if(!res.ok)return;
  const raw=await res.json() as {elements?:{type:string;lat?:number;lon?:number;tags?:{name?:string;highway?:string};geometry?:{lat:number;lon:number}[]}[]};
  const roads:Road[]=[],labels:MapData["labels"]=[];
  for(const e of (raw.elements||[]).slice(0,1600)){
   if(e.type==="way"&&e.geometry?.length){const pts=e.geometry.filter(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lon)).map(v=>p.project(v.lat,v.lon));if(pts.length>1)roads.push({points:pts,major:!["residential","unclassified"].includes(e.tags?.highway||"")});}
   if(e.type==="node"&&e.tags?.name&&typeof e.lat==="number"&&typeof e.lon==="number"&&labels.length<6){const [x,y]=p.project(e.lat,e.lon);if(x>25&&x<430&&y>15&&y<270)labels.push({x,y,name:e.tags.name.slice(0,25)});}
  }
  if(!roads.length)return;
  return {roads,labels,pins:grid.map(v=>{const [x,y]=p.project(v.lat,v.lng);return{x,y};})};
 }catch{return;}
}
