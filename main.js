/* =============================================
   main.js — 이노EX Q&A 챗봇 메인 로직
   ============================================= */

// ---- State ----
let currentFAQData = [];
let chatHistory = [];    // Claude API에 보내는 메시지 배열
let isTyping = false;

// ---- DOM ----
const chatArea       = document.getElementById("chat-area");
const chatMessages   = document.getElementById("chat-messages");
const userInput      = document.getElementById("user-input");
const sendBtn        = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");
const faqFileInput   = document.getElementById("faq-file-input");
const faqUploadBtn   = document.getElementById("faq-upload-btn");
const faqStatusEl    = document.getElementById("faq-status");
const apiKeyBtn      = document.getElementById("api-key-btn");
const apiKeyModal    = document.getElementById("api-key-modal");
const apiKeyInput    = document.getElementById("api-key-input");
const apiKeyStatus   = document.getElementById("api-key-status");
const saveApiKeyBtn  = document.getElementById("save-api-key-btn");
const modalCloseBtn  = document.getElementById("modal-close");
const modalCancelBtn = document.getElementById("modal-cancel");
const dropOverlay    = document.getElementById("drop-overlay-inner");
const quickCategories = document.getElementById("quick-categories");
const quickQuestions  = document.getElementById("quick-questions");

// ---- Init ----
function init() {
  currentFAQData = SAMPLE_FAQ_DATA;
  updateFAQStatus(`샘플 ${currentFAQData.length}개 로드됨`);
  renderQuickButtons();

  const savedKey = localStorage.getItem(API_KEY_STORAGE);
  if (savedKey) {
    apiKeyInput.value = savedKey;
    setApiKeyStatus("API 키 설정됨 ✓", "ok");
  }

  appendBotMessage(
    "안녕하세요! 이노EX Q&A 챗봇입니다 😊\n\n이노EX 제품에 대해 궁금한 점을 자유롭게 물어보세요.\n아래 빠른 질문 버튼을 활용하거나, FAQ xlsx 파일을 업로드해 내용을 업데이트할 수 있습니다."
  );
}

// ---- Send Message ----
async function handleSend() {
  const message = userInput.value.trim();
  if (!message || isTyping) return;

  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  if (!apiKey) {
    openModal();
    appendBotMessage("먼저 우측 상단의 **API 키** 버튼에서 Anthropic API 키를 등록해 주세요.");
    return;
  }

  userInput.value = "";
  autoResizeTextarea();
  appendUserMessage(message);

  chatHistory.push({ role: "user", content: message });
  // 최근 MAX_HISTORY_TURNS * 2개의 메시지만 유지
  if (chatHistory.length > MAX_HISTORY_TURNS * 2) {
    chatHistory = chatHistory.slice(-(MAX_HISTORY_TURNS * 2));
  }

  showTyping();

  try {
    const response = await callClaudeAPI();
    const text = response.content[0].text;
    chatHistory.push({ role: "assistant", content: text });
    hideTyping();
    appendBotMessage(text);
  } catch (err) {
    hideTyping();
    appendBotMessage(`오류가 발생했습니다.\n\n${formatAPIError(err)}`);
  }
}

// ---- Claude API 호출 ----
async function callClaudeAPI() {
  const apiKey = localStorage.getItem(API_KEY_STORAGE);

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(currentFAQData),
      messages: chatHistory,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return res.json();
}

function formatAPIError(err) {
  const msg = err.message || "";
  if (msg.includes("401") || msg.toLowerCase().includes("auth"))
    return "API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.";
  if (msg.includes("429"))
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError"))
    return "네트워크 오류입니다. 인터넷 연결을 확인해 주세요.";
  return msg || "알 수 없는 오류가 발생했습니다.";
}

// ---- Render Messages ----
function appendBotMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message assistant";
  wrapper.setAttribute("data-role", "assistant");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "IN";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatMessages.insertBefore(wrapper, typingIndicator);

  // 제품 링크 감지 & 추가
  const linksEl = buildProductLinks(text);
  if (linksEl) {
    const footer = document.createElement("div");
    footer.className = "message-footer";
    const label = document.createElement("span");
    label.className = "product-links-label";
    label.textContent = "관련 제품 바로가기";
    footer.appendChild(label);
    footer.appendChild(linksEl);
    chatMessages.insertBefore(footer, typingIndicator);
  }

  scrollToBottom();
}

function appendUserMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message user";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatMessages.insertBefore(wrapper, typingIndicator);
  scrollToBottom();
}

function formatText(text) {
  // HTML escape
  let t = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  t = t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  t = t.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Paragraphs (double newline)
  const paras = t.split(/\n\n+/);
  return paras
    .map((para) => {
      // Numbered or bullet list lines within a paragraph
      const lines = para.split("\n");
      if (lines.length === 1) return `<p>${lines[0]}</p>`;
      // If looks like a list
      const isListPara = lines.some((l) => /^\d+\.\s|^[-•]\s/.test(l));
      if (isListPara) {
        const items = lines
          .filter((l) => l.trim())
          .map((l) => l.replace(/^\d+\.\s|^[-•]\s/, ""))
          .map((l) => `<li>${l}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
}

// ---- Product Links ----
function buildProductLinks(text) {
  const found = Object.entries(PRODUCT_LINKS).filter(([name]) =>
    text.includes(name)
  );
  if (found.length === 0) return null;

  const container = document.createElement("div");
  container.className = "product-links";
  found.forEach(([name, url]) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "product-link";
    a.textContent = name;
    container.appendChild(a);
  });
  return container;
}

// ---- Typing Indicator ----
function showTyping() {
  isTyping = true;
  sendBtn.disabled = true;
  typingIndicator.style.display = "flex";
  scrollToBottom();
}

function hideTyping() {
  isTyping = false;
  sendBtn.disabled = false;
  typingIndicator.style.display = "none";
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ---- Quick Questions ----
function renderQuickButtons() {
  const categories = extractCategories(currentFAQData);
  quickCategories.innerHTML = "";
  quickQuestions.innerHTML = "";

  if (categories.length === 0) return;

  categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "category-btn" + (i === 0 ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category-btn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      renderQuestionButtons(cat);
    });
    quickCategories.appendChild(btn);
  });

  renderQuestionButtons(categories[0]);
}

function renderQuestionButtons(category) {
  quickQuestions.innerHTML = "";
  const items = getQuestionsByCategory(currentFAQData, category).slice(0, 4);
  items.forEach(({ question }) => {
    const btn = document.createElement("button");
    btn.className = "quick-q-btn";
    btn.textContent = question;
    btn.title = question;
    btn.addEventListener("click", () => {
      userInput.value = question;
      autoResizeTextarea();
      userInput.focus();
      handleSend();
    });
    quickQuestions.appendChild(btn);
  });
}

// ---- FAQ Upload ----
async function handleFileUpload(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    alert(".xlsx 파일만 업로드 가능합니다.");
    return;
  }

  updateFAQStatus("파싱 중...");
  try {
    const data = await parseFAQFromXLSX(file);
    if (data.length === 0) {
      alert("FAQ 데이터를 찾을 수 없습니다.\nA열=질문, B열=답변, C열=카테고리(선택) 형식인지 확인해 주세요.");
      updateFAQStatus("로드 실패");
      return;
    }
    currentFAQData = data;
    chatHistory = []; // FAQ 변경 시 대화 초기화
    updateFAQStatus(`${data.length}개 로드됨`);
    renderQuickButtons();
    appendBotMessage(
      `FAQ 파일이 업로드되었습니다.\n**${file.name}** 에서 **${data.length}개**의 Q&A 항목이 로드되었습니다. 새로운 FAQ 기반으로 질문해 보세요!`
    );
  } catch (err) {
    updateFAQStatus("파싱 오류");
    alert("파일 파싱 중 오류가 발생했습니다:\n" + err.message);
  }
}

function updateFAQStatus(msg) {
  faqStatusEl.textContent = msg;
}

// ---- API Key Modal ----
function openModal() { apiKeyModal.style.display = "flex"; }
function closeModal() { apiKeyModal.style.display = "none"; }

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith("sk-ant-")) {
    setApiKeyStatus("유효하지 않은 API 키 형식입니다. (sk-ant-로 시작해야 합니다)", "error");
    return;
  }
  localStorage.setItem(API_KEY_STORAGE, key);
  setApiKeyStatus("저장되었습니다 ✓", "ok");
  setTimeout(closeModal, 800);
}

function setApiKeyStatus(msg, type) {
  apiKeyStatus.textContent = msg;
  apiKeyStatus.className = type === "ok" ? "api-status ok" : "api-status error";
}

// ---- Textarea Auto-Resize ----
function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
}

// ---- Drag & Drop ----
let dragCounter = 0;

document.addEventListener("dragenter", (e) => {
  const hasFile = e.dataTransfer?.types?.includes("Files");
  if (!hasFile) return;
  dragCounter++;
  dropOverlay.style.display = "flex";
});

document.addEventListener("dragleave", () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.style.display = "none";
  }
});

document.addEventListener("dragover", (e) => e.preventDefault());

document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.style.display = "none";
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFileUpload(file);
});

// ---- Event Listeners ----
sendBtn.addEventListener("click", handleSend);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

userInput.addEventListener("input", autoResizeTextarea);

faqFileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  e.target.value = ""; // reset so same file can be re-uploaded
});

apiKeyBtn.addEventListener("click", openModal);
saveApiKeyBtn.addEventListener("click", saveApiKey);
modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);

apiKeyModal.addEventListener("click", (e) => {
  if (e.target === apiKeyModal) closeModal();
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveApiKey();
});

// ---- Start ----
init();
