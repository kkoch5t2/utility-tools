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


function sanitizeName(value) {
  return textValue(value, MAX_NAME).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function sharedStub(env, type, id) {
  return env.SHARED_TOOLS.get(env.SHARED_TOOLS.idFromName(type + ":" + id));
}

function publicShared(data) {
  if (!data) return null;
  const base = {
    id: data.id,
    type: data.type,
    title: data.title,
    description: data.description ?? "",
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };

  if (data.type === "poll") {
    const counts = Object.fromEntries(data.options.map((option) => [String(option.id), 0]));
    for (const vote of data.votes) {
      const key = String(vote.optionId);
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return {
      ...base,
      options: data.options,
      counts,
      totalVotes: data.votes.length,
    };
  }

  if (data.type === "attendance") {
    const counts = { yes: 0, maybe: 0, no: 0 };
    for (const response of data.responses) {
      if (counts[response.status] !== undefined) counts[response.status] += 1;
    }
    return {
      ...base,
      eventDate: data.eventDate ?? "",
      place: data.place ?? "",
      responses: data.responses.map(({ editTokenHash: _hidden, ...response }) => response),
      counts,
      responseCount: data.responses.length,
    };
  }

  if (data.type === "split") {
    const participants = data.participants;
    const balances = Object.fromEntries(participants.map((name) => [name, 0]));
    let total = 0;
    for (const expense of data.expenses) {
      const amount = Number(expense.amount) || 0;
      total += amount;
      if (balances[expense.payer] === undefined) continue;
      balances[expense.payer] += amount;
      const members = expense.members.filter((name) => balances[name] !== undefined);
      if (!members.length) continue;
      const baseShare = Math.floor(amount / members.length);
      const remainder = amount % members.length;
      members.forEach((name, index) => {
        balances[name] -= baseShare + (index < remainder ? 1 : 0);
      });
    }

    const creditors = [];
    const debtors = [];
    for (const [name, balance] of Object.entries(balances)) {
      if (balance > 0) creditors.push({ name, amount: balance });
      if (balance < 0) debtors.push({ name, amount: -balance });
    }
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].amount, debtors[di].amount);
      if (amount > 0) settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount });
      creditors[ci].amount -= amount;
      debtors[di].amount -= amount;
      if (creditors[ci].amount <= 0) ci += 1;
      if (debtors[di].amount <= 0) di += 1;
    }

    return {
      ...base,
      participants,
      expenses: data.expenses.map(({ editTokenHash: _hidden, ...expense }) => expense),
      total,
      balances,
      settlements,
      expenseCount: data.expenses.length,
    };
  }

  return base;
}

