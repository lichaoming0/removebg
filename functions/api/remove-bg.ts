/**
 * Cloudflare Pages Function — proxies image to remove.bg API with credit tracking.
 * POST /api/remove-bg — multipart/form-data with "image" field and "google_id" field.
 * Checks user credits in D1, deducts 1 on successful removal.
 */
interface Env {
  REMOVE_BG_API_KEY: string;
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const API_KEY = env.REMOVE_BG_API_KEY;
  if (!API_KEY) {
    return json({ error: 'Server not configured: missing API key' }, 500);
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const imageFile = formData.get('image');
  const googleId = (formData.get('google_id') as string) || '';

  if (!imageFile || !(imageFile instanceof File)) {
    return json({ error: 'No image file provided' }, 400);
  }

  if (imageFile.size > 10 * 1024 * 1024) {
    return json({ error: 'File too large. Maximum size is 10 MB.' }, 400);
  }

  // Check credits in D1 if google_id provided
  if (googleId && env.DB) {
    try {
      const user = await env.DB.prepare('SELECT credits FROM users WHERE google_id = ?')
        .bind(googleId).first<{ credits: number }>();
      if (!user || (user.credits || 0) <= 0) {
        return json({ error: 'Out of credits. Please upgrade your plan to continue.', code: 'NO_CREDITS' }, 402);
      }
    } catch (dbErr: any) {
      console.error('D1 credit check error:', dbErr.message);
    }
  }

  // Forward to remove.bg API
  const bgFormData = new FormData();
  bgFormData.append('image_file', imageFile, imageFile.name);
  bgFormData.append('size', 'auto');

  const bgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': API_KEY },
    body: bgFormData,
  });

  if (!bgResponse.ok) {
    let message = `remove.bg API error: ${bgResponse.status}`;
    try {
      const errors = await bgResponse.json() as { errors?: Array<{ title?: string }> };
      message = errors?.errors?.[0]?.title || message;
    } catch { /* use default message */ }
    return json({ error: message }, bgResponse.status);
  }

  // Deduct 1 credit on success
  let newCredits = -1;
  if (googleId && env.DB) {
    try {
      await env.DB.prepare('UPDATE users SET credits = MAX(0, credits - 1) WHERE google_id = ? AND credits > 0')
        .bind(googleId).run();
      const row = await env.DB.prepare('SELECT credits FROM users WHERE google_id = ?')
        .bind(googleId).first<{ credits: number }>();
      if (row) newCredits = row.credits;
    } catch (dbErr: any) {
      console.error('D1 credit deduct error:', dbErr.message);
    }
  }

  // Stream the result image back to the client
  const resultBuffer = await bgResponse.arrayBuffer();

  return new Response(resultBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': resultBuffer.byteLength.toString(),
      'Cache-Control': 'no-store',
      'X-Credits': String(newCredits),
    },
  });
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
