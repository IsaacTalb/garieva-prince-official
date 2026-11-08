export function GET() {
  // Liveness only; no credentials, dependency configuration, or customer data.
  return Response.json({ status: "ok", service: "garieva-prince" }, { headers: { "Cache-Control": "no-store" } });
}
