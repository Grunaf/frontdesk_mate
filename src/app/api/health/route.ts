import { supabase } from "@/lib/db/client";

export async function GET() {
  const result = await supabase
    .from("health_check")
    .select("id")
    .limit(1)

  return Response.json({
    ok: true,
    db: "connected",
  });
}