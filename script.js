// --- Firebase Config (replace with your own if needed) ---
const firebaseConfig = {
  apiKey: "AIzaSyD_ZKST2-r4v5o4x1ryBbe8d_IWGZuSSt4",
  authDomain: "private-chatbox-f81f0.firebaseapp.com",
  databaseURL: "https://private-chatbox-f81f0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "private-chatbox-f81f0",
  storageBucket: "private-chatbox-f81f0.appspot.com",
  messagingSenderId: "105172308420",
  appId: "1:105172308420:web:15c95d7100ab87d7a21491"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- DOM Elements ---
const chatMessages = document.getElementById('chatMessages');
const userNameInput = document.getElementById('userName');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// --- Approval System ---
let waitingForApproval = false;
function isChatApproved() {
    return localStorage.getItem('chat_approved') === 'true';
}
function setChatApproved() {
    localStorage.setItem('chat_approved', 'true');
}
function updateApprovalUI() {
    const approvalArea = document.getElementById('approvalArea');
    const chatInput = document.querySelector('.chat-input');
    if (waitingForApproval && !isChatApproved()) {
        approvalArea.innerHTML = `
            <div class="approval-message">Waiting for admin approval. Please wait...</div>
            <div class="loader"></div>
            <div style="color:#888; font-size:0.98em; margin-top:2px;">Please wait 2-5 minutes for approval.</div>
        `;
        chatInput.style.pointerEvents = 'none';
        chatInput.style.opacity = '0.6';
    } else if (isChatApproved()) {
        approvalArea.innerHTML = `
            <div class="connected-message">Connected</div>
            <div class="start-chat-message">Start chat with Saim</div>
        `;
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.opacity = '1';
    } else {
        approvalArea.innerHTML = '';
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.opacity = '1';
    }
}

// --- On page load, check for approval link ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('approve') === '1') {
        setChatApproved();
        alert('Chat approved! You can now chat with the user.');
    }
    updateApprovalUI();
    listenForMessages();
});

// --- Add message to chat UI ---
function addMessageToUI(userName, message, time, isOwn) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    messageInfo.textContent = `${userName} - ${time}`;
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageInfo);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Listen for new messages in Firebase ---
function listenForMessages() {
    chatMessages.innerHTML = '';
    db.ref('messages').on('child_added', (snapshot) => {
        const data = snapshot.val();
        const currentUser = userNameInput.value.trim();
        addMessageToUI(data.userName, data.message, data.time, data.userName === currentUser);
    });
}

// --- Send message to Firebase ---
function sendMessageToFirebase(userName, message) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    db.ref('messages').push({
        userName,
        message,
        time
    });
}

// --- EmailJS Notification Function ---
async function sendEmailNotification(userName, message) {
    try {
        const now = new Date();
        const time = now.toLocaleString();
        const templateParams = {
            name: userName,
            message: message,
            time: time
        };
        await emailjs.send(
            'Portfolio Contact',         // Service ID
            'template_pb5m8b7',          // Template ID
            templateParams,
            'RUpvCIMdUC_m5up3C'          // Public Key
        );
        // Optionally: alert('Approval email sent!');
    } catch (error) {
        alert('Failed to send approval email!');
        console.error(error);
    }
}

// --- Handle Send Message ---
function handleSendMessage() {
    const userName = userNameInput.value.trim();
    const message = messageInput.value.trim();

    if (!userName || !message) {
        alert('Please enter both your name and message');
        return;
    }

    // If not approved and not already waiting, trigger approval UI and email
    if (!isChatApproved() && !waitingForApproval) {
        waitingForApproval = true;
        updateApprovalUI();
        sendEmailNotification(userName, message); // <-- send approval email instantly
        return;
    }
    // If still not approved, block further sends
    if (!isChatApproved()) {
        alert('Admin approval required to start chat.');
        return;
    }

    // Send message to Firebase
    sendMessageToFirebase(userName, message);

    // Clear message input
    messageInput.value = '';
}

// --- Event Listeners ---
sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
function updateSendButtonState() {
    const userName = userNameInput.value.trim();
    const message = messageInput.value.trim();
    sendButton.disabled = !userName || !message;
}
userNameInput.addEventListener('input', updateSendButtonState);
messageInput.addEventListener('input', updateSendButtonState);
updateSendButtonState(); 