// fetch-hudl-avatar Edge Function
//
// Fetches a student's Hudl profile page, extracts their photo from the
// og:image meta tag, downloads the image bytes, uploads to Supabase Storage
// (avatars bucket), and writes the storage path back to
// public.profiles.avatar_storage_path.
//
// Detection logic:
//   Hudl profile pages include an <meta property="og:image" content="..."/> tag.
//   - If the tag has a URL (e.g. https://static.hudl.com/users/prod/...jpg),
//     that is the profile photo — download and store it.
//   - If the tag is empty (<meta property="og:image" />) or contains a
//     blank-avatar/placeholder URL, the user has no photo — leave
//     avatar_storage_path NULL.
//
// Called fire-and-forget from ProfilePage after a successful save when
// hudl_url is set or changed.
//
// Required env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  — needed to write profiles + Storage without RLS
//
// Request body:
//   { user_id: string, hudl_url: string }
//
// Response:
//   200 { ok: true, status: "uploaded" | "placeholder" }
//   400 { error: string }
//   500 { error: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Signals that the og:image is a placeholder, not a real photo
const PLACEHOLDER_SIGNALS = ["blank-avatar", "default-avatar", "placeholder"];

// Extract the og:image URL from raw HTML.
// Handles both: <meta property="og:image" content="URL" />
//           and: <meta content="URL" property="og:image" />
//           and: <meta property="og:image" />  (empty — no photo)
function extractOgImage(html: string): string | null {
  // Pattern 1: property first, then content
  const m1 = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
  if (m1) return m1[1] || null;

  // Pattern 2: content first, then property
  const m2 = html.match(/<meta\s+content=["']([^"']*)["']\s+property=["']og:image["']/i);
  if (m2) return m2[1] || null;

  // Pattern 3: self-closing with no content (empty tag)
  const m3 = html.match(/<meta\s+property=["']og:image["']\s*\/?>/i);
  if (m3) return null;

  return null;
}

function isPlaceholder(url: string | null): boolean {
  if (!url || !url.trim()) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_SIGNALS.some((sig) => lower.includes(sig));
}

interface RequestBody {
  user_id: string;
  hudl_url: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user_id, hudl_url } = body;

  if (!user_id || !hudl_url) {
    return new Response(
      JSON.stringify({ error: "user_id and hudl_url are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate hudl_url is actually a Hudl URL to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(hudl_url);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid hudl_url" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!parsedUrl.hostname.endsWith("hudl.com")) {
    return new Response(
      JSON.stringify({ error: "hudl_url must be a hudl.com URL" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1: Fetch the Hudl profile page HTML
  let hudlHtml: string;
  try {
    const hudlRes = await fetch(hudl_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    if (!hudlRes.ok) {
      console.error(`fetch-hudl-avatar: Hudl fetch failed ${hudlRes.status}`);
      return new Response(
        JSON.stringify({ error: `Hudl page returned HTTP ${hudlRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    hudlHtml = await hudlRes.text();
  } catch (err) {
    console.error("fetch-hudl-avatar: Hudl fetch threw", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Hudl profile page" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 2: Extract og:image from HTML meta tags
  const ogImageUrl = extractOgImage(hudlHtml);

  if (isPlaceholder(ogImageUrl)) {
    console.log(`fetch-hudl-avatar: placeholder/no photo for user ${user_id}`);
    return new Response(
      JSON.stringify({ ok: true, status: "placeholder" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Download the actual image bytes
  let imageBytes: Uint8Array;
  let contentType = "image/jpeg";
  try {
    const imgRes = await fetch(ogImageUrl as string);
    if (!imgRes.ok) {
      console.error(`fetch-hudl-avatar: image fetch failed ${imgRes.status}`);
      return new Response(
        JSON.stringify({ error: `Image fetch returned HTTP ${imgRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    contentType = ct.split(";")[0].trim();
    const arrayBuf = await imgRes.arrayBuffer();
    imageBytes = new Uint8Array(arrayBuf);
  } catch (err) {
    console.error("fetch-hudl-avatar: image download threw", err);
    return new Response(
      JSON.stringify({ error: "Failed to download profile image" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Determine file extension from content type
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("gif")
    ? "gif"
    : contentType.includes("webp")
    ? "webp"
    : "jpg";

  const storagePath = `${user_id}/avatar.${ext}`;

  // Step 4: Upload to Supabase Storage (avatars bucket)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, imageBytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error("fetch-hudl-avatar: storage upload failed", uploadError);
    return new Response(
      JSON.stringify({ error: "Failed to upload image to storage" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 5: Write avatar_storage_path to profiles
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_storage_path: storagePath })
    .eq("user_id", user_id);

  if (updateError) {
    console.error("fetch-hudl-avatar: profiles update failed", updateError);
    return new Response(
      JSON.stringify({ error: "Image uploaded but failed to update profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`fetch-hudl-avatar: uploaded avatar for user ${user_id} at ${storagePath}`);
  return new Response(
    JSON.stringify({ ok: true, status: "uploaded", path: storagePath }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
