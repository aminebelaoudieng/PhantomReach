type GoogleError={error?:{errors?:{reason?:string}[];details?:{reason?:string}[]}};
export async function pageSpeedError(response:Response):Promise<string>{
 const data=await response.json().catch(()=>null) as GoogleError|null;
 const reasons=[...(data?.error?.details||[]).map(d=>d.reason),...(data?.error?.errors||[]).map(d=>d.reason)].filter(Boolean);
 const has=(...keys:string[])=>keys.some(k=>reasons.includes(k));
 const status=response.status;
 let message:string;
 if(has("API_KEY_INVALID","keyInvalid"))message="Clé API invalide. Vérifiez la clé dans Google Cloud et Vercel.";
 else if(has("SERVICE_DISABLED","accessNotConfigured"))message="PageSpeed Insights API n’est pas activée dans le projet Google Cloud de cette clé.";
 else if(has("API_KEY_HTTP_REFERRER_BLOCKED","API_KEY_IP_ADDRESS_BLOCKED","API_KEY_SERVICE_BLOCKED","API_KEY_ANDROID_APP_BLOCKED","API_KEY_IOS_APP_BLOCKED","ipRefererBlocked"))message="Les restrictions de la clé bloquent la requête serveur Vercel. Vérifiez les restrictions d’application et autorisez PageSpeed Insights API.";
 else if(status===429||has("RATE_LIMIT_EXCEEDED","QUOTA_EXCEEDED","rateLimitExceeded","dailyLimitExceeded","userRateLimitExceeded","quotaExceeded"))message="Quota PageSpeed atteint. Vérifiez les quotas Google Cloud ou réessayez plus tard.";
 else if(status===401||status===403)message="Accès refusé. Vérifiez l’activation de PageSpeed Insights API et les restrictions de la clé Google Cloud.";
 else if(status===400)message="Requête refusée par Google. Vérifiez la clé et les paramètres PageSpeed.";
 else if(status>=500)message="Service PageSpeed temporairement indisponible ou analyse impossible. Réessayez.";
 else message="Échec de la requête Google PageSpeed.";
 return "PageSpeed HTTP "+status+" : "+message;
}
export function pageSpeedTimeout(error:unknown){return error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError");}
