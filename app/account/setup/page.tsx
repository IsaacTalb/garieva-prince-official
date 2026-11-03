import Link from "next/link";

export default function AccountSetupPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-8 text-black">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-12 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em]">
          <Link href="/">⌂</Link>
          <span>Garieva Prince</span>
          <span className="w-4" />
        </div>

        <section className="rounded-3xl border border-black/10 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/45">New accounts only</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Create Your Profile</h1>
          <p className="mt-2 text-sm text-black/55">Your email is verified. Add a few details to get started.</p>

          <form className="mt-8 grid gap-5">
            <label className="text-sm font-semibold">Name
              <input className="mt-2 h-12 w-full rounded-xl border border-black/15 px-4" name="name" autoComplete="name" />
            </label>
            <label className="text-sm font-semibold">Username
              <input className="mt-2 h-12 w-full rounded-xl border border-black/15 px-4" name="username" autoComplete="username" />
            </label>
            <label className="text-sm font-semibold">Phone number
              <input className="mt-2 h-12 w-full rounded-xl border border-black/15 px-4" name="phone" autoComplete="tel" />
            </label>
            <label className="flex items-start gap-3 text-sm text-black/65">
              <input type="checkbox" className="mt-1" />
              <span>I agree to the Terms & Privacy Policy.</span>
            </label>
            <button disabled className="h-12 rounded-xl bg-black font-bold text-white opacity-55">Create Account</button>
          </form>
        </section>
      </div>
    </main>
  );
}
