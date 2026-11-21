import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";
import { SignInForm } from "@/components/account/sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <PageIntro eyebrow="Garieva Prince" title="Your GP Account">
        <p>Sign in or create an account with your email.</p>
      </PageIntro>
      <section className="page-content">
        <div className="content-card" style={{ maxWidth: 520, marginInline: "auto" }}>
          <SignInForm />
          <Link href="/">Return to store</Link>
        </div>
      </section>
    </>
  );
}
