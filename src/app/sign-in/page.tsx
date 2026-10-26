import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Preview sign-in for uixcorp.com.",
};

export default function SignInPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-16 sm:px-8">
        <h1 className="font-sans text-3xl text-foreground">Sign in</h1>
        <SignInForm />
      </main>
    </div>
  );
}
