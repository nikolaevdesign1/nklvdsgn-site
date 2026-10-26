"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "nklv.session";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedEmail: string | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readEmail() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedEmail;
    cachedRaw = raw;
    cachedEmail = null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    cachedEmail = parsed.email || null;
    return cachedEmail;
  } catch {
    return cachedEmail;
  }
}

function saveEmail(nextEmail: string) {
  const raw = JSON.stringify({ email: nextEmail });
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedEmail = nextEmail;
  emit();
}

function clearEmail() {
  localStorage.removeItem(STORAGE_KEY);
  cachedRaw = null;
  cachedEmail = null;
  emit();
}

const fieldClass =
  "rounded-none border-white/15 bg-transparent text-base text-foreground";

export function SignInForm() {
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const email = useSyncExternalStore(subscribe, readEmail, () => null);
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail) || password.length === 0) {
      setError("Check the email and password.");
      return;
    }

    saveEmail(nextEmail);
    setError("");
  }

  function signOut() {
    clearEmail();
    setError("");
  }

  if (!ready) {
    return <p className="font-mono text-[11px] text-quiet">Loading</p>;
  }

  if (email) {
    return (
      <div className="border border-white/15 bg-[#121214] p-4 text-foreground">
        <p className="font-sans text-sm">Signed in</p>
        <p className="mt-2 font-mono text-[11px] text-quiet">{email}</p>
        <Button
          type="button"
          variant="outline"
          onClick={signOut}
          className="mt-4 h-8 rounded-none border-white/15 bg-transparent px-3 font-mono text-[11px] text-foreground hover:bg-transparent hover:text-ice"
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 border border-white/15 bg-[#121214] p-4 text-foreground"
    >
      <p className="font-sans text-[13px] text-quiet">
        Preview sign-in. No account is created.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sign-in-email" className="font-mono text-[11px] text-quiet">
          Email
        </label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="username"
          aria-invalid={error ? true : undefined}
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sign-in-password"
          className="font-mono text-[11px] text-quiet"
        >
          Password
        </label>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          className={fieldClass}
        />
      </div>
      {error ? (
        <p className="font-mono text-[11px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-8 w-fit rounded-none bg-foreground px-3 font-mono text-[11px] text-background hover:bg-ice hover:text-background"
      >
        Sign in
      </Button>
    </form>
  );
}
