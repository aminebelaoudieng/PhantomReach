import {redirect} from "next/navigation";
import {hostedAuth,readBinding} from "@/lib/auth/hosted";
import {LoginForm} from "@/components/auth/login-form";
export const dynamic="force-dynamic";
export const metadata={title:"Connexion | Grow System",description:"Espace privé Grow System"};
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!hostedAuth())redirect("/audits");
 let configured=false,unavailable=false;
 try{configured=!!(await readBinding());}catch{unavailable=true;}
 return <LoginForm error={!!(await searchParams).error} needsSetup={!configured&&!unavailable} unavailable={unavailable}/>;
}
