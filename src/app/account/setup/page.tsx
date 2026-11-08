import { PageIntro } from "@/components/shared/page-intro";

export const metadata = { title: "Create your profile" };

export default function AccountSetupPage() {
  return (
    <>
      <PageIntro eyebrow="New accounts only" title="Create Your Profile">
        <p>Your email is verified. Add a few details to get started.</p>
      </PageIntro>
      <section className="page-content">
        <div className="content-card" style={{ maxWidth: 620, marginInline: "auto" }}>
          <form>
            <label>Name<input name="name" autoComplete="name" /></label>
            <label>Username<input name="username" autoComplete="username" /></label>
            <label>Phone number<input name="phone" autoComplete="tel" /></label>
            <label><input type="checkbox" /> I agree to the Terms & Privacy Policy.</label>
            <button className="primary-link" disabled>Create Account</button>
          </form>
        </div>
      </section>
    </>
  );
}
