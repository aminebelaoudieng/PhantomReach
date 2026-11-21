"use client";

import {useState} from "react";
import {useFormStatus} from "react-dom";
import {ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, Eye, EyeOff, FileText, Globe2, LockKeyhole, Mail, MapPin, ShieldCheck, Sparkles, Star, Loader2} from "lucide-react";
import {login} from "@/app/auth/actions";
import styles from "./login.module.css";

function Brand({light=false}:{light?:boolean}){
 return <div className={styles.brand} style={{color:light?"#fff":"#114537"}}>
   <svg width="33" height="33" viewBox="0 0 33 33" aria-hidden="true"><rect width="33" height="33" rx="8" fill={light?"#C8F19A":"#114537"}/><path d="M7 25V19L12 16V25H7ZM14 25V13L19 10V25H14ZM21 25V8L26 5V25H21Z" fill={light?"#114537":"#C8F19A"}/></svg>
   <span>grow<span className={styles.brandRegular}>system</span><span className={styles.brandDot}>.</span></span>
 </div>;
}

function ProductPreview(){
 const ranks=[12,9,7,11,14,8,5,3,6,10,7,3,1,2,5,10,6,2,4,9,14,11,8,9,12];
 return <div className={styles.preview} aria-hidden="true">
  <div className={styles.previewTop}><div className={styles.previewDots}><i/><i/><i/></div><span>Tableau de bord</span><span className={styles.previewExample}>APERÇU</span></div>
  <div className={styles.previewBody}>
   <div className={styles.previewTitle}><div><span>VOTRE VISIBILITÉ LOCALE</span><strong>Une vision claire.</strong></div><div className={styles.previewIcon}><BarChart3 size={19}/></div></div>
   <div className={styles.previewGrid}>
    <div className={styles.mapTile}>
     <div className={styles.tileTitle}><MapPin size={13}/> Positions Google</div>
     <div className={styles.map}>
      <svg viewBox="0 0 250 164" preserveAspectRatio="none"><path d="M-15 14L62 70 100 45 190 106 260 54M37-10L86 61 46 135 95 185M146-10L115 55 157 119 132 178M204-12L175 56 231 112 214 173M-10 95L65 110 136 84 261 155M-7 156L57 148 116 124 258 114" fill="none" stroke="#fff" strokeWidth="7"/><path d="M-20 27L82 80 169 35 272 84M118-15L97 47 157 121 148 179" fill="none" stroke="#d2ded2" strokeWidth="3"/></svg>
      <div className={styles.ranks}>{ranks.map((n,i)=><span key={i} style={{background:n<=3?"#25895f":n<=10?"#bf9138":"#b95b50"}}>{n}</span>)}</div>
     </div>
    </div>
    <div className={styles.summaryTile}>
     <span className={styles.tileTitle}><Star size={13}/> Réputation</span>
     <div className={styles.stars}>★★★★★</div>
     <strong>Les bons signaux.</strong>
     <div className={styles.previewLine}><span/><i style={{width:"70%"}}/></div><div className={styles.previewLine}><span/><i style={{width:"46%"}}/></div>
     <div className={styles.tileDivider}/>
     <span className={styles.tileTitle}><Sparkles size={13}/> Plan d’action</span>
     <span className={styles.previewTask}><CheckCircle2 size={13}/> Priorités identifiées</span>
     <span className={styles.previewTask}><CheckCircle2 size={13}/> Actions mesurables</span>
    </div>
   </div>
   <div className={styles.previewBottom}><FileText size={17}/><div><strong>Rapport de croissance</strong><small>Diagnostic · Stratégie · Accompagnement</small></div><ArrowUpRight size={17}/></div>
  </div>
 </div>;
}

function Submit(){
 const {pending}=useFormStatus();
 return <button type="submit" disabled={pending} className={styles.submit}>{pending?<><Loader2 className={styles.spin} size={19}/> Connexion en cours…</>:<>Se connecter<ArrowRight size={19}/></>}</button>;
}

export function LoginForm({error=false,needsSetup=false,unavailable=false}:{error?:boolean;needsSetup?:boolean;unavailable?:boolean}){
 const [visible,setVisible]=useState(false);
 return <main lang="fr" className={styles.shell}>
  <aside className={styles.story}>
   <div className={styles.storyPattern} aria-hidden="true"/>
   <header className={styles.storyHeader}><Brand light/><span className={styles.workspace}>PLATEFORME D’AUDIT</span></header>
   <div className={styles.storyContent}>
    <div className={styles.eyebrow}><span/> L’INTELLIGENCE LOCALE, SIMPLIFIÉE</div>
    <h2>De la recherche<br/>à la <em>demande.</em></h2>
    <p className={styles.storyDescription}>Comprenez votre marché, identifiez les opportunités et transformez vos analyses en plans de croissance concrets.</p>
    <ProductPreview/>
    <div className={styles.pillars}><span><MapPin size={16}/> Google Maps</span><span><Star size={16}/> Réputation</span><span><Globe2 size={16}/> Site web</span><span><Sparkles size={16}/> Visibilité IA</span></div>
   </div>
   <footer className={styles.storyFooter}><span>Être trouvé. Inspirer confiance. Convertir.</span><span>GROW SYSTEM / 01</span></footer>
  </aside>
  <section className={styles.access}>
   <header className={styles.accessHeader}><Brand/><span className={styles.secure}><LockKeyhole size={13}/> Accès privé</span></header>
   <div className={styles.accessBody}>
    <div className={styles.loginIcon}><LockKeyhole size={23} strokeWidth={1.7}/></div>
    <p className={styles.kicker}>VOTRE ESPACE DE TRAVAIL</p>
    <h1>Bon retour.</h1>
    <p className={styles.intro}>Connectez-vous à votre espace pour accéder à vos audits, vos rapports et vos outils de croissance.</p>
    {error&&<p role="alert" className={styles.error}>Connexion impossible. Vérifiez vos identifiants et que votre compte est confirmé et autorisé.</p>}
    <form className={styles.form} action={login}>
     <div className={styles.field}><label htmlFor="login-email">Adresse e-mail</label><div className={styles.inputWrap}><Mail size={18} aria-hidden="true"/><input id="login-email" type="email" name="email" autoComplete="username" required maxLength={254} placeholder="vous@entreprise.ca"/></div></div>
     <div className={styles.field}><label htmlFor="login-password">Mot de passe</label><div className={styles.inputWrap}><LockKeyhole size={18} aria-hidden="true"/><input id="login-password" type={visible?"text":"password"} name="password" autoComplete="current-password" required maxLength={256} placeholder="Votre mot de passe"/><button type="button" className={styles.passwordToggle} onClick={()=>setVisible(v=>!v)} aria-label={visible?"Masquer le mot de passe":"Afficher le mot de passe"} aria-pressed={visible}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
     <Submit/>
    </form>
    {needsSetup&&<p className={styles.setup} role="status">Première configuration : le compte doit être créé et rattaché à cet espace par l’administrateur Supabase. Aucune inscription publique.</p>}
    {unavailable&&<p className={styles.error} role="alert">Le service de connexion est temporairement indisponible.</p>}
    <div className={styles.trust}><ShieldCheck size={20} strokeWidth={1.7}/><div><strong>Un espace réservé à votre équipe.</strong><p>Authentification sécurisée par Supabase.</p></div></div>
   </div>
   <footer className={styles.accessFooter}><span>© {new Date().getFullYear()} Grow System</span><span>PhantomReach · Espace privé</span></footer>
  </section>
 </main>;
}
