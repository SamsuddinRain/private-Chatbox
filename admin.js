// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_ZKST2r-4v5o4x1ryBbe8d_IWGZuSSt4",
    authDomain: "private-chatbox-f81f0.firebaseapp.com",
    databaseURL: "https://private-chatbox-f81f0-default-rtdb.firebaseio.com",
    projectId: "private-chatbox-f81f0",
    storageBucket: "private-chatbox-f81f0.appspot.com",
    messagingSenderId: "105172308420",
    appId: "1:105172308420:web:15c95d7100ab87d7a21491"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const approvalArea = document.getElementById("approvalArea");

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
const isApprovalLink = urlParams.get("approve") === "1";

// Handle approval
if (isApprovalLink && userId) {
    database.ref(`approval/${userId}`).set({ approved: true });
}

// Send message to Firebase
function sendMessageToFirebase(message) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    database.ref(`messages/${userId}`).push({
        userName: "Admin",
        message: message,
        time: time
    });
}

// Listen for messages with error handling
function listenForMessages() {
    database.ref(`messages/${userId}`).on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.message || !data.userName || !data.time) return;
        addMessageToUI(data.userName, data.message, data.time);
    }, (error) => {
        console.error("Error listening for messages:", error);
        approvalArea.innerHTML = `
            <div class="error-message">Connection error. Please refresh the page.</div>
        `;
    });
}

// Check Firebase connection
database.ref(".info/connected").on("value", (snap) => {
    if (snap.val() === true) {
        console.log("Connected to Firebase");
    } else {
        console.log("Disconnected from Firebase");
        approvalArea.innerHTML = `
            <div class="error-message">Connection lost. Please refresh the page.</div>
        `;
    }
});

// Add message to UI
function addMessageToUI(userName, message, time) {
    if (!message || typeof message !== 'string' || userName === undefined || time === undefined) return;
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${userName === "Admin" ? "sent" : "received"}`;
    messageDiv.innerHTML = `
        <div class=\"message-content\">${message}</div>
        <div class=\"message-info\">${userName === "Admin" ? time : 'user - ' + time}</div>
        <div class=\"read-receipt\" style=\"display:none;\"></div>
    `;
    chatMessages.appendChild(messageDiv);
    // Scroll to bottom after new message
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (userName === "Admin") {
        database.ref(`messages/${userId}/readReceipts`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.user !== "Admin") {
                messageDiv.querySelector('.read-receipt').style.display = 'flex';
                messageDiv.querySelector('.read-receipt').innerHTML = `<span class='checkmark'>✔✔</span> Seen`;
            }
        });
    }
}

// Handle send button click
sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (!message) return;

    sendMessageToFirebase(message);
    messageInput.value = "";
    // Keep input focused after sending
    messageInput.focus();
});

// Initialize
window.addEventListener("DOMContentLoaded", () => {
    approvalArea.innerHTML = `<div class="connected-message">Connected</div>`;
    listenForMessages();
}); 