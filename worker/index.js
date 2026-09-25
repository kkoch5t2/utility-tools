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

  if (data.type === "survey") {
    const results = data.questions.map((question) => {
      if (question.type === "rating") {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0, total = 0;
        for (const response of data.responses) {
          const value = Number(response.answers[String(question.id)]);
          if (value >= 1 && value <= 5) { counts[value] += 1; sum += value; total += 1; }
        }
        return { questionId: question.id, counts, average: total ? Math.round((sum / total) * 10) / 10 : 0 };
      }
      const counts = Object.fromEntries((question.options ?? []).map((option) => [String(option.id), 0]));
      for (const response of data.responses) {
        const raw = response.answers[String(question.id)];
        const values = Array.isArray(raw) ? raw : [raw];
        for (const value of values) if (counts[String(value)] !== undefined) counts[String(value)] += 1;
      }
      return { questionId: question.id, counts };
    });
    return { ...base, questions: data.questions, results, responseCount: data.responses.length };
  }

  if (data.type === "lottery") {
    const publicParticipants = data.participants.map(({ editTokenHash: _hidden, ...participant }) => participant);
    const byId = new Map(publicParticipants.map((participant) => [participant.id, participant]));
    return {
      ...base,
      participants: publicParticipants,
      participantCount: publicParticipants.length,
      drawn: Array.isArray(data.order),
      order: Array.isArray(data.order) ? data.order.map((id) => byId.get(id)).filter(Boolean) : [],
    };
  }

  if (data.type === "availability") {
    const counts = Object.fromEntries(data.slots.map((slot) => [String(slot.id), 0]));
    for (const response of data.responses) {
      for (const slotId of response.slotIds) if (counts[String(slotId)] !== undefined) counts[String(slotId)] += 1;
    }
    return {
      ...base,
      slots: data.slots,
      responses: data.responses.map(({ editTokenHash: _hidden, ...response }) => response),
      counts,
      responseCount: data.responses.length,
    };
  }

  if (data.type === "packing") {
    return {
      ...base,
      items: data.items.map((item) => ({
        id: item.id,
        label: item.label,
        assignment: item.assignment ? { id: item.assignment.id, name: item.assignment.name } : null,
      })),
      assignedCount: data.items.filter((item) => item.assignment).length,
    };
  }

  if (data.type === "checklist") {
    return {
      ...base,
      tasks: data.tasks.map(({ editTokenHash: _hidden, ...task }) => task),
      doneCount: data.tasks.filter((task) => task.done).length,
    };
  }

  if (data.type === "ranking") {
    const scores = Object.fromEntries(data.options.map((option) => [String(option.id), 0]));
    const first = Object.fromEntries(data.options.map((option) => [String(option.id), 0]));
    const n = data.options.length;
    for (const vote of data.votes) {
      vote.ranking.forEach((optionId, index) => {
        if (scores[String(optionId)] !== undefined) scores[String(optionId)] += Math.max(0, n - index);
        if (index === 0 && first[String(optionId)] !== undefined) first[String(optionId)] += 1;
      });
    }
    const results = data.options.map((option) => ({
      optionId: option.id,
      label: option.label,
      score: scores[String(option.id)] ?? 0,
      firstPlaceVotes: first[String(option.id)] ?? 0,
    })).sort((a, b) => b.score - a.score || b.firstPlaceVotes - a.firstPlaceVotes || a.label.localeCompare(b.label, "ja"));
    return { ...base, options: data.options, results, totalVotes: data.votes.length };
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

    if (data.type === "survey") {
      const match = path.match(/^\/survey-response\/([A-Za-z0-9_-]+)$/);
      const validateAnswers = (current, answers) => {
        if (!answers || typeof answers !== "object") return null;
        const clean = {};
        for (const question of current.questions) {
          const raw = answers[String(question.id)];
          if (question.type === "rating") {
            const value = Number(raw);
            if (!Number.isInteger(value) || value < 1 || value > 5) return null;
            clean[String(question.id)] = value;
          } else {
            const valid = new Set((question.options ?? []).map((option) => option.id));
            if (question.type === "multiple") {
              const values = Array.isArray(raw) ? [...new Set(raw.map(Number).filter((value) => valid.has(value)))] : [];
              if (!values.length) return null;
              clean[String(question.id)] = values;
            } else {
              const value = Number(raw);
              if (!valid.has(value)) return null;
              clean[String(question.id)] = value;
            }
          }
        }
        return clean;
      };
      if (path === "/survey-response" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.responses.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null);
          const answers = validateAnswers(current, body?.answers);
          if (!answers) return json({ error: "invalid_answers" }, 400);
          const responseId = idFrom(9), editToken = idFrom(24), now = Date.now();
          current.responses.push({ id: responseId, answers, editTokenHash: await hashToken(editToken), createdAt: now, updatedAt: now });
          await this.write(current);
          return json({ responseId, editToken }, 201);
        });
      }
      if (match && ["PUT", "DELETE"].includes(request.method)) {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.responses.findIndex((item) => item.id === match[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.responses[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          if (request.method === "DELETE") {
            current.responses.splice(index, 1);
          } else {
            const body = await request.json().catch(() => null);
            const answers = validateAnswers(current, body?.answers);
            if (!answers) return json({ error: "invalid_answers" }, 400);
            current.responses[index].answers = answers;
            current.responses[index].updatedAt = Date.now();
          }
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "lottery") {
      const joinMatch = path.match(/^\/join\/([A-Za-z0-9_-]+)$/);
      if (path === "/join" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.order) return json({ error: "already_drawn" }, 409);
          if (current.participants.length >= 100) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null);
          const name = sanitizeName(body?.name);
          if (!name) return json({ error: "name_required" }, 400);
          if (current.participants.some((item) => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "name_already_used" }, 409);
          const participantId = idFrom(9), editToken = idFrom(24);
          current.participants.push({ id: participantId, name, editTokenHash: await hashToken(editToken), createdAt: Date.now() });
          await this.write(current);
          return json({ participantId, editToken }, 201);
        });
      }
      if (joinMatch && request.method === "DELETE") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.order) return json({ error: "already_drawn" }, 409);
          const index = current.participants.findIndex((item) => item.id === joinMatch[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.participants[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          current.participants.splice(index, 1);
          await this.write(current);
          return json({ ok: true });
        });
      }
      if (path === "/draw" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.adminTokenHash) return json({ error: "invalid_admin_token" }, 403);
          if (current.participants.length < 2) return json({ error: "at_least_two_participants" }, 400);
          const ids = current.participants.map((item) => item.id);
          for (let i = ids.length - 1; i > 0; i--) {
            const bytes = crypto.getRandomValues(new Uint32Array(1));
            const j = bytes[0] % (i + 1);
            [ids[i], ids[j]] = [ids[j], ids[i]];
          }
          current.order = ids;
          current.drawnAt = Date.now();
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "availability") {
      const match = path.match(/^\/availability-response\/([A-Za-z0-9_-]+)$/);
      const cleanSlots = (current, value) => {
        const valid = new Set(current.slots.map((slot) => slot.id));
        return Array.isArray(value) ? [...new Set(value.map(Number).filter((id) => valid.has(id)))] : [];
      };
      if (path === "/availability-response" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.responses.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null);
          const name = sanitizeName(body?.name), slotIds = cleanSlots(current, body?.slotIds);
          if (!name) return json({ error: "name_required" }, 400);
          if (!slotIds.length) return json({ error: "slots_required" }, 400);
          if (current.responses.some((item) => item.name.toLowerCase() === name.toLowerCase())) return json({ error: "name_already_used" }, 409);
          const responseId = idFrom(9), editToken = idFrom(24), now = Date.now();
          current.responses.push({ id: responseId, name, slotIds, editTokenHash: await hashToken(editToken), createdAt: now, updatedAt: now });
          await this.write(current);
          return json({ responseId, editToken }, 201);
        });
      }
      if (match && ["PUT", "DELETE"].includes(request.method)) {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.responses.findIndex((item) => item.id === match[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.responses[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          if (request.method === "DELETE") current.responses.splice(index, 1);
          else {
            const body = await request.json().catch(() => null);
            const name = sanitizeName(body?.name), slotIds = cleanSlots(current, body?.slotIds);
            if (!name || !slotIds.length) return json({ error: "invalid_response" }, 400);
            if (current.responses.some((item) => item.id !== match[1] && item.name.toLowerCase() === name.toLowerCase())) return json({ error: "name_already_used" }, 409);
            current.responses[index].name = name; current.responses[index].slotIds = slotIds; current.responses[index].updatedAt = Date.now();
          }
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "packing") {
      const claimMatch = path.match(/^\/claim\/([A-Za-z0-9_-]+)$/);
      if (path === "/claim" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          const body = await request.json().catch(() => null);
          const itemId = Number(body?.itemId), name = sanitizeName(body?.name);
          const item = current.items.find((entry) => entry.id === itemId);
          if (!item) return json({ error: "item_not_found" }, 404);
          if (item.assignment) return json({ error: "already_assigned" }, 409);
          if (!name) return json({ error: "name_required" }, 400);
          const claimId = idFrom(9), editToken = idFrom(24);
          item.assignment = { id: claimId, name, editTokenHash: await hashToken(editToken), createdAt: Date.now() };
          await this.write(current);
          return json({ claimId, editToken }, 201);
        });
      }
      if (claimMatch && request.method === "DELETE") {
        return this.withLock(async () => {
          const current = await this.read();
          const item = current.items.find((entry) => entry.assignment?.id === claimMatch[1]);
          if (!item) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== item.assignment.editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          item.assignment = null;
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "checklist") {
      const taskMatch = path.match(/^\/task\/([A-Za-z0-9_-]+)$/);
      if (path === "/task" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.tasks.length >= 200) return json({ error: "task_limit" }, 409);
          const body = await request.json().catch(() => null);
          const label = cleanOption(body?.label);
          if (!label) return json({ error: "task_required" }, 400);
          const taskId = idFrom(9), editToken = idFrom(24);
          current.tasks.push({ id: taskId, label, done: false, editTokenHash: await hashToken(editToken), createdAt: Date.now() });
          await this.write(current);
          return json({ taskId, editToken }, 201);
        });
      }
      if (taskMatch && ["PUT", "DELETE"].includes(request.method)) {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.tasks.findIndex((item) => item.id === taskMatch[1]);
          if (index < 0) return json({ error: "task_not_found" }, 404);
          if (request.method === "DELETE") {
            const token = bearer(request);
            if (!token || (await hashToken(token)) !== current.tasks[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
            current.tasks.splice(index, 1);
          } else {
            const body = await request.json().catch(() => null);
            current.tasks[index].done = Boolean(body?.done);
            current.tasks[index].updatedAt = Date.now();
          }
          await this.write(current);
          return json({ ok: true });
        });
      }
    }

    if (data.type === "ranking") {
      const rankMatch = path.match(/^\/rank\/([A-Za-z0-9_-]+)$/);
      const cleanRanking = (current, value) => {
        const valid = new Set(current.options.map((option) => option.id));
        const ranking = Array.isArray(value) ? value.map(Number) : [];
        if (ranking.length !== current.options.length || new Set(ranking).size !== ranking.length || ranking.some((id) => !valid.has(id))) return null;
        return ranking;
      };
      if (path === "/rank" && request.method === "POST") {
        return this.withLock(async () => {
          const current = await this.read();
          if (current.votes.length >= MAX_RESPONSES) return json({ error: "response_limit" }, 409);
          const body = await request.json().catch(() => null), ranking = cleanRanking(current, body?.ranking);
          if (!ranking) return json({ error: "invalid_ranking" }, 400);
          const voteId = idFrom(9), editToken = idFrom(24), now = Date.now();
          current.votes.push({ id: voteId, ranking, editTokenHash: await hashToken(editToken), createdAt: now, updatedAt: now });
          await this.write(current);
          return json({ voteId, editToken }, 201);
        });
      }
      if (rankMatch && ["PUT", "DELETE"].includes(request.method)) {
        return this.withLock(async () => {
          const current = await this.read();
          const index = current.votes.findIndex((item) => item.id === rankMatch[1]);
          if (index < 0) return json({ error: "response_not_found" }, 404);
          const token = bearer(request);
          if (!token || (await hashToken(token)) !== current.votes[index].editTokenHash) return json({ error: "invalid_edit_token" }, 403);
          if (request.method === "DELETE") current.votes.splice(index, 1);
          else {
            const body = await request.json().catch(() => null), ranking = cleanRanking(current, body?.ranking);
            if (!ranking) return json({ error: "invalid_ranking" }, 400);
            current.votes[index].ranking = ranking; current.votes[index].updatedAt = Date.now();
          }
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
  } else if (type === "survey") {
    const rawQuestions = Array.isArray(body.questions) ? body.questions.slice(0, 10) : [];
    const questions = [];
    for (const [index, raw] of rawQuestions.entries()) {
      const text = cleanOption(raw?.text);
      const qtype = ["single", "multiple", "rating"].includes(raw?.type) ? raw.type : "single";
      if (!text) continue;
      if (qtype === "rating") {
        questions.push({ id: index + 1, text, type: qtype });
      } else {
        const labels = Array.isArray(raw?.options) ? [...new Set(raw.options.map(cleanOption).filter(Boolean))].slice(0, 10) : [];
        if (labels.length < 2) continue;
        questions.push({ id: index + 1, text, type: qtype, options: labels.map((label, optionIndex) => ({ id: optionIndex + 1, label })) });
      }
    }
    if (!questions.length) return json({ error: "questions_required" }, 400);
    data = { id, type, title, description, adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt, questions, responses: [] };
  } else if (type === "lottery") {
    data = { id, type, title, description, adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt, participants: [], order: null };
  } else if (type === "availability") {
    const labels = Array.isArray(body.slots) ? [...new Set(body.slots.map(cleanOption).filter(Boolean))].slice(0, 48) : [];
    if (labels.length < 2) return json({ error: "at_least_two_slots" }, 400);
    data = {
      id, type, title, description,
      adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt,
      slots: labels.map((label, index) => ({ id: index + 1, label })),
      responses: [],
    };
  } else if (type === "packing") {
    const labels = Array.isArray(body.items) ? [...new Set(body.items.map(cleanOption).filter(Boolean))].slice(0, 100) : [];
    if (!labels.length) return json({ error: "items_required" }, 400);
    data = {
      id, type, title, description,
      adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt,
      items: labels.map((label, index) => ({ id: index + 1, label, assignment: null })),
    };
  } else if (type === "checklist") {
    const labels = Array.isArray(body.tasks) ? [...new Set(body.tasks.map(cleanOption).filter(Boolean))].slice(0, 100) : [];
    if (!labels.length) return json({ error: "tasks_required" }, 400);
    data = {
      id, type, title, description,
      adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt,
      tasks: labels.map((label, index) => ({ id: "seed-" + (index + 1), label, done: false, editTokenHash: null, createdAt: now })),
    };
  } else if (type === "ranking") {
    const labels = Array.isArray(body.options) ? [...new Set(body.options.map(cleanOption).filter(Boolean))].slice(0, 10) : [];
    if (labels.length < 2) return json({ error: "at_least_two_options" }, 400);
    data = {
      id, type, title, description,
      adminTokenHash: await hashToken(adminToken), createdAt: now, expiresAt,
      options: labels.map((label, index) => ({ id: index + 1, label })),
      votes: [],
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

  const collabCreate = pathname.match(/^\/api\/collab\/(survey|lottery|availability|packing|checklist|ranking)$/);
  if (collabCreate && request.method === "POST") {
    return createSharedItem(request, env, collabCreate[1]);
  }

  const collabItem = pathname.match(/^\/api\/collab\/(survey|lottery|availability|packing|checklist|ranking)\/([A-Za-z0-9_-]+)$/);
  if (collabItem) {
    const stub = sharedStub(env, collabItem[1], collabItem[2]);
    if (request.method === "GET") return stub.fetch("https://shared.internal/data");
    if (request.method === "DELETE") {
      return stub.fetch("https://shared.internal/delete", {
        method: "DELETE",
        headers: { authorization: request.headers.get("authorization") ?? "" },
      });
    }
  }

  const collabAction = pathname.match(/^\/api\/collab\/(survey|lottery|availability|packing|checklist|ranking)\/([A-Za-z0-9_-]+)\/([a-z-]+)$/);
  if (collabAction && request.method === "POST") {
    return sharedStub(env, collabAction[1], collabAction[2]).fetch("https://shared.internal/" + collabAction[3], {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
      body: await request.text(),
    });
  }

  const collabActionItem = pathname.match(/^\/api\/collab\/(survey|lottery|availability|packing|checklist|ranking)\/([A-Za-z0-9_-]+)\/([a-z-]+)\/([A-Za-z0-9_-]+)$/);
  if (collabActionItem && ["PUT", "DELETE"].includes(request.method)) {
    const init = {
      method: request.method,
      headers: {
        "content-type": "application/json",
        authorization: request.headers.get("authorization") ?? "",
      },
    };
    if (request.method === "PUT") init.body = await request.text();
    return sharedStub(env, collabActionItem[1], collabActionItem[2]).fetch(
      "https://shared.internal/" + collabActionItem[3] + "/" + collabActionItem[4],
      init,
    );
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
