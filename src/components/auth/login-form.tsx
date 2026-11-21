import Link from "next/link";
import {login,setup} from "@/app/auth/actions";
export function LoginForm({initial=false,error=false,showSetup=false}:{initial?:boolean;error?:boolean;showSetup?:boolean}){
 return <main className="min-h-screen flex items-center justify-center bg-[#f3f6f2] p-5">
  <section className="w-full max-w-md rounded-2xl border border-[#dbe4dd] bg-white p-8 shadow-sm sm:p-10">
   <div className="mb-8 flex items-center gap-3 text-[#114537]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#114537] font-bold text-white">G</span><span className="text-xl font-bold tracking-tight">Grow System</span></div>
   <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#547568]">Espace privé · PhantomReach</p>
   <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#114537]">{initial?"Rattacher votre compte":"Connexion"}</h1>
   <p className="mt-3 text-sm leading-relaxed text-slate-600">{initial?"Connectez le compte Supabase Auth que vous avez créé dans votre projet. Vos rapports existants seront conservés. Cette opération ne peut être réalisée qu’une fois.":"Accédez à vos audits, rapports et paramètres avec votre compte Supabase."}</p>
   {error&&<p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">Connexion impossible. Vérifiez vos identifiants et que votre compte est confirmé et autorisé.</p>}
   <form action={initial?setup:login} className="mt-6 grid gap-4">
    <label className="grid gap-1.5 text-sm font-medium text-slate-800">Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength={254} className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-[#114537]" placeholder="vous@entreprise.ca"/></label>
    <label className="grid gap-1.5 text-sm font-medium text-slate-800">Mot de passe<input name="password" type="password" autoComplete="current-password" required maxLength={256} className="rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-[#114537]"/></label>
    <button type="submit" className="mt-2 rounded-lg bg-[#114537] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d5b48]">{initial?"Rattacher mon compte et me connecter":"Se connecter"}</button>
   </form>
   {showSetup&&<div className="mt-6 border-t pt-4 text-sm text-slate-600">Première configuration ? <Link className="font-semibold text-[#114537] underline" href="/auth/setup">Rattacher un compte</Link></div>}
   {initial&&<p className="mt-5 text-xs leading-relaxed text-slate-500">Créez d’abord votre utilisateur dans Supabase → Authentication → Users. Aucun accès public n’est créé.</p>}
  </section>
 </main>;
}
