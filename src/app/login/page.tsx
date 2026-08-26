import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/shared/ui";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Image src="/logo.png" alt="EstateOS" width={56} height={56} className="mx-auto rounded-xl" priority />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">EstateOS</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your estate</p>
        </div>
        <Card>
          <LoginForm />
        </Card>
        <p className="text-center text-sm text-slate-500">
          New estate?{" "}
          <Link href="/signup" className="font-medium text-slate-900 underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
