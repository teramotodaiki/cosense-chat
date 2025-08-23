// === Cosense GPT-5 UserScript (single-file) v4.1 ===
// API Key は localStorage.OPENAI_API_KEY を最優先で使用（未設定時のみ下記の定数を使用）
const OPENAI_API_KEY = "sk-REPLACE_WITH_YOUR_KEY";

// OpenAI Responses API 設定
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const OPENAI_MODEL = "gpt-5"; // GPT-5 ファミリーのモデル名

// localStorage.OPENAI_API_KEY を最優先
const apiKey = () => {
  try {
    return (localStorage && localStorage.OPENAI_API_KEY) || OPENAI_API_KEY;
  } catch {
    return OPENAI_API_KEY;
  }
};

(() => {
  if (window.__COSENSE_GPT5_USERSCRIPT__) return;
  window.__COSENSE_GPT5_USERSCRIPT__ = true;

  // ---- Utilities ----
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (s, max = 15000) => (s.length > max ? s.slice(0, max) : s);

  const HEADER_COLOR = "rgba(196, 197, 202, 0.7)"; // Cosense header に合わせる
  const BORDER_COLOR = "rgba(0,0,0,.18)";
  const TEXT_COLOR = "#111";

  // 現在のプロジェクト名を推定
  function currentProject() {
    try {
      if (window.scrapbox?.Project?.name) return window.scrapbox.Project.name;
    } catch {}
    const m = location.pathname.split("/").filter(Boolean);
    return m[0] || "";
  }

  // 現在ページ本文（lines[].text）を結合
  function currentPageText(limit = 15000) {
    const lines = window?.scrapbox?.Page?.lines || [];
    const text = lines.map((l) => l.text || "").join("\n");
    return clamp(text, limit);
  }

  // 指定タイトルのScrapboxページ本文を取得（JSON→lines[].text or /text）
  async function fetchScrapboxPageText(title, limit = 15000) {
    const project = currentProject();
    const base = `/api/pages/${encodeURIComponent(
      project
    )}/${encodeURIComponent(title)}`;

    try {
      const r = await fetch(base, { credentials: "same-origin" });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j?.lines)) {
          const txt = j.lines.map((l) => l.text || "").join("\n");
          return clamp(txt, limit);
        }
      }
    } catch {}

    try {
      const r2 = await fetch(base + "/text", { credentials: "same-origin" });
      if (r2.ok) {
        const t = await r2.text();
        return clamp(t, limit);
      }
    } catch {}

    return ""; // 取得失敗
  }

  // ---- Responses API: ツール定義（関数呼び出し）----
  const TOOL_DEFS = [
    {
      type: "function",
      name: "get_page",
      description:
        "現在のScrapboxプロジェクトから、指定タイトルのページ本文（行結合テキスト）を返す",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Scrapboxページのタイトル" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  ];

  const TOOL_IMPL = {
    async get_page(args) {
      const { title } = args || {};
      if (!title) return "";
      const body = await fetchScrapboxPageText(title);
      return body || "";
    },
  };

  // ---- Responses API 呼び出し（ツール対応・非ストリーミング）----
  async function respondWithTools({ history, userText }) {
    // 軽量な system メッセージ（本文は最後に付与してキャッシュ効率を上げる）
    const system = [
      "あなたはCosense(Scrapbox)上で動作するアシスタントです。",
      `ユーザーは現在「${
        window?.scrapbox?.Page?.title || "(無題)"
      }」を閲覧中です。`,
      "以下は現在ページ本文です。事実参照の起点にしてください。",
      "--- Current Page ---\n" + currentPageText() + "\n---------------------",
      "必要に応じて 'get_page' ツールでリンク先ページの本文を取得してから回答してください。",
      "根拠がページに無い場合は、その旨を明示してください。",
    ].join("\n");

    const currentTitle = window?.scrapbox?.Page?.title || "(無題)";
    const pageBlock = [
      `現在のページ: ${currentTitle}`,
      "--- Current Page ---",
      currentPageText(),
      "---------------------",
    ].join("\n");

    const input = [
      { role: "system", content: [{ type: "input_text", text: system }] },
      ...history,
      { role: "user", content: [{ type: "input_text", text: userText }] },
      // 本文は一番下に付与（キャッシュ効率を向上）
      { role: "user", content: [{ type: "input_text", text: pageBlock }] },
    ];

    const key = apiKey();
    if (!key || /REPLACE_WITH_YOUR_KEY/.test(key)) {
      throw new Error(
        "OPENAI API Key が未設定です。localStorage.OPENAI_API_KEY を設定してください。"
      );
    }

    let res = await postJSON(`${OPENAI_BASE_URL}/responses`, {
      model: OPENAI_MODEL,
      input,
      tools: TOOL_DEFS,
      max_output_tokens: 2048,
    });

    res = await handleToolLoops(res);
    const text = extractText(res);
    return { raw: res, text: text || "(no text)" };
  }

  async function handleToolLoops(res) {
    const id = res?.id;
    if (!id) return res;

    while (
      res?.status === "requires_action" &&
      res?.required_action?.type === "submit_tool_outputs"
    ) {
      const calls = res.required_action.submit_tool_outputs?.tool_calls || [];
      const outputs = [];
      for (const call of calls) {
        const name = call?.function?.name;
        const argsJSON = call?.function?.arguments || "{}";
        let args = {};
        try {
          args = JSON.parse(argsJSON);
        } catch {}
        const impl = TOOL_IMPL[name];
        let out = "";
        if (typeof impl === "function") {
          try {
            out = await impl(args);
          } catch (e) {
            out = `__TOOL_ERROR__ ${(e && e.message) || e}`;
          }
        } else {
          out = `__TOOL_NOT_FOUND__ ${name}`;
        }
        outputs.push({ tool_call_id: call.id, output: String(out) });
      }

      res = await postJSON(
        `${OPENAI_BASE_URL}/responses/${id}/submit_tool_outputs`,
        { tool_outputs: outputs }
      );

      let guard = 0;
      while (
        res?.status &&
        ["queued", "in_progress"].includes(res.status) &&
        guard < 120
      ) {
        await sleep(800);
        res = await getJSON(`${OPENAI_BASE_URL}/responses/${id}`);
        guard++;
      }
    }
    return res;
  }

  function extractText(r) {
    if (!r) return "";
    if (typeof r.output_text === "string") return r.output_text;
    const out = [];
    if (Array.isArray(r.output)) {
      for (const item of r.output) {
        if (item?.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.type === "output_text" && typeof c.text === "string")
              out.push(c.text);
          }
        }
      }
    }
    return out.join("");
  }

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async function getJSON(url) {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  }

  // ---- UI（左ドロワ）----
  const STYLE = `
  .cg5__wrap{position:fixed;inset:0 auto 0 0;z-index:2147483000;width:380px;max-width:90vw;transform:translateX(-340px);transition:transform .2s ease;}
  .cg5__wrap[data-open="true"]{transform:none}
  .cg5__panel{box-sizing:border-box;height:100vh;background:${HEADER_COLOR};backdrop-filter:saturate(1.2) blur(4px);color:${TEXT_COLOR};border-right:1px solid ${BORDER_COLOR};padding:10px 10px 12px 10px;display:flex;flex-direction:column;font:13px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  .cg5__toggle{position:absolute;top:8px;right:-24px;width:24px;height:48px;background:${HEADER_COLOR};border:1px solid ${BORDER_COLOR};border-left:none;border-radius:0 6px 6px 0;color:${TEXT_COLOR};display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none}

  .cg5__msgs{flex:1;overflow:auto;border:1px solid ${BORDER_COLOR};background:rgba(255,255,255,.55);border-radius:6px;padding:8px;color:${TEXT_COLOR};display:flex;flex-direction:column}
  .cg5__row{display:flex;margin:6px 0}
  .cg5__row.-user{justify-content:flex-end}
  .cg5__row.-asst{justify-content:flex-start}
  .cg5__msg{max-width:90%;white-space:pre-wrap;padding:8px 10px;border-radius:12px;border:1px solid ${BORDER_COLOR};background:rgba(255,255,255,.9)}
  .cg5__msg.-user{background:rgba(255,255,255,.95)}
  .cg5__msg.-asst{background:rgba(255,255,255,.7)}

  /* Loading dots */
  .cg5__msg.-pending{opacity:.9}
  .cg5__dots{display:inline-block}
  .cg5__dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#555;margin-right:4px;animation:cg5Blink 1s infinite ease-in-out}
  .cg5__dot:nth-child(2){animation-delay:.15s}
  .cg5__dot:nth-child(3){animation-delay:.3s}
  @keyframes cg5Blink{0%,80%,100%{opacity:.25}40%{opacity:1}}

  .cg5__quick{display:flex;gap:6px;margin:4px 0 6px 0;background:rgba(255,255,255,.6);border:1px solid ${BORDER_COLOR};border-radius:6px;padding:6px}
  .cg5__qa{padding:6px 8px;border-radius:6px;border:1px solid ${BORDER_COLOR};background:rgba(255,255,255,.85);color:${TEXT_COLOR};cursor:pointer}
  .cg5__qa:hover{background:rgba(255,255,255,.95)}

  .cg5__input{display:flex;gap:6px;margin-top:8px}
  .cg5__textarea{flex:1;min-height:40px;max-height:160px;padding:6px 8px;border-radius:6px;border:1px solid ${BORDER_COLOR};background:rgba(255,255,255,.9);color:${TEXT_COLOR};resize:vertical}
  .cg5__send{padding:6px 10px;border-radius:6px;border:1px solid ${BORDER_COLOR};background:rgba(255,255,255,.7);color:${TEXT_COLOR};cursor:pointer}
  .cg5__send:hover{background:rgba(255,255,255,.85)}
  .cg5__desc{opacity:.8;margin:6px 0 4px 0;font-size:12px}
  `;

  const wrap = document.createElement("div");
  wrap.className = "cg5__wrap";
  wrap.dataset.open = "false";
  const panel = document.createElement("div");
  panel.className = "cg5__panel";
  const toggle = document.createElement("div");
  toggle.className = "cg5__toggle";
  toggle.textContent = ">";
  const desc = document.createElement("div");
  desc.className = "cg5__desc";
  desc.textContent = "このページと必要なリンク先を読んで回答します（GPT-5）";

  const msgs = document.createElement("div");
  msgs.className = "cg5__msgs";

  const quick = document.createElement("div");
  quick.className = "cg5__quick";
  const qaSummary = document.createElement("button");
  qaSummary.className = "cg5__qa";
  qaSummary.textContent = "このページを要約して";
  quick.appendChild(qaSummary);

  function appendRow(role, text, opts = {}) {
    const row = document.createElement("div");
    row.className = `cg5__row -${role}`;
    const bubble = document.createElement("div");
    bubble.className = `cg5__msg -${role}` + (opts.pending ? " -pending" : "");
    if (opts.pending) {
      const dots = document.createElement("span");
      dots.className = "cg5__dots";
      dots.innerHTML =
        '<span class="cg5__dot"></span><span class="cg5__dot"></span><span class="cg5__dot"></span>';
      bubble.appendChild(dots);
    } else {
      bubble.textContent = text;
    }
    row.appendChild(bubble);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  const input = document.createElement("textarea");
  input.className = "cg5__textarea";
  input.placeholder = "例: このページを要約して";
  const sendBtn = document.createElement("button");
  sendBtn.className = "cg5__send";
  sendBtn.textContent = "Send";
  const inputRow = document.createElement("div");
  inputRow.className = "cg5__input";
  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  panel.appendChild(desc);
  panel.appendChild(msgs);
  panel.appendChild(quick);
  panel.appendChild(inputRow);
  wrap.appendChild(panel);
  wrap.appendChild(toggle);

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  document.body.appendChild(wrap);

  const open = () => {
    wrap.dataset.open = "true";
    toggle.textContent = "<";
    input.focus();
  };
  const close = () => {
    wrap.dataset.open = "false";
    toggle.textContent = ">";
  };
  toggle.addEventListener("click", () => {
    wrap.dataset.open === "true" ? close() : open();
  });

  const history = [];

  async function sendText(t) {
    const text = (t || "").trim();
    if (!text) return;
    appendRow("user", text);
    open();

    const key = apiKey();
    if (!key || /REPLACE_WITH_YOUR_KEY/.test(key)) {
      appendRow(
        "asst",
        "Error: OPENAI API Key が未設定です。localStorage.OPENAI_API_KEY を設定してください。"
      );
      return;
    }

    const pendingBubble = appendRow("asst", "", { pending: true });

    try {
      const { text: answer } = await respondWithTools({
        history,
        userText: text,
      });
      history.push({ role: "user", content: [{ type: "input_text", text }] });
      history.push({
        role: "assistant",
        content: [{ type: "output_text", text: answer }],
      });
      pendingBubble.classList.remove("-pending");
      pendingBubble.textContent = answer;
    } catch (e) {
      pendingBubble.classList.remove("-pending");
      pendingBubble.textContent = `Error: ${(e && e.message) || e}`;
    }
  }

  async function send() {
    const t = (input.value || "").trim();
    if (!t) return;
    input.value = "";
    await sendText(t);
  }

  sendBtn.addEventListener("click", send);
  // IME 確定前 Enter で送信されないよう composition 状態を考慮
  let composing = false;
  input.addEventListener("compositionstart", () => (composing = true));
  input.addEventListener("compositionend", () => (composing = false));

  input.addEventListener("keydown", (ev) => {
    if (
      ev.key === "Enter" &&
      !ev.shiftKey &&
      !ev.ctrlKey &&
      !ev.metaKey &&
      !ev.altKey
    ) {
      if (composing || ev.isComposing) return; // IME 未確定なら送らない
      ev.preventDefault();
      send();
    }
  });

  qaSummary.addEventListener("click", () => {
    input.value = "";
    sendText("このページを要約して");
  });
})();
