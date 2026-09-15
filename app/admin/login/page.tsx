import { redirect } from "next/navigation";import { getAdmin } from "@/lib/security";import { LoginForm } from "@/components/LoginForm";
export default async function Login(){if(await getAdmin())redirect("/admin");return <main className="login-page"><LoginForm/></main>}
