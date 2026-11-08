import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <PageIntro eyebrow="Garieva Prince" title="Your GP Account">
        <p>Sign in or create an account with your email.</p>
      </PageIntro>
      <section className="page-content">
        <div className="content-card" style={{ maxWidth: 520, marginInline: "auto" }}>
          <form>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </label>
            <button type="submit" className="primary-link" disabled>Continue</button>
          </form>
          <p>Brevo OTP delivery and D1 session endpoints are being connected in the next implementation step.</p>
          <Link href="/">Return to store</Link>
        </div>
      </section>
    </>
  );
}
