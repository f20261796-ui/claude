"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "", email: "" });
  return (
    <form action={action} className="space-y-8">
      <div>
        <label htmlFor="email" className="label text-bone/55">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.email ?? ""} key={state?.email} className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label text-bone/55">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-[#ff6b6f]">{state.error}</p>}
      <button
        disabled={pending}
        className="h-14 w-full rounded-full bg-blood font-display font-bold uppercase tracking-tight text-bone transition-opacity disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
