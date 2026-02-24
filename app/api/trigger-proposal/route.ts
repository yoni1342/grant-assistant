import fetch from "node-fetch";
import https from "https";

export async function POST(req: Request) {
  const body = await req.json();

  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await fetch(
    "https://n8n.thebrownmine.com/webhook-test/generate-proposal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      agent, // works with node-fetch
    },
  );

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
}
