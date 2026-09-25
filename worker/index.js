const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const DAY = 24 * 60 * 60 * 1000;
const MAX_OPTIONS = 20;
const MAX_RESPONSES = 100;
const MAX_TITLE = 100;
const MAX_DESCRIPTION = 800;
const MAX_NAME = 50;
const MAX_COMMENT = 500;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function textValue(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanOption(value) {
  return textValue(value, 100)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function idFrom(bytes = 9) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function mutationAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function publicSchedule(data) {
  if (!data) return null;
  const summary = data.options.map((option) => {
    const counts = { yes: 0, maybe: 0, no: 0 };
    for (const response of data.responses) {
      const status = response.answers[String(option.id)];
      if (status && counts[status] !== undefined) counts[status] += 1;
    }
    return { optionId: option.id, ...counts };
  });
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    organizerName: data.organizerName,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
    options: data.options,
    responses: data.responses.map(({ editTokenHash: _hidden, ...response }) => response),
    summary,
    responseCount: data.responses.length,
  };
}

export class ScheduleRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.lock = Promise.resolve();
  }

  async withLock(fn) {
    let release;
    const previous = this.lock;
    this.lock = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async read() {
    return await this.ctx.storage.get("schedule");
  }

  async write(data) {
    await this.ctx.storage.put("schedule", data);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/init" && request.method === "POST") {
      return this.withLock(async () => {
        const existing = await this.read();
        if (existing) return json({ error: "already_initialized" }, 409);
        const data = await request.json();
        await this.write(data);
        await this.ctx.storage.setAlarm(data.expiresAt);
        return json({ ok: true }, 201);
      });
    }

    if (path === "/data" && request.method === "GET") {
      const data = await this.read();
      if (!data || data.expiresAt <= Date.now()) return json({ error: "schedule_not_found" }, 404);
      return json(publicSchedule(data));
    }

    if (path === "/responses" && request.method === "POST") {
      return this.withLock(async () => {
        const data = await this.read();
        if (!data || data.expiresAt <= Date.now()) return json({ error: "schedule_not_found" }, 404);
        if (data.responses.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);

        const body = await request.json().catch(() => null);
        if (!body) return json({ error: "invalid_json" }, 400);
        const name = textValue(body.name, MAX_NAME);
        const comment = textValue(body.comment, MAX_COMMENT);
        if (!name) return json({ error: "name_required" }, 400);
        if (data.responses.some((response) => response.name.toLowerCase() === name.toLowerCase())) {
          return json({ error: "name_already_used" }, 409);
        }

        const validOptionIds = new Set(data.options.map((option) => String(option.id)));
        const answerEntries = Object.entries(body.answers ?? {}).filter(
          ([optionId, status]) => validOptionIds.has(String(optionId)) && ["yes", "maybe", "no"].includes(status)
        );
        if (answerEntries.length !== data.options.length) return json({ error: "all_options_required" }, 400);

        const responseId = idFrom(9);
        const editToken = idFrom(24);
        const now = Date.now();
        data.responses.push({
          id: responseId,
          name,
          comment,
          editTokenHash: await hashToken(editToken),
          createdAt: now,
          updatedAt: now,
          answers: Object.fromEntries(answerEntries),
        });
        await this.write(data);
        return json({ responseId, editToken }, 201);
      });
    }

    const responseMatch = path.match(/^\/responses\/([A-Za-z0-9_-]+)$/);
    if (responseMatch && request.method === "PUT") {
      return this.withLock(async () => {
        const data = await this.read();
        if (!data || data.expiresAt <= Date.now()) return json({ error: "schedule_not_found" }, 404);
        const response = data.responses.find((item) => item.id === responseMatch[1]);
        if (!response) return json({ error: "response_not_found" }, 404);

        const token = bearer(request);
        if (!token || (await hashToken(token)) !== response.editTokenHash) {
          return json({ error: "invalid_edit_token" }, 403);
        }

        const body = await request.json().catch(() => null);
        if (!body) return json({ error: "invalid_json" }, 400);
        const name = textValue(body.name, MAX_NAME);
        const comment = textValue(body.comment, MAX_COMMENT);
        if (!name) return json({ error: "name_required" }, 400);
        if (data.responses.some((item) => item.id !== response.id && item.name.toLowerCase() === name.toLowerCase())) {
          return json({ error: "name_already_used" }, 409);
        }

        const validOptionIds = new Set(data.options.map((option) => String(option.id)));
        const answerEntries = Object.entries(body.answers ?? {}).filter(
          ([optionId, status]) => validOptionIds.has(String(optionId)) && ["yes", "maybe", "no"].includes(status)
        );
        if (answerEntries.length !== data.options.length) return json({ error: "all_options_required" }, 400);

        response.name = name;
        response.comment = comment;
        response.answers = Object.fromEntries(answerEntries);
        response.updatedAt = Date.now();
        await this.write(data);
        return json({ ok: true });
      });
    }

    if (responseMatch && request.method === "DELETE") {
      return this.withLock(async () => {
        const data = await this.read();
        if (!data) return json({ error: "schedule_not_found" }, 404);
        const index = data.responses.findIndex((item) => item.id === responseMatch[1]);
        if (index < 0) return json({ error: "response_not_found" }, 404);

        const token = bearer(request);
        if (!token || (await hashToken(token)) !== data.responses[index].editTokenHash) {
          return json({ error: "invalid_edit_token" }, 403);
        }

        data.responses.splice(index, 1);
        await this.write(data);
        return json({ ok: true });
      });
    }

    if (path === "/delete" && request.method === "DELETE") {
      return this.withLock(async () => {
        const data = await this.read();
        if (!data) return json({ error: "schedule_not_found" }, 404);
        const token = bearer(request);
        if (!token || (await hashToken(token)) !== data.adminTokenHash) {
          return json({ error: "invalid_admin_token" }, 403);
        }
        await this.ctx.storage.deleteAll();
        return json({ ok: true });
      });
    }

    return json({ error: "not_found" }, 404);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

function scheduleStub(env, id) {
  return env.SCHEDULES.get(env.SCHEDULES.idFromName(id));
}

async function createSchedule(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid_json" }, 400);

  const title = textValue(body.title, MAX_TITLE);
  const description = textValue(body.description, MAX_DESCRIPTION);
  const organizerName = textValue(body.organizerName, MAX_NAME);
  const options = Array.isArray(body.options)
    ? [...new Set(body.options.map(cleanOption).filter(Boolean))].slice(0, MAX_OPTIONS)
    : [];

  if (title.length < 2) return json({ error: "title_required" }, 400);
  if (options.length < 2) return json({ error: "at_least_two_options" }, 400);

  const id = idFrom(9);
  const adminToken = idFrom(24);
  const now = Date.now();
  const expiresAt = now + 90 * DAY;
  const data = {
    id,
    title,
    description,
    organizerName,
    adminTokenHash: await hashToken(adminToken),
    createdAt: now,
    expiresAt,
    options: options.map((label, index) => ({ id: index + 1, label, sortOrder: index })),
    responses: [],
  };

  const response = await scheduleStub(env, id).fetch("https://schedule.internal/init", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return json({ error: "internal_error" }, 500);
  return json({ id, adminToken, expiresAt }, 201);
}

async function api(request, env, pathname) {
  if (!env.SCHEDULES) return json({ error: "storage_not_configured" }, 503);

  if (pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "schedule" });
  }

  if (!mutationAllowed(request) && request.method !== "GET") {
    return json({ error: "invalid_origin" }, 403);
  }

  if (pathname === "/api/schedules" && request.method === "POST") {
    return createSchedule(request, env);
  }

  const scheduleMatch = pathname.match(/^\/api\/schedules\/([A-Za-z0-9_-]+)$/);
  if (scheduleMatch) {
    const stub = scheduleStub(env, scheduleMatch[1]);

    if (request.method === "GET") {
      return stub.fetch("https://schedule.internal/data");
    }

    if (request.method === "DELETE") {
      return stub.fetch("https://schedule.internal/delete", {
        method: "DELETE",
        headers: { authorization: request.headers.get("authorization") ?? "" },
      });
    }
  }

  const responsesMatch = pathname.match(/^\/api\/schedules\/([A-Za-z0-9_-]+)\/responses$/);
  if (responsesMatch && request.method === "POST") {
    return scheduleStub(env, responsesMatch[1]).fetch("https://schedule.internal/responses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
  }

  const responseMatch = pathname.match(/^\/api\/schedules\/([A-Za-z0-9_-]+)\/responses\/([A-Za-z0-9_-]+)$/);
  if (responseMatch && ["PUT", "DELETE"].includes(request.method)) {
    const init = {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
    };
    if (request.method === "PUT") init.body = await request.text();

    return scheduleStub(env, responseMatch[1]).fetch(
      "https://schedule.internal/responses/" + responseMatch[2],
      init,
    );
  }

  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
        return json({ error: "method_not_allowed" }, 405);
      }

      try {
        return await api(request, env, url.pathname);
      } catch (error) {
        console.error("schedule-api", error);
        return json({ error: "internal_error" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