export class SharedToolRoom {
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
    return await this.ctx.storage.get("data");
  }

  async write(data) {
    await this.ctx.storage.put("data", data);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/init" && request.method === "POST") {
      return this.withLock(async () => {
        if (await this.read()) return json({ error: "already_initialized" }, 409);
        const data = await request.json();
        await this.write(data);
        await this.ctx.storage.setAlarm(data.expiresAt);
        return json({ ok: true }, 201);
      });
    }

    const data = await this.read();
    if (!data || data.expiresAt <= Date.now()) return json({ error: "shared_item_not_found" }, 404);
    if (path === "/data" && request.method === "GET") return json(publicShared(data));

    if (data.type === "poll") {
      if (path === "/vote" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.votes.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null);
          const optionId = Number(body?.optionId);
          if (!current.options.some((option) => option.id === optionId)) return json({ error: "invalid_option" }, 400);
          const voteId = idFrom(9);
          const editToken = idFrom(24);
          current.votes.push({ id: voteId, optionId, editTokenHash: await hashToken(editToken), createdAt: Date.now() });
          await this.write(current);
          return json({ voteId, editToken }, 201);
        });
      }

      const voteMatch = path.match(/^\/vote\/([A-Za-z0-9_-]+)$/);
      if (voteMatch && request.method === "PUT") {
        return this.withLock(async () => {
          const current = await this.read();
          const vote = current.votes.find((item) => item.id === voteMatch[1]);
          if (!vote) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== vote.editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          const body = await request.json().catch(() => null);
          const optionId = Number(body?.optionId);
          if (!current.options.some((option) => option.id === optionId)) return json({ error: "invalid_option" }, 400);
          vote.optionId = optionId;
          vote.updatedAt = Date.now();
          await this.write(current);
          return json({ ok: true });
        });
      }
      if (voteMatch && request.method === "DELETE") {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.votes.findIndex((item) => item.id === voteMatch[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.votes[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          current.votes.splice(index, 1);
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "attendance") {
      if (path === "/response" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.responses.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null);
          const name = sanitizeName(body?.name);
          const status = body?.status;
          const comment = textValue(body?.comment, MAX_COMMENT);
          if (!name) return json({ error: "name_required" }, 400);
          if (!["yes", "maybe", "no"].includes(status)) return json({ error: "invalid_status" }, 400);
          if (current.responses.some((item) => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "name_already_used" }, 409);
          const responseId = idFrom(9);
          const editToken = idFrom(24);
          const now = Date.now();
          current.responses.push({ id: responseId, name, status, comment, editTokenHash: await hashToken(editToken), createdAt: now, updatedAt: now });
          await this.write(current);
          return json({ responseId, editToken }, 201);
        });
      }

      const responseMatch = path.match(/^\/response\/([A-Za-z0-9_-]+)$/);
      if (responseMatch && request.method === "PUT") {
        return this.withLock(async () => {
          const current = await this.read();
          const response = current.responses.find((item) => item.id === responseMatch[1]);
          if (!response) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== response.editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          const body = await request.json().catch(() => null);
          const name = sanitizeName(body?.name);
          const status = body?.status;
          if (!name || !["yes", "maybe", "no"].includes(status)) return json({ error: "invalid_response" }, 400);
          if (current.responses.some((item) => item.id !== response.id && item.name.toLowerCase() === name.toLowerCase())) return json({ error: "name_already_used" }, 409);
          response.name = name;
          response.status = status;
          response.comment = textValue(body?.comment, MAX_COMMENT);
          response.updatedAt = Date.now();
          await this.write(current);
          return json({ ok: true });
        });
      }
      if (responseMatch && request.method === "DELETE") {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.responses.findIndex((item) => item.id === responseMatch[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.responses[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          current.responses.splice(index, 1);
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "split") {
      if (path === "/expense" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.expenses.length >= 200) return json({ error: "expense_limit" }, 409);
          const body = await request.json().catch(() => null);
          const payer = sanitizeName(body?.payer);
          const amount = Math.round(Number(body?.amount));
          const memo = textValue(body?.memo, 120);
          const members = Array.isArray(body?.members) ? [...new Set(body.members.map(sanitizeName).filter((name) => current.participants.includes(name)))] : [];
          if (!current.participants.includes(payer)) return json({ error: "invalid_payer" }, 400);
          if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return json({ error: "invalid_amount" }, 400);
          if (!members.length) return json({ error: "members_required" }, 400);
          const expenseId = idFrom(9);
          const editToken = idFrom(24);
          const now = Date.now();
          current.expenses.push({ id: expenseId, payer, amount, memo, members, editTokenHash: await hashToken(editToken), createdAt: now, updatedAt: now });
          await this.write(current);
          return json({ expenseId, editToken }, 201);
        });
      }

      const expenseMatch = path.match(/^\/expense\/([A-Za-z0-9_-]+)$/);
      if (expenseMatch && request.method === "PUT") {
        return this.withLock(async () => {
          const current = await this.read();
          const expense = current.expenses.find((item) => item.id === expenseMatch[1]);
          if (!expense) return json({ error: "expense_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== expense.editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          const body = await request.json().catch(() => null);
          const payer = sanitizeName(body?.payer);
          const amount = Math.round(Number(body?.amount));
          const memo = textValue(body?.memo, 120);
          const members = Array.isArray(body?.members) ? [...new Set(body.members.map(sanitizeName).filter((name) => current.participants.includes(name)))] : [];
          if (!current.participants.includes(payer)) return json({ error: "invalid_payer" }, 400);
          if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return json({ error: "invalid_amount" }, 400);
          if (!members.length) return json({ error: "members_required" }, 400);
          expense.payer = payer;
          expense.amount = amount;
          expense.memo = memo;
          expense.members = members;
          expense.updatedAt = Date.now();
          await this.write(current);
          return json({ ok: true });
        });
      }
      if (expenseMatch && request.method === "DELETE") {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.expenses.findIndex((item) => item.id === expenseMatch[1]);
          if (index < 0) return json({ error: "expense_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.expenses[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          current.expenses.splice(index, 1);
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (path === "/delete" && request.method === "DELETE") {
      const token = bearer(request);
      if (!token || (await hashToken(token)) !== data.adminTokenHash) return json({ error: "invalid_admin_token" }, 403);
      await this.ctx.storage.deleteAll();
      return json({ ok: true });
    }

    return json({ error: "not_found" }, 404);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

async function createSharedItem(request, env, type) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "invalid_json" }, 400);

  const title = textValue(body.title, MAX_TITLE);
  const description = textValue(body.description, MAX_DESCRIPTION);
  if (title.length < 2) return json({ error: "title_required" }, 400);

  const id = idFrom(9);
  const adminToken = idFrom(24);
  const now = Date.now();
  const expiresAt = now + 90 * DAY;
  let data;

  if (type === "poll") {
    const options = Array.isArray(body.options)
      ? [...new Set(body.options.map(cleanOption).filter(Boolean))].slice(0, MAX_OPTIONS)
      : [];
    if (options.length < 2) return json({ error: "at_least_two_options" }, 400);
    data = {
      id, type, title, description,
      adminTokenHash: await hashToken(adminToken),
      createdAt: now, expiresAt,
      options: options.map((label, index) => ({ id: index + 1, label })),
      votes: [],
    };
  } else if (type === "attendance") {
    const eventDate = textValue(body.eventDate, 100);
    const place = textValue(body.place, 120);
    data = {
      id, type, title, description, eventDate, place,
      adminTokenHash: await hashToken(adminToken),
      createdAt: now, expiresAt,
      responses: [],
    };
  } else if (type === "split") {
    const participants = Array.isArray(body.participants)
      ? [...new Set(body.participants.map(sanitizeName).filter(Boolean))].slice(0, 20)
      : [];
    if (participants.length < 2) return json({ error: "at_least_two_participants" }, 400);
    data = {
      id, type, title, description, participants,
      adminTokenHash: await hashToken(adminToken),
      createdAt: now, expiresAt,
      expenses: [],
    };
  } else {
    return json({ error: "invalid_type" }, 400);
  }

  const response = await sharedStub(env, type, id).fetch("https://shared.internal/init", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) return json({ error: "internal_error" }, 500);
  return json({ id, adminToken, expiresAt }, 201);
}

async function routeShared(request, env, pathname) {
  if (pathname === "/api/polls" && request.method === "POST") return createSharedItem(request, env, "poll");
  if (pathname === "/api/attendance" && request.method === "POST") return createSharedItem(request, env, "attendance");
  if (pathname === "/api/split-bills" && request.method === "POST") return createSharedItem(request, env, "split");

  const item = pathname.match(/^\/api\/(polls|attendance|split-bills)\/([A-Za-z0-9_-]+)$/);
  if (item) {
    const type = item[1] === "polls" ? "poll" : item[1] === "attendance" ? "attendance" : "split";
    const stub = sharedStub(env, type, item[2]);
    if (request.method === "GET") return stub.fetch("https://shared.internal/data");
    if (request.method === "DELETE") {
      return stub.fetch("https://shared.internal/delete", {
        method: "DELETE",
        headers: { authorization: request.headers.get("authorization") ?? "" },
      });
    }
  }

  const pollCollection = pathname.match(/^\/api\/polls\/([A-Za-z0-9_-]+)\/votes$/);
  if (pollCollection && request.method === "POST") {
    return sharedStub(env, "poll", pollCollection[1]).fetch("https://shared.internal/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
  }
  const pollItem = pathname.match(/^\/api\/polls\/([A-Za-z0-9_-]+)\/votes\/([A-Za-z0-9_-]+)$/);
  if (pollItem && ["PUT", "DELETE"].includes(request.method)) {
    const init = {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
    };
    if (request.method === "PUT") init.body = await request.text();
    return sharedStub(env, "poll", pollItem[1]).fetch("https://shared.internal/vote/" + pollItem[2], init);
  }

  const attendanceCollection = pathname.match(/^\/api\/attendance\/([A-Za-z0-9_-]+)\/responses$/);
  if (attendanceCollection && request.method === "POST") {
    return sharedStub(env, "attendance", attendanceCollection[1]).fetch("https://shared.internal/response", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
  }
  const attendanceItem = pathname.match(/^\/api\/attendance\/([A-Za-z0-9_-]+)\/responses\/([A-Za-z0-9_-]+)$/);
  if (attendanceItem && ["PUT", "DELETE"].includes(request.method)) {
    const init = {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
    };
    if (request.method === "PUT") init.body = await request.text();
    return sharedStub(env, "attendance", attendanceItem[1]).fetch("https://shared.internal/response/" + attendanceItem[2], init);
  }

  const splitCollection = pathname.match(/^\/api\/split-bills\/([A-Za-z0-9_-]+)\/expenses$/);
  if (splitCollection && request.method === "POST") {
    return sharedStub(env, "split", splitCollection[1]).fetch("https://shared.internal/expense", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
  }
  const splitItem = pathname.match(/^\/api\/split-bills\/([A-Za-z0-9_-]+)\/expenses\/([A-Za-z0-9_-]+)$/);
  if (splitItem && ["PUT", "DELETE"].includes(request.method)) {
    const init = {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
    };
    if (request.method === "PUT") init.body = await request.text();
    return sharedStub(env, "split", splitItem[1]).fetch("https://shared.internal/expense/" + splitItem[2], init);
  }

  return null;
}

async function api(request, env, pathname) {
  if (!env.SCHEDULES || !env.SHARED_TOOLS) return json({ error: "storage_not_configured" }, 503);

  if (pathname === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "shared-tools" });
  }

  if (!mutationAllowed(request) && request.method !== "GET") {
    return json({ error: "invalid_origin" }, 403);
  }

  const shared = await routeShared(request, env, pathname);
  if (shared) return shared;

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
