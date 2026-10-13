import Link from "next/link";

export function BrandManifesto() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Garieva Prince / A new chapter</p>
          <h1>Wear your<br /><em>own story.</em></h1>
          <p className="hero-description">An independent wardrobe. A personal identity.<br />A connection that goes beyond the garment.</p>
          <Link className="primary-link" href="/collections">Explore the house <span aria-hidden="true">↗</span></Link>
          <p className="hero-caption">Fashion & digital ownership</p>
        </div>
        <div className="brand-panel" aria-label="Garieva Prince typographic study">
          <div className="panel-top"><span>The house of</span><span>Garieva Prince</span></div>
          <span className="monogram" aria-hidden="true">G<span>P</span></span>
          <div className="panel-bottom"><span>Individual by design.</span><span>Connected by intention.</span></div>
        </div>
      </section>
      <section className="manifesto" aria-labelledby="manifesto-title">
        <p className="eyebrow">The philosophy</p>
        <h2 id="manifesto-title">A garment is only<br />the <em>beginning.</em></h2>
        <div className="manifesto-copy"><p>Garieva Prince brings a considered approach to fashion and the identity we carry with it.</p><p>We are building a place for collections, individual pieces, and the stories of their owners.</p><Link className="text-link" href="/ownership">Discover digital ownership <span aria-hidden="true">→</span></Link></div>
      </section>
      <section className="house-paths" aria-label="Explore Garieva Prince">
        <Link href="/products"><span className="eyebrow">01 / The wardrobe</span><h2>Future essentials.</h2><p>Discover the pieces as the catalog opens.</p><span aria-hidden="true">↗</span></Link>
        <Link href="/ownership"><span className="eyebrow">02 / Beyond the physical</span><h2>A lasting connection.</h2><p>Learn about the digital ownership vision.</p><span aria-hidden="true">↗</span></Link>
      </section>
    </>
  );
}
