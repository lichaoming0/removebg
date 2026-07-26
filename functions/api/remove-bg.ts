/**
 * Cloudflare Pages Function — proxies image to remove.bg API.
 * Handles POST /api/remove-bg with multipart/form-data.
 * Image is processed in-memory — nothing written to disk.
 */
export const onRequestPost: PagesFunction<{ REMOVE_BG_API_KEY: string }> = async ({ request, env }) => {
  const API_KEY = env.REMOVE_BG_API_KEY;

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Server not configured: missing API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the incoming multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const imageFile = formData.get('image');

  if (!imageFile || !(imageFile instanceof File)) {
    return new Response(JSON.stringify({ error: 'No image file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate file size (10 MB max)
  if (imageFile.size > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10 MB.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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

    return new Response(JSON.stringify({ error: message }), {
      status: bgResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream the result image directly back to the client
  const resultBuffer = await bgResponse.arrayBuffer();

  return new Response(resultBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': resultBuffer.byteLength.toString(),
      'Cache-Control': 'no-store',
    },
  });
};
