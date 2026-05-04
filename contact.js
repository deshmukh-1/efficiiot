/** GET /api/contact — quick check that Pages Functions are live (browser or curl). */
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ ok: true, route: "/api/contact", hint: "POST JSON here for the enquiry form." }),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}

export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Invalid content type. Use application/json." }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const body = await context.request.json();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const website = String(body.website || "").trim();
    const startedAt = Number(body.startedAt || 0);

    // Basic anti-spam checks suitable for free-tier deployments.
    if (website) {
      return new Response(JSON.stringify({ error: "Spam rejected." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500) {
      return new Response(JSON.stringify({ error: "Submitted too quickly." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (!username || !email || !message) {
      return new Response(
        JSON.stringify({ error: "username, email, and message are required." }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }
    if (username.length > 120 || email.length > 180 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Input too long." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const webhookURL = context.env.DISCORD_WEBHOOK_URL;
    if (!webhookURL) {
      return new Response(
        JSON.stringify({ error: "Server is not configured yet." }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Optional: Cloudflare D1 binding named "DB" (see wrangler.toml + d1/schema.sql).
    if (context.env.DB) {
      try {
        await context.env.DB.prepare(
          "INSERT INTO enquiries (username, email, message, created_at) VALUES (?, ?, ?, unixepoch())"
        )
          .bind(username, email, message)
          .run();
      } catch (err) {
        return new Response(
          JSON.stringify({
            error:
              "Database save failed. Apply d1/schema.sql to your D1 database and check the DB binding name is DB.",
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          }
        );
      }
    }

    const discordPayload = {
      content:
        `📩 **New Enquiry Received**\n\n` +
        `**Name:** ${username}\n` +
        `**Email:** ${email}\n` +
        `**Message:**\n${message}`,
    };

    const webhookRes = await fetch(webhookURL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    if (!webhookRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to deliver message." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unexpected server error." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
