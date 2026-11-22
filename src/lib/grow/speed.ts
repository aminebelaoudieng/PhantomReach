import {runPageSpeedAudit} from "@/lib/agents/tools/pagespeed";
import {websiteDetails} from "./website-details";
import type {GrowAudit} from "./model";

export async function measureWebsiteSpeed(url:string):Promise<Pick<GrowAudit["website"],"performance"|"seo"|"details"|"desktopPerformance"|"desktopDetails"|"speedStatus"|"speedTestedAt">>{
 const mobile=await runPageSpeedAudit({url,strategy:"mobile"}).catch(()=>undefined);
 const blocked=mobile&&"unavailable" in mobile&&(mobile.status==="blocked"||mobile.status==="missing_api_key");
 const desktop=blocked?undefined:await runPageSpeedAudit({url,strategy:"desktop"}).catch(()=>undefined);
 const m=mobile&&"analysis" in mobile?mobile:undefined;
 const d=desktop&&"analysis" in desktop?desktop:undefined;
 return {
  performance:m?m.analysis.performance_score:null,seo:m?m.analysis.seo_score:null,details:m?websiteDetails(m.rawLighthouse):undefined,
  desktopPerformance:d?d.analysis.performance_score:null,desktopDetails:d?websiteDetails(d.rawLighthouse):undefined,
  speedStatus:{mobile:m?undefined:mobile&&"unavailable" in mobile?mobile.reason:"Test non disponible",desktop:d?undefined:blocked?"Test interrompu : vérifier d’abord la configuration du service de vitesse.":desktop&&"unavailable" in desktop?desktop.reason:"Test non disponible"},
  speedTestedAt:new Date().toISOString()
 };
}
