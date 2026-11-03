import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-black">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-16 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]">
          <Link href="/" aria-label="Back to Garieva Prince">⌂</Link>
          <span>Garieva Prince</span>
          <span className="w-4" />
        </div>

        <section className="rounded-3xl border border-black/10 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/45">Your GP Account</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Sign in or create an account</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Enter your email. We&apos;ll send a 6-digit verification code through Garieva Prince email.
          </p>

          <form className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-xl border border-black/15 px-4 outline-none transition focus:border-black"
              />
            </label>

            <button
              type="submit"
              disabled
              className="h-12 w-full rounded-xl bg-black text-sm font-bold text-white opacity-55"
            >
              Continue
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-black/45">
            Brevo OTP delivery and D1 session endpoints are the next implementation step. The button stays disabled until the server flow is connected.
          </p>
        </section>
      </div>
    </main>
  );
}
