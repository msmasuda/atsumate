export function GET() {
  return Response.json({ status: "ok", service: "atsumate", version: "v1" });
}
