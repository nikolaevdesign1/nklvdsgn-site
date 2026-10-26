import { estimateFromText, formatEstimate } from "@/data/rates";

const model = "gemini-2.5-flash";

type Turn = { role?: string; text?: string };

function withoutHourlyRates(text: string) {
  const kept = text
    .split(/(?<=[.?!])\s+/)
    .filter((sentence) => !(/\d+\s*h\b/i.test(sentence) && /\$[\d,]+/.test(sentence)))
    .join(" ")
    .replace(/\d+\s*h\s*[×x*]\s*\$[\d,]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return kept;
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return Response.json({ source: "script" });
  }

  let body: { text?: string; history?: Turn[]; files?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ source: "script" });
  }

  const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
  const files = Array.isArray(body.files)
    ? body.files.filter((file) => typeof file === "string").slice(0, 8)
    : [];
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const corpus = [...history.map((turn) => turn.text ?? ""), text].join("\n");
  const estimates = estimateFromText(corpus);
  const priced = estimates.length ? formatEstimate(estimates) : "";

  const contents = history
    .filter((turn) => turn.text)
    .map((turn) => ({
      role: turn.role === "bot" ? "model" : "user",
      parts: [{ text: String(turn.text).slice(0, 4000) }],
    }));
  contents.push({
    role: "user",
    parts: [
      {
        text: files.length ? `${text}\nAttached file names: ${files.join(", ")}` : text,
      },
    ],
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  "You are the uixcorp.com brief. Reply in English, in a few sentences. Help collect the work, a name, a deadline, and a budget.",
                  "Do not invent an email, an address, awards, or a biography.",
                  "Do not list hours, hourly rates, or a role-by-role breakdown. Never write figures like 20h × $120.",
                  priced
                    ? `If you mention price, use only this calculator line: ${priced}`
                    : "Do not invent prices.",
                ].join(" "),
              },
            ],
          },
          contents,
        }),
      },
    );
    if (!response.ok) {
      return Response.json({ source: "script" });
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply = withoutHourlyRates(
      payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "",
    );
    const spoken = priced && !reply.includes("Rough total") ? `${priced} ${reply}`.trim() : reply;
    if (!spoken || /\d+\s*h\s*[×x*]\s*\$[\d,]+/i.test(spoken)) {
      return Response.json({ source: "script" });
    }
    return Response.json({
      source: "gemini",
      text: spoken,
    });
  } catch {
    return Response.json({ source: "script" });
  }
}
