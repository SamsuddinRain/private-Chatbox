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
    
    database.ref(`chat/${userId}`).push({
        userName: "Admin",
        message: message,
        time: time
    });
}

// Listen for messages with error handling
function listenForMessages() {
    database.ref(`chat/${userId}`).on("child_added", (snapshot) => {
        const data = snapshot.val();
        if (data) {
            addMessageToUI(data.userName, data.message, data.time);
        }
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
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${userName === "Admin" ? "sent" : "received"}`;
    messageDiv.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-info">${userName} - ${time}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle send button click
sendButton.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (!message) return;

    sendMessageToFirebase(message);
    messageInput.value = "";
});

// Initialize
window.addEventListener("DOMContentLoaded", () => {
    approvalArea.innerHTML = `<div class="connected-message">Connected</div>`;
    listenForMessages();
}); 