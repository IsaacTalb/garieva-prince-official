"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [purpose, setPurpose] = useState<"sign_in" | "sign_up">("sign_in");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/auth/${purpose === "sign_in" ? "signin" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Could not send a verification code.");
        return;
      }
      setCodeSent(true);
      setMessage(result.message ?? "Check your email for a verification code.");
    } catch {
      setMessage("Could not send a verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, purpose }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "That code could not be verified.");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setMessage("That code could not be verified. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sign-in-form">
      {!codeSent ? (
        <form onSubmit={sendCode}>
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            <span>Account action</span>
            <select
              value={purpose}
              onChange={(event) =>
                setPurpose(event.currentTarget.value === "sign_up" ? "sign_up" : "sign_in")
              }
            >
              <option value="sign_in">Sign in</option>
              <option value="sign_up">Create an account</option>
            </select>
          </label>
          <button type="submit" className="primary-link" disabled={busy}>
            {busy ? "Sending..." : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p>Enter the 6-digit code sent to {email}.</p>
          <label>
            Verification code
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.currentTarget.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary-link" disabled={busy}>
              {busy ? "Verifying..." : "Verify and continue"}
            </button>
            <button
              type="button"
              className="outline-button"
              disabled={busy}
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setMessage("");
              }}
            >
              Change email
            </button>
          </div>
        </form>
      )}
      <p className="form-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
