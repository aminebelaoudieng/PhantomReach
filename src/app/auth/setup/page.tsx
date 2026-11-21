import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {hostedAuth,readBinding,verifyBasic} from "@/lib/auth/hosted";
import {LoginForm} from "@/components/auth/login-form";
export const dynamic="force-dynamic";
export const metadata={title:"Configuration du compte | Grow System"};
export default async function SetupPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(!hostedAuth()||await readBinding()!==null||!verifyBasic((await headers()).get("authorization")))redirect("/login");
 return <LoginForm initial error={!!(await searchParams).error}/>;
}
