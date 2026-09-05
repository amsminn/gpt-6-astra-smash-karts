// Sites hosts the browser client. The standalone Node service owns multiplayer.
export function GET() {
  return Response.json(
    { ok: true, multiplayer: false },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
