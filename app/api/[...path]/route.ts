import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const uid = Number(req.cookies.get("uid")?.value) || null;
  let body: unknown = null;
  if (req.method === "POST") body = await req.json().catch(() => ({}));
  try {
    const { result, newUid } = handle(req.method, path.join("/"), uid, body, req.nextUrl.searchParams);
    const csv = result as { __csv?: string; filename?: string };
    const res = csv && typeof csv === "object" && "__csv" in csv
      ? new NextResponse(csv.__csv, { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="${csv.filename}"` } })
      : NextResponse.json(result);
    if (newUid) res.cookies.set("uid", String(newUid), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export { run as GET, run as POST };
