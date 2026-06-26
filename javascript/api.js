const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const newChatBtn = document.getElementById("new-chat");
const deleteChatBtn = document.getElementById("delete-chat");
const renameChatBtn = document.getElementById("rename-chat");
const pinChatBtn = document.getElementById("pin-chat");
const chatHistory = document.getElementById("chat-history");
const chatTitle = document.getElementById("chat-title");
const searchChat = document.getElementById("search-chat");
const themeToggle = document.getElementById("theme-toggle");
const modelSelect = document.getElementById("model-select");
const suggestions = document.querySelectorAll(".suggestions button");
const fileInput = document.getElementById("file-input");

const API_URL = "https://elios-api.onrender.com/api/chat";

let chats = JSON.parse(localStorage.getItem("elios-chats")) || [];
let currentChatId = null;
let currentModel = localStorage.getItem("elios-model") || "llama-3.3-70b-versatile";

if (modelSelect) modelSelect.value = currentModel;

function saveChats() {
  localStorage.setItem("elios-chats", JSON.stringify(chats));
}

function createChat() {
  const chat = {
    id: Date.now(),
    title: "Nouvelle discussion",
    pinned: false,
    messages: []
  };

  chats.unshift(chat);
  currentChatId = chat.id;
  saveChats();
  renderHistory();
  renderMessages();
}

function getCurrentChat() {
  return chats.find(chat => chat.id === currentChatId);
}

function renderHistory() {
  chatHistory.innerHTML = "";

  const search = searchChat.value.toLowerCase();

  const sortedChats = [...chats]
    .filter(chat => chat.title.toLowerCase().includes(search))
    .sort((a, b) => b.pinned - a.pinned);

  sortedChats.forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-item";

    if (chat.id === currentChatId) {
      button.classList.add("active");
    }

    button.textContent = chat.pinned ? "⭐ " + chat.title : chat.title;

    button.addEventListener("click", () => {
      currentChatId = chat.id;
      renderHistory();
      renderMessages();
    });

    chatHistory.appendChild(button);
  });
}

function renderMessages() {
  const chat = getCurrentChat();

  if (!chat) {
    createChat();
    return;
  }

  chatMessages.innerHTML = "";
  chatTitle.textContent = chat.title;

  if (chat.messages.length === 0) {
    chatMessages.innerHTML = `
      <div class="empty-state">
        <img src="assets/images/elios-logo.png" class="empty-logo" />
        <h2>Comment puis-je t’éclairer ?</h2>
        <p>Pose une question, écris du code, ou démarre une idée.</p>
      </div>
    `;
    return;
  }

  chat.messages.forEach(msg => {
    addMessageToScreen(msg.content, msg.role);
  });
}

function addMessageToScreen(content, role) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
  message.textContent = content;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showLoader() {
  const loader = document.createElement("div");
  loader.className = "message ai-message";
  loader.id = "loader";
  loader.innerHTML = `
    <img src="assets/images/elios-logo.png" class="loader-logo" />
    <span> Elios réfléchit...</span>
  `;
  chatMessages.appendChild(loader);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.remove();
}

async function askAI(messages) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: currentModel,
      messages: messages
    })
  });

  if (!response.ok) {
    throw new Error("API indisponible");
  }

  const data = await response.json();
  return data.reply || "Je n’ai pas reçu de réponse.";
}

async function typeWriter(text) {
  const message = document.createElement("div");
  message.className = "message ai-message";
  chatMessages.appendChild(message);

  for (let i = 0; i < text.length; i++) {
    message.textContent += text[i];
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 7));
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  const chat = getCurrentChat();

  if (chat.messages.length === 0) {
    chat.title = text.slice(0, 34);
  }

  chat.messages.push({
    role: "user",
    content: text
  });

  userInput.value = "";

  saveChats();
  renderHistory();
  renderMessages();
  showLoader();

  try {
    const aiResponse = await askAI(chat.messages);

    removeLoader();

    chat.messages.push({
      role: "assistant",
      content: aiResponse
    });

    saveChats();

    chatMessages.innerHTML = "";

    chat.messages.slice(0, -1).forEach(msg => {
      addMessageToScreen(msg.content, msg.role);
    });

    await typeWriter(aiResponse);

  } catch (error) {
    removeLoader();

    chat.messages.push({
      role: "assistant",
      content: "Erreur : impossible de contacter Elios API. Vérifie que le serveur Render est bien actif."
    });

    saveChats();
    renderMessages();
  }
});

newChatBtn.addEventListener("click", createChat);

deleteChatBtn.addEventListener("click", () => {
  chats = chats.filter(chat => chat.id !== currentChatId);

  if (chats.length === 0) {
    createChat();
  } else {
    currentChatId = chats[0].id;
    saveChats();
    renderHistory();
    renderMessages();
  }
});

renameChatBtn.addEventListener("click", () => {
  const chat = getCurrentChat();
  const newName = prompt("Nouveau nom :", chat.title);

  if (newName) {
    chat.title = newName;
    saveChats();
    renderHistory();
    renderMessages();
  }
});

pinChatBtn.addEventListener("click", () => {
  const chat = getCurrentChat();
  chat.pinned = !chat.pinned;
  saveChats();
  renderHistory();
});

searchChat.addEventListener("input", renderHistory);

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "elios-theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});

if (modelSelect) {
  modelSelect.addEventListener("change", () => {
    currentModel = modelSelect.value;
    localStorage.setItem("elios-model", currentModel);
  });
}

suggestions.forEach(button => {
  button.addEventListener("click", () => {
    userInput.value = button.textContent.replace(/^[^a-zA-ZÀ-ÿ]+/, "");
    userInput.focus();
  });
});

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    userInput.value = `J’ai importé le fichier : ${file.name}. Peux-tu m’aider à l’analyser ?`;
    userInput.focus();
  });
}

if (localStorage.getItem("elios-theme") === "dark") {
  document.body.classList.add("dark");
}

if (chats.length === 0) {
  createChat();
} else {
  currentChatId = chats[0].id;
  renderHistory();
  renderMessages();
}
const mobileMenu = document.getElementById("mobile-menu");
const sidebar = document.querySelector(".sidebar");

if (mobileMenu && sidebar) {
  mobileMenu.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}