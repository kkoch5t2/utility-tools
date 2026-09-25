type AnswerStatus = "yes" | "maybe" | "no";
type ScheduleOption = { id: number; label: string; sortOrder: number };
type ScheduleResponse = {
  id: string;
  name: string;
  comment: string;
  createdAt: number;
  updatedAt: number;
  answers: Record<string, AnswerStatus>;
};
type Summary = { optionId: number; yes: number; maybe: number; no: number };
type ScheduleData = {
  id: string;
  title: string;
  description: string;
  organizerName: string;
  createdAt: number;
  expiresAt: number;
  options: ScheduleOption[];
  responses: ScheduleResponse[];
  summary: Summary[];
  responseCount: number;
};

const qs = <T extends Element>(selector: string) => document.querySelector<T>(selector);
const loading = qs<HTMLElement>("[data-loading]")!;
const createView = qs<HTMLElement>("[data-create-view]")!;
const eventView = qs<HTMLElement>("[data-event-view]")!;
const errorView = qs<HTMLElement>("[data-error-view]")!;
const params = new URLSearchParams(location.search);
const scheduleId = params.get("id")?.trim() ?? "";
let current: ScheduleData | null = null;

try {
  const key = "utility-tools:recent";
  const item = { id: "schedule-coordination", href: "/schedule/", name: "日程調整", category: "share" };
  const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
  const items = Array.isArray(saved) ? saved.filter((entry) => entry?.id !== item.id) : [];
  localStorage.setItem(key, JSON.stringify([item, ...items].slice(0, 6)));
} catch {}

const errorMessages: Record<string, string> = {
  title_required: "予定・イベント名を入力してください。",
  at_least_two_options: "候補は2件以上入力してください。",
  invalid_json: "入力内容を確認してください。",
  name_required: "名前を入力してください。",
  all_options_required: "すべての候補に○△×のいずれかを選んでください。",
  name_already_used: "同じ名前の回答があります。別の名前を使うか、この端末の回答を編集してください。",
  response_limit: "回答上限の100件に達しました。",
  response_not_found: "回答が見つかりませんでした。",
  invalid_edit_token: "この回答を編集する権限がありません。",
  schedule_not_found: "日程調整が見つかりませんでした。",
  invalid_admin_token: "この日程調整を削除する権限がありません。",
  storage_not_configured: "共有機能の保存先がまだ設定されていません。",
  internal_error: "処理中にエラーが発生しました。少し待ってから再度お試しください。",
};

function setVisible(element: HTMLElement, visible: boolean) {
  element.hidden = !visible;
}

function setError(element: HTMLElement, message = "") {
  element.textContent = message;
  element.hidden = !message;
}

function adminKey(id: string) {
  return `utility-tools:schedule:admin:${id}`;
}

function responseKey(id: string) {
  return `utility-tools:schedule:response:${id}`;
}

function getSavedResponse(id: string): { responseId: string; editToken: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(responseKey(id)) ?? "null");
    if (value?.responseId && value?.editToken) return value;
  } catch {}
  return null;
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof data?.error === "string" ? data.error : "internal_error";
    throw new Error(errorMessages[code] ?? "処理に失敗しました。");
  }
  return data;
}
function initCreate() {
  loading.hidden = true;
  createView.hidden = false;
  const form = qs<HTMLFormElement>("[data-create-form]")!;
  const button = qs<HTMLButtonElement>("[data-create-button]")!;
  const error = qs<HTMLElement>("[data-create-error]")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError(error);
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const organizerName = String(formData.get("organizer") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const rawOptions = String(formData.get("options") ?? "");
    const options = [...new Set(rawOptions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];

    if (options.length < 2) {
      setError(error, "候補は2件以上、1行に1件ずつ入力してください。");
      return;
    }
    if (options.length > 20) {
      setError(error, "候補は20件以内にしてください。");
      return;
    }

    button.disabled = true;
    button.textContent = "作成中...";
    try {
      const result = await requestJson("/api/schedules", {
        method: "POST",
        body: JSON.stringify({ title, organizerName, description, options }),
      });
      localStorage.setItem(adminKey(result.id), result.adminToken);
      location.assign(`/schedule/?id=${encodeURIComponent(result.id)}&created=1`);
    } catch (cause) {
      setError(error, cause instanceof Error ? cause.message : "作成に失敗しました。");
      button.disabled = false;
      button.textContent = "日程調整を作成";
    }
  });
}

function formatExpiry(timestamp: number) {
  const date = new Date(timestamp);
  return `保存期限: ${date.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" })}`;
}

function mark(status?: AnswerStatus) {
  return status === "yes" ? "○" : status === "maybe" ? "△" : status === "no" ? "×" : "—";
}

function renderAnswerForm(saved?: ScheduleResponse) {
  if (!current) return;
  const list = qs<HTMLElement>("[data-answer-list]")!;
  list.replaceChildren();

  for (const option of current.options) {
    const row = document.createElement("div");
    row.className = "answer-row";

    const label = document.createElement("div");
    label.className = "answer-label";
    label.textContent = option.label;

    const group = document.createElement("div");
    group.className = "mark-group";
    const currentStatus = saved?.answers[String(option.id)];
    const choices: Array<[AnswerStatus, string, string]> = [
      ["yes", "○", "参加できる"],
      ["maybe", "△", "未定・条件付き"],
      ["no", "×", "参加できない"],
    ];

    for (const [value, symbol, aria] of choices) {
      const wrapper = document.createElement("label");
      wrapper.className = `mark-option ${value}`;
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `option-${option.id}`;
      input.value = value;
      input.checked = currentStatus === value;
      input.setAttribute("aria-label", `${option.label}: ${aria}`);
      const span = document.createElement("span");
      span.textContent = symbol;
      span.title = aria;
      wrapper.append(input, span);
      group.append(wrapper);
    }

    row.append(label, group);
    list.append(row);
  }
}

function renderSummary() {
  if (!current) return;
  const list = qs<HTMLElement>("[data-summary-list]")!;
  const empty = qs<HTMLElement>("[data-summary-empty]")!;
  const best = qs<HTMLElement>("[data-best-option]")!;
  list.replaceChildren();

  if (!current.responses.length) {
    empty.hidden = false;
    best.hidden = true;
    return;
  }
  empty.hidden = true;

  const byOption = new Map(current.options.map((option) => [option.id, option]));
  for (const item of current.summary) {
    const option = byOption.get(item.optionId);
    if (!option) continue;
    const card = document.createElement("div");
    card.className = "summary-item";
    const title = document.createElement("strong");
    title.textContent = option.label;
    const counts = document.createElement("div");
    counts.className = "summary-counts";
    counts.innerHTML = `<span class="yes">○ ${item.yes}</span><span class="maybe">△ ${item.maybe}</span><span class="no">× ${item.no}</span>`;
    card.append(title, counts);
    list.append(card);
  }

  const ranked = [...current.summary].sort(
    (a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no || a.optionId - b.optionId
  );
  const top = ranked[0];
  const option = top ? byOption.get(top.optionId) : null;
  if (top && option) {
    best.hidden = false;
    qs<HTMLElement>("[data-best-label]")!.textContent = option.label;
    qs<HTMLElement>("[data-best-count]")!.textContent = `○ ${top.yes} / △ ${top.maybe} / × ${top.no}`;
  } else {
    best.hidden = true;
  }
}
function renderParticipants() {
  if (!current) return;
  const wrap = qs<HTMLElement>("[data-participant-wrap]")!;
  const empty = qs<HTMLElement>("[data-participant-empty]")!;
  qs<HTMLElement>("[data-response-count]")!.textContent = String(current.responses.length);

  wrap.querySelector(".participant-table")?.remove();
  if (!current.responses.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const table = document.createElement("table");
  table.className = "participant-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const nameHead = document.createElement("th");
  nameHead.textContent = "名前";
  headRow.append(nameHead);
  for (const option of current.options) {
    const th = document.createElement("th");
    th.textContent = option.label;
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const response of current.responses) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const name = document.createElement("span");
    name.className = "participant-name";
    name.textContent = response.name;
    nameCell.append(name);
    if (response.comment) {
      const comment = document.createElement("span");
      comment.className = "participant-comment";
      comment.textContent = response.comment;
      nameCell.append(comment);
    }
    row.append(nameCell);

    for (const option of current.options) {
      const status = response.answers[String(option.id)];
      const cell = document.createElement("td");
      cell.className = `mark-cell ${status ?? ""}`;
      cell.textContent = mark(status);
      row.append(cell);
    }
    tbody.append(row);
  }

  table.append(thead, tbody);
  wrap.append(table);
}

function hydrateOwnResponse() {
  if (!current) return;
  const saved = getSavedResponse(current.id);
  const existing = saved ? current.responses.find((item) => item.id === saved.responseId) : undefined;
  const name = qs<HTMLInputElement>("[data-response-name]")!;
  const comment = qs<HTMLTextAreaElement>("[data-response-comment]")!;
  const heading = qs<HTMLElement>("[data-response-heading]")!;
  const submit = qs<HTMLButtonElement>("[data-response-submit]")!;
  const cancel = qs<HTMLButtonElement>("[data-cancel-edit]")!;
  const deleteButton = qs<HTMLButtonElement>("[data-delete-response]")!;

  if (saved && existing) {
    name.value = existing.name;
    comment.value = existing.comment ?? "";
    heading.textContent = "自分の回答を編集";
    submit.textContent = "回答を更新";
    cancel.hidden = false;
    deleteButton.hidden = false;
    renderAnswerForm(existing);
  } else {
    if (saved && !existing) localStorage.removeItem(responseKey(current.id));
    name.value = "";
    comment.value = "";
    heading.textContent = "回答する";
    submit.textContent = "回答を送信";
    cancel.hidden = true;
    deleteButton.hidden = true;
    renderAnswerForm();
  }
}

function renderEvent() {
  if (!current) return;
  qs<HTMLElement>("[data-event-title]")!.textContent = current.title;
  const description = qs<HTMLElement>("[data-event-description]")!;
  description.textContent = current.description;
  description.hidden = !current.description;

  const organizer = qs<HTMLElement>("[data-event-organizer]")!;
  organizer.textContent = current.organizerName ? `主催: ${current.organizerName}` : "";
  organizer.hidden = !current.organizerName;
  qs<HTMLElement>("[data-event-expiry]")!.textContent = formatExpiry(current.expiresAt);
  qs<HTMLInputElement>("[data-share-url]")!.value = `${location.origin}/schedule/?id=${encodeURIComponent(current.id)}`;
  qs<HTMLElement>("[data-created-banner]")!.hidden = params.get("created") !== "1";

  const adminToken = localStorage.getItem(adminKey(current.id));
  qs<HTMLButtonElement>("[data-delete-schedule]")!.hidden = !adminToken;

  renderSummary();
  renderParticipants();
  hydrateOwnResponse();
}
async function loadEvent() {
  try {
    current = await requestJson(`/api/schedules/${encodeURIComponent(scheduleId)}`);
    loading.hidden = true;
    eventView.hidden = false;
    renderEvent();
  } catch {
    loading.hidden = true;
    errorView.hidden = false;
  }
}

function collectAnswers() {
  if (!current) return null;
  const answers: Record<string, AnswerStatus> = {};
  for (const option of current.options) {
    const selected = document.querySelector<HTMLInputElement>(`input[name="option-${option.id}"]:checked`);
    if (!selected) return null;
    answers[String(option.id)] = selected.value as AnswerStatus;
  }
  return answers;
}

async function reloadEvent() {
  if (!scheduleId) return;
  current = await requestJson(`/api/schedules/${encodeURIComponent(scheduleId)}`);
  renderEvent();
}

function wireEventActions() {
  const form = qs<HTMLFormElement>("[data-response-form]")!;
  const responseError = qs<HTMLElement>("[data-response-error]")!;
  const submit = qs<HTMLButtonElement>("[data-response-submit]")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!current) return;
    setError(responseError);
    const answers = collectAnswers();
    if (!answers) {
      setError(responseError, "すべての候補に○△×を選んでください。");
      return;
    }

    const name = qs<HTMLInputElement>("[data-response-name]")!.value.trim();
    const comment = qs<HTMLTextAreaElement>("[data-response-comment]")!.value.trim();
    const saved = getSavedResponse(current.id);
    const existing = saved ? current.responses.find((item) => item.id === saved.responseId) : undefined;

    submit.disabled = true;
    submit.textContent = existing ? "更新中..." : "送信中...";
    try {
      if (saved && existing) {
        await requestJson(`/api/schedules/${current.id}/responses/${saved.responseId}`, {
          method: "PUT",
          headers: { authorization: `Bearer ${saved.editToken}` },
          body: JSON.stringify({ name, comment, answers }),
        });
      } else {
        const result = await requestJson(`/api/schedules/${current.id}/responses`, {
          method: "POST",
          body: JSON.stringify({ name, comment, answers }),
        });
        localStorage.setItem(
          responseKey(current.id),
          JSON.stringify({ responseId: result.responseId, editToken: result.editToken })
        );
      }
      await reloadEvent();
    } catch (cause) {
      setError(responseError, cause instanceof Error ? cause.message : "回答に失敗しました。");
    } finally {
      submit.disabled = false;
      const savedAfter = current ? getSavedResponse(current.id) : null;
      submit.textContent = savedAfter ? "回答を更新" : "回答を送信";
    }
  });

  qs<HTMLButtonElement>("[data-cancel-edit]")!.addEventListener("click", () => {
    if (!current) return;
    localStorage.removeItem(responseKey(current.id));
    hydrateOwnResponse();
  });

  qs<HTMLButtonElement>("[data-delete-response]")!.addEventListener("click", async () => {
    if (!current) return;
    const saved = getSavedResponse(current.id);
    if (!saved || !confirm("自分の回答を削除しますか？")) return;
    try {
      await requestJson(`/api/schedules/${current.id}/responses/${saved.responseId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${saved.editToken}` },
      });
      localStorage.removeItem(responseKey(current.id));
      await reloadEvent();
    } catch (cause) {
      setError(responseError, cause instanceof Error ? cause.message : "削除に失敗しました。");
    }
  });
  qs<HTMLButtonElement>("[data-copy-url]")!.addEventListener("click", async () => {
    const input = qs<HTMLInputElement>("[data-share-url]")!;
    const message = qs<HTMLElement>("[data-copy-message]")!;
    try {
      await navigator.clipboard.writeText(input.value);
      message.textContent = "コピーしました。";
    } catch {
      input.focus();
      input.select();
      message.textContent = "URLを選択しました。コピーしてください。";
    }
    message.hidden = false;
    window.setTimeout(() => { message.hidden = true; }, 1800);
  });

  qs<HTMLButtonElement>("[data-refresh]")!.addEventListener("click", async () => {
    try {
      await reloadEvent();
    } catch {}
  });

  qs<HTMLButtonElement>("[data-delete-schedule]")!.addEventListener("click", async () => {
    if (!current) return;
    const adminToken = localStorage.getItem(adminKey(current.id));
    if (!adminToken || !confirm("この日程調整とすべての回答を削除します。元に戻せません。")) return;
    try {
      await requestJson(`/api/schedules/${current.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      localStorage.removeItem(adminKey(current.id));
      localStorage.removeItem(responseKey(current.id));
      location.assign("/schedule/");
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : "削除に失敗しました。");
    }
  });
}

if (scheduleId) {
  wireEventActions();
  loadEvent();
} else {
  initCreate();
}
