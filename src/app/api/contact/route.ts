const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Could not read the message." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Check the fields and try again." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const name = text(record.name, 200);
  const email = text(record.email, 200);
  const message = text(record.message, 4000);
  const company = text(record.company, 200);
  const link = text(record.link, 400);
  const timeline = text(record.timeline, 80);
  const budget = text(record.budget, 80);
  const services = Array.isArray(record.services)
    ? record.services.filter((item) => typeof item === "string").slice(0, 8)
    : [];

  if (!name || !emailPattern.test(email) || !message) {
    return Response.json({ error: "Check the fields and try again." }, { status: 400 });
  }

  return Response.json({
    ok: true,
    received: { company, link, timeline, budget, services: services.length },
  });
}
