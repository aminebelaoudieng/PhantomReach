import {redirect} from "next/navigation";
import {hostedAuth,readBinding} from "@/lib/auth/hosted";
import {LoginForm} from "@/components/auth/login-form";
export const dynamic="force-dynamic";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!hostedAuth())redirect("/audits");
 const binding=await readBinding();
 return <LoginForm error={!!(await searchParams).error} showSetup={!binding}/>;
}
