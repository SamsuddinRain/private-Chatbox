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
const approvalMessage = document.getElementById("approvalMessage");
const connectedMessage = document.getElementById("connectedMessage");
const loader = document.getElementById("loader");

const urlParams = new URLSearchParams(window.location.search);
const approved = urlParams.get("approve") === "1";
const userId = urlParams.get("userId") || Date.now().toString();

let approvedUser = approved;

if (!approvedUser) {
  approvalMessage.style.display = "block";
  loader.style.display = "block";
} else {
  approvalMessage.style.display = "none";
  loader.style.display = "none";
  connectedMessage.style.display = "block";
}

if (!approvedUser) {
  const userRef = database.ref("approvals/" + userId);
  userRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && data.approved) {
      approvedUser = true;
      approvalMessage.style.display = "none";
      loader.style.display = "none";
      connectedMessage.style.display = "block";
    }
  });
}

sendButton.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) return;

  if (!approvedUser) {
    const requestRef = database.ref("requests/" + userId);
    const timestamp = new Date().toLocaleString();
    requestRef.set({ name, message, time: timestamp });

    emailjs.send("Saim", "template_pb5m8b7", {
      name,
      message,
      time: timestamp,
      userId
    });

    sendButton.disabled = true;
    sendButton.textContent = "Waiting for approval...";
    return;
  }

  const chatRef = database.ref("chats/" + userId);
  const chatData = {
    name,
    message,
    time: new Date().toLocaleTimeString(),
    sent: true
  };
  chatRef.push(chatData);
  messageInput.value = "";
});

const chatRef = database.ref("chats/" + userId);
chatRef.on("child_added", (snapshot) => {
  const data = snapshot.val();
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", data.sent ? "sent" : "received");
  msgDiv.innerHTML = `
    <div class="message-content">${data.message}</div>
    <div class="message-info">${data.name} • ${data.time}</div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});