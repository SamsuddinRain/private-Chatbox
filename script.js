const firebaseConfig = {
  apiKey: "AIzaSyD_ZKST2r-4v5o4x1ryBbe8d_IWGZuSSt4",
  authDomain: "private-chatbox-f81f0.firebaseapp.com",
  databaseURL: "https://private-chatbox-f81f0-default-rtdb.firebaseio.com",
  projectId: "private-chatbox-f81f0",
  storageBucket: "private-chatbox-f81f0.appspot.com", // ✅ Corrected
  messagingSenderId: "105172308420",
  appId: "1:105172308420:web:15c95d7100ab87d7a21491"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
emailjs.init("RUpvCIMdUC_m5up3C");

const nameInput = document.getElementById("nameInput");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const approvalArea = document.getElementById("approvalArea");

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get("admin") === "1";
const userId = urlParams.get("userId") || Date.now().toString();
let currentUserName = "";
let isApproved = false;
let waitingForApproval = false;

function checkApproval() {
  if (isAdmin) {
    isApproved = true;
    updateApprovalUI();
    return;
  }

  database.ref(`approval/${userId}`).on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.approved) {
      isApproved = true;
      updateApprovalUI();
    }
  });
}

function updateApprovalUI() {
  if (isAdmin) {
    approvalArea.innerHTML = `
      <div class="connected-message">Connected</div>
      <div class="start-chat-message">Start chat with Saim</div>
    `;
    messageInput.disabled = false;
    sendButton.disabled = false;
  } else if (isApproved) {
    approvalArea.innerHTML = `
      <div class="connected-message">Connected</div>
      <div class="start-chat-message">Start chat with Saim</div>
    `;
    messageInput.disabled = false;
    sendButton.disabled = false;
  } else if (waitingForApproval) {
    approvalArea.innerHTML = `
      <div class="approval-message">Waiting for admin approval...</div>
      <div class="loader"></div>
    `;
    messageInput.disabled = true;
    sendButton.disabled = true;
  } else {
    approvalArea.innerHTML = "";
    messageInput.disabled = false;
    sendButton.disabled = false;
  }
}

function sendMessageToFirebase(userName, message) {
  const now = new Date();
  const time = now.toLocaleTimeString();
  
  if (!isApproved && !isAdmin) {
    database.ref(`requests/${userId}`).set({
      name: userName,
      message: message,
      time: time
    });

    emailjs.send(
      "Saim",
      "template_pb5m8b7",
      {
        name: userName,
        message: message,
        time: time,
        userId: userId
      }
    ).then(function(response) {
      waitingForApproval = true;
      updateApprovalUI();
    }, function(error) {
      alert("Failed to send approval email to admin. Please try again or contact support.\nError: " + error.text);
      console.error("EmailJS error:", error);
      waitingForApproval = false;
      updateApprovalUI();
    });
    return;
  }

  database.ref(`messages/${userId}`).push({
    userName: userName,
    message: message,
    time: time
  });
}

function listenForMessages() {
  database.ref(`messages/${userId}`).on("child_added", (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.message || !data.userName || !data.time) return;
    addMessageToUI(data.userName, data.message, data.time);
  });
}

function addMessageToUI(userName, message, time) {
  if (!message || typeof message !== 'string' || userName === undefined || time === undefined) return;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${userName === currentUserName ? "sent" : "received"}`;
  messageDiv.innerHTML = `
    <div class="message-content">${message}</div>
    <div class="message-info">${userName === currentUserName ? time : userName + ' - ' + time}</div>
    <div class="read-receipt" style="display:none;"></div>
  `;
  chatMessages.appendChild(messageDiv);
  setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
  if (userName === currentUserName) {
    database.ref(`messages/${userId}/readReceipts`).on('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.user !== currentUserName) {
        messageDiv.querySelector('.read-receipt').style.display = 'flex';
        messageDiv.querySelector('.read-receipt').innerHTML = `<span class='checkmark'>✔✔</span> Seen`;
      }
    });
  }
}

// --- WhatsApp-style send button enable/disable ---
function updateSendButtonState() {
  sendButton.disabled = messageInput.value.trim().length === 0;
}
messageInput.addEventListener('input', updateSendButtonState);
window.addEventListener('DOMContentLoaded', updateSendButtonState);

sendButton.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (!message) return;

  if (!currentUserName && !isAdmin) {
    currentUserName = nameInput.value.trim();
    if (!currentUserName) {
      alert("Please enter your name first!");
      return;
    }
    localStorage.setItem("chat_user_name", currentUserName);
    nameInput.style.display = "none";
  }

  sendMessageToFirebase(currentUserName || "Admin", message);
  messageInput.value = "";
  updateSendButtonState();
  // Keep input focused after sending
  messageInput.focus();
});

window.addEventListener("DOMContentLoaded", () => {
  if (isAdmin) {
    currentUserName = "Admin";
    nameInput.style.display = "none";
  } else {
    const savedName = localStorage.getItem("chat_user_name");
    if (savedName) {
      currentUserName = savedName;
      nameInput.value = savedName;
      nameInput.style.display = "none";
    }
  }
  
  checkApproval();
  listenForMessages();
  if (isAdmin || isApproved || waitingForApproval) {
    updateApprovalUI();
  } else {
    approvalArea.innerHTML = "";
    messageInput.disabled = false;
    sendButton.disabled = false;
  }
  listenForTyping();
});

// --- DARK/DAY MODE TOGGLE ---
const darkModeBtn = document.getElementById('toggleDarkMode');
if (darkModeBtn) {
  darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    darkModeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('chat_dark_mode', isDark ? '1' : '0');
  });
  // On load, set mode from localStorage
  if (localStorage.getItem('chat_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
    darkModeBtn.textContent = '☀️';
  }
}

// --- TYPING INDICATOR ---
const typingIndicator = document.getElementById('typingIndicator');
let typingTimeout;
messageInput.addEventListener('input', () => {
  if (!isApproved) return;
  database.ref(`messages/${userId}/typing`).set({
    user: currentUserName || 'User',
    isTyping: messageInput.value.length > 0,
    time: Date.now()
  });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    database.ref(`messages/${userId}/typing`).set({
      user: currentUserName || 'User',
      isTyping: false,
      time: Date.now()
    });
  }, 2000);
});
function listenForTyping() {
  database.ref(`messages/${userId}/typing`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.isTyping && data.user !== (currentUserName || 'User')) {
      typingIndicator.innerHTML = `<span class="typing-indicator">${data.user} is typing <span class='dot'></span><span class='dot'></span><span class='dot'></span></span>`;
    } else {
      typingIndicator.innerHTML = '';
    }
  });
}

// --- READ RECEIPTS ---
// Mark all messages as read when chatMessages is focused or on new message
function markMessagesAsRead() {
  if (!isApproved) return;
  database.ref(`messages/${userId}/readReceipts`).set({
    user: currentUserName || 'User',
    time: Date.now()
  });
}
chatMessages.addEventListener('mouseenter', markMessagesAsRead);
chatMessages.addEventListener('touchstart', markMessagesAsRead);

// --- On mobile, keep input visible when keyboard opens ---
window.addEventListener('resize', () => {
  setTimeout(() => { messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
});