"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="page-intro"><p className="eyebrow">Please try again</p><h1>A brief interruption.</h1><p>This page is temporarily unavailable.</p><button className="primary-link" onClick={reset}>Try again</button></section>;
}
