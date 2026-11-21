import {lookup} from "node:dns/promises";
import {request as httpRequest} from "node:http";
import {request as httpsRequest} from "node:https";
import {isIP} from "node:net";

/** IPv4 only, pinned per request. Reject non-public destinations, including redirects. */
export function publicIPv4(ip:string):boolean{
 if(isIP(ip)!==4)return false;
 const [a,b,c]=ip.split(".").map(Number);
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2||(b===88&&c===99)))||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
}
type Page={url:string;status:number;type:string;body:Buffer};
type Response=Page&{location?:string};
async function once(u:URL,deadline:number,limit:number):Promise<Response>{
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.hostname.length>253||isIP(u.hostname.replace(/^\[|\]$/g,""))||!u.hostname.includes(".")||(u.port&&u.port!==(u.protocol==="https:"?"443":"80")))throw Error("Unsupported public URL");
 const remaining=deadline-Date.now();if(remaining<=0)throw Error("Deadline");
 let dnsTimer:ReturnType<typeof setTimeout>|undefined;
 const addresses=await Promise.race([lookup(u.hostname,{all:true,family:4}),new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(Error("DNS timeout")),Math.min(remaining,3000));})]).finally(()=>clearTimeout(dnsTimer));
 if(!addresses.length||addresses.some(x=>!publicIPv4(x.address)))throw Error("Non-public destination");
 const address=addresses[0].address;
 const left=deadline-Date.now();if(left<=0)throw Error("Deadline");
 return new Promise<Response>((resolve,reject)=>{
  const request=u.protocol==="https:"?httpsRequest:httpRequest;
  const req=request({hostname:address,port:u.protocol==="https:"?443:80,servername:u.hostname,method:"GET",path:u.pathname+u.search,agent:false,signal:AbortSignal.timeout(Math.min(6500,left)),headers:{Host:u.host,"User-Agent":"GrowSystemAudit/1.0","Accept":"text/html,application/xhtml+xml,text/plain,application/xml,text/xml;q=0.8","Accept-Encoding":"identity"}},res=>{
   const status=res.statusCode||0, type=String(res.headers["content-type"]||"").toLowerCase(), location=res.headers.location;
   if(status>=300&&status<400){res.destroy();resolve({url:u.href,status,type,location,body:Buffer.alloc(0)});return;}
   if(status!==200){res.destroy();resolve({url:u.href,status,type,body:Buffer.alloc(0)});return;}
   if(res.headers["content-encoding"]&&res.headers["content-encoding"]!=="identity"){res.destroy();reject(Error("Unsupported encoding"));return;}
   if(Number(res.headers["content-length"])>limit){res.destroy();reject(Error("Too large"));return;}
   const chunks:Buffer[]=[];let size=0;
   res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>limit){res.destroy(Error("Too large"));req.destroy();reject(Error("Too large"));}else chunks.push(chunk);});
   res.on("end",()=>resolve({url:u.href,status,type,body:Buffer.concat(chunks)}));
   res.on("error",reject);
  });req.on("error",reject);req.end();
 });
}
export async function getPublicPage(url:string,deadline:number,limit=1_000_000):Promise<Page>{
 let current=new URL(url);
 for(let hop=0;hop<=3;hop++){
  const res=await once(current,deadline,limit);
  if(res.status>=300&&res.status<400&&res.location){current=new URL(res.location,current);continue;}
  return res;
 }
 throw Error("Redirect limit");
}
