// fetch-hudl-avatar Edge Function
//
// Fetches a student's Hudl profile page, extracts their photo from the
// embedded window.__hudlEmbed data structure, downloads the image bytes,
// uploads to Supabase Storage (avatars bucket), and writes the storage path
// back to public.profiles.avatar_storage_path.
//
// Placeholder detection:
//   Hudl embeds profile data as JSON in window.__hudlEmbed. When a user has
//   no profile photo, profileLogoUri is null and the page renders:
//     https://static.hudl.com/profiles/images/avatars/blank-avatar.svg
//   We treat profileLogoUri === null OR any URL containing "blank-avatar" as
//   a placeholder — no image is stored, and avatar_storage_path is left NULL.
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
//   200 { ok: true, status: "uploaded" | "placeholder" | "no_photo" }
//   400 { error: string }
//   500 { error: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Placeholder signals in Hudl's embedded JSON
const BLANK_AVATAR_SIGNALS = ["blank-avatar", "default-avatar", "placeholder"];

// Extract profileLogoUri from window.__hudlEmbed JSON embedded in the page HTML.
// Hudl injects a script tag containing window.__hudlEmbed = {...} or
// window.__hudlEmbed=JSON. We parse the JSON blob out of the raw HTML.
function extractProfileLogoUri(html: string): string | null {
  // Match: window.__hudlEmbed = {...}  or  window.__hudlEmbed={...}
  // The JSON object may span many lines — use a greedy match to the last }
  const match = html.match(/window\.__hudlEmbed\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!match) return undefined as unknown as null; // signal: could not parse

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return undefined as unknown as null;
  }

  // profileLogoUri may be nested under a profile key or at the top level.
  // Try both common shapes Hudl has used.
  const direct = (data as Record<string, unknown>).profileLogoUri;
  if (direct !== undefined) return (direct as string | null) ?? null;

  // Deeper nesting: data.profile.profileLogoUri
  const profile = (data as Record<string, Record<string, unknown>>).profile;
  if (profile && profile.profileLogoUri !== undefined) {
    return (profile.profileLogoUri as string | null) ?? null;
  }

  return undefined as unknown as null;
}

function isPlaceholder(uri: string | null | undefined): boolean {
  if (!uri) return true;
  const lower = uri.toLowerCase();
  return BLANK_AVATAR_SIGNALS.some((sig) => lower.includes(sig));
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
        // Mimic a real browser to avoid bot-block responses
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

  // Step 2: Extract profileLogoUri from embedded JSON
  const profileLogoUri = extractProfileLogoUri(hudlHtml);

  // extractProfileLogoUri returns undefined (cast as null) when parsing failed,
  // and null when parsing succeeded but the field is null.
  // In both cases, treat as no usable photo.

  if (isPlaceholder(profileLogoUri)) {
    // No photo on Hudl account — do not write anything to Storage or profiles.
    // avatar_storage_path stays NULL. Return success so the caller doesn't retry.
    console.log(`fetch-hudl-avatar: placeholder detected for user ${user_id}`);
    return new Response(
      JSON.stringify({ ok: true, status: "placeholder" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Download the actual image bytes
  let imageBytes: Uint8Array;
  let contentType = "image/jpeg";
  try {
    const imgRes = await fetch(profileLogoUri as string);
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
  // upsert: true — overwrite any existing avatar for this user
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
    // Storage upload succeeded — log the inconsistency but don't fail hard.
    // The backfill script can reconcile this.
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
