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

// Initialize EmailJS
emailjs.init("RUpvCIMdUC_m5up3C");

// DOM Elements
const nameInput = document.getElementById("nameInput");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const approvalArea = document.getElementById("approvalArea");
const firstMsgNotice = document.getElementById("firstMsgNotice");

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId") || Date.now().toString();
let currentUserName = "";
let isApproved = false;

// Check if user is approved
function checkApproval() {
    database.ref(`approval/${userId}`).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && data.approved) {
            isApproved = true;
            updateApprovalUI();
            messageInput.disabled = false;
            sendButton.disabled = false;
        }
    });
}

// Update UI based on approval status
function updateApprovalUI() {
    const approvalArea = document.getElementById('approvalArea');
    
    if (isApproved) {
        // User is approved
        approvalArea.innerHTML = `
            <div class="connected-message">Connected</div>
            <div class="start-chat-message">Start chat with Saim</div>
        `;
        messageInput.disabled = false;
        sendButton.disabled = false;
    } else {
        // User is not approved
        if (!localStorage.getItem("chat_first_msg_sent")) {
            // First time user - show initial message
            approvalArea.innerHTML = `
                <div class="approval-message">Send first msg and wait</div>
            `;
        } else {
            // Waiting for approval
            approvalArea.innerHTML = `
                <div class="approval-message">Waiting for admin approval...</div>
                <div class="loader"></div>
            `;
        }
        messageInput.disabled = true;
        sendButton.disabled = true;
    }
}

// Send message to Firebase
function sendMessageToFirebase(userName, message) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    if (!isApproved) {
        // First message - send approval request
        database.ref(`requests/${userId}`).set({
            name: userName,
            message: message,
            time: time
        });

        // Send email to admin
        emailjs.send(
            "Portfolio Contact",
            "template_pb5m8b7",
            {
                name: userName,
                message: message,
                time: time,
                userId: userId
            }
        ).then(() => {
            // Mark first message sent in localStorage
            localStorage.setItem("chat_first_msg_sent", "1");
            // Update UI to show waiting message
            const approvalArea = document.getElementById('approvalArea');
            approvalArea.innerHTML = `
                <div class="approval-message">Waiting for admin approval...</div>
                <div class="loader"></div>
            `;
            // Disable input after first message
            messageInput.disabled = true;
            sendButton.disabled = true;
        }).catch(error => {
            console.error("Error sending email:", error);
            alert("Error sending message. Please try again.");
        });
        return;
    }

    // Normal chat message
    database.ref(`messages/${userId}`).push({
        userName: userName,
        message: message,
        time: time
    });

    // Show warning message after first message when approved
    if (isApproved) {
        const startChatMessage = document.querySelector('.start-chat-message');
        if (startChatMessage && startChatMessage.textContent === "Start chat with Saim") {
            startChatMessage.textContent = "⚠️ Don't refresh the page or you'll be disconnected!";
            startChatMessage.style.color = "#dc3545";
        }
    }
}

// Listen for messages with error handling
function listenForMessages() {
    database.ref(`messages/${userId}`).on("child_added", (snapshot) => {
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
    messageDiv.className = `message ${userName === currentUserName ? "sent" : "received"}`;
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

    if (!currentUserName) {
        currentUserName = nameInput.value.trim();
        if (!currentUserName) {
            alert("Please enter your name first!");
            return;
        }
        localStorage.setItem("chat_user_name", currentUserName);
        nameInput.style.display = "none";
    }

    sendMessageToFirebase(currentUserName, message);
    messageInput.value = "";
});

// Initialize
window.addEventListener("DOMContentLoaded", () => {
    const savedName = localStorage.getItem("chat_user_name");
    if (savedName) {
        currentUserName = savedName;
        nameInput.value = savedName;
        nameInput.style.display = "none";
    }
    
    checkApproval();
    listenForMessages();
    updateApprovalUI();
});

function updateConnectionStatus(status) {
    const approvalArea = document.getElementById('approvalArea');
    const firstMsgNotice = document.getElementById('firstMsgNotice');
    const startChatMessage = document.querySelector('.start-chat-message');
    
    if (status === 'connected') {
        approvalArea.innerHTML = `
            <div class="connected-message">Connected!</div>
            <div class="start-chat-message">Start chat with Saim</div>
        `;
        firstMsgNotice.style.display = 'none';
    } else if (status === 'waiting') {
        approvalArea.innerHTML = `
            <div class="approval-message">Waiting for admin approval...</div>
            <div class="loader"></div>
        `;
        firstMsgNotice.style.display = 'none';
    } else if (status === 'disconnected') {
        approvalArea.innerHTML = `
            <div class="error-message">Disconnected. Please refresh the page.</div>
        `;
    }
}

// Add this new function to handle the warning message
function showChatWarning() {
    const approvalArea = document.getElementById('approvalArea');
    const startChatMessage = document.querySelector('.start-chat-message');
    if (startChatMessage) {
        startChatMessage.textContent = "⚠️ Don't refresh the page or you'll be disconnected!";
        startChatMessage.style.color = "#dc3545";
    }
}

// Modify the sendMessage function to show warning after first message
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        if (!hasSentFirstMessage) {
            hasSentFirstMessage = true;
            localStorage.setItem('hasSentFirstMessage', 'true');
            document.getElementById('firstMsgNotice').style.display = 'none';
            updateConnectionStatus('waiting');
        }
        
        // Show warning after first message when connected
        if (socket.connected) {
            showChatWarning();
        }
        
        socket.emit('message', { message });
        messageInput.value = '';
    }
} 