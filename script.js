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
let isAdmin = false;
let currentUserName = '';
let currentUserId = '';
let approvedListener = null;

function getOrCreateUserId() {
    let userId = localStorage.getItem('chat_user_id');
    if (!userId) {
        userId = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        localStorage.setItem('chat_user_id', userId);
    }
    return userId;
}

function isChatApproved() {
    return localStorage.getItem('chat_approved') === 'true';
}
function setChatApproved() {
    localStorage.setItem('chat_approved', 'true');
}
function clearChatApproved() {
    localStorage.removeItem('chat_approved');
}

function updateApprovalUI() {
    const approvalArea = document.getElementById('approvalArea');
    const chatInput = document.querySelector('.chat-input');
    if (!isChatApproved() && !isAdmin && waitingForApproval) {
        approvalArea.innerHTML = `
            <div class="approval-message">Waiting for admin approval. Please wait...</div>
            <div class="loader"></div>
            <div style="color:#888; font-size:0.98em; margin-top:2px;">Please wait 2-5 minutes for approval.</div>
        `;
        chatInput.style.pointerEvents = 'none';
        chatInput.style.opacity = '0.6';
    } else if (isChatApproved() || isAdmin) {
        let html = `<div class="connected-message">Connected</div>`;
        if (!isAdmin && isChatApproved()) {
            html += `<div class="start-chat-message">Start chat with Saim</div>`;
        }
        approvalArea.innerHTML = html;
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.opacity = '1';
    } else {
        approvalArea.innerHTML = '';
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.opacity = '1';
    }
}

// --- On page load, check for approval link and listen for approval in Firebase ---
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentUserId = getOrCreateUserId();
    if (params.get('admin') === '1') {
        isAdmin = true;
        setChatApproved();
        currentUserName = 'Admin';
        userNameInput.value = currentUserName;
        userNameInput.style.display = 'none';
    } else {
        const savedName = localStorage.getItem('chat_user_name');
        if (savedName) {
            currentUserName = savedName;
            userNameInput.value = currentUserName;
            userNameInput.style.display = 'none';
        }
        // Always listen for approval after name is set
        listenForApproval(currentUserId);
    }
    if (params.get('approve') === '1' && params.get('userId')) {
        db.ref(`approval/${params.get('userId')}`).set({ approved: true });
        setChatApproved();
    }
    updateApprovalUI();
    listenForMessages();
});

function listenForApproval(userId) {
    if (approvedListener) approvedListener.off();
    approvedListener = db.ref(`approval/${userId}/approved`);
    approvedListener.on('value', (snapshot) => {
        const approved = snapshot.val();
        console.log("Approval changed for userId:", userId, approved);
        if (approved === true) {
            setChatApproved();
            updateApprovalUI();
        } else {
            clearChatApproved();
            updateApprovalUI();
        }
    });
}

// --- Add message to chat UI ---
function addMessageToUI(userName, message, time) {
    const isOwn = (userName === currentUserName);
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
        addMessageToUI(data.userName, data.message, data.time);

        // If user is waiting for approval and receives a message from Admin, connect!
        if (!isAdmin && !isChatApproved() && data.userName === 'Admin') {
            setChatApproved();
            updateApprovalUI();
        }
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
    // --- NEW: If admin sends a message and approval is not set, set approval for the user ---
    if (isAdmin && message && userName === 'Admin' && currentUserId) {
        // Find the userId from the URL (for admin)
        const params = new URLSearchParams(window.location.search);
        const approvedUserId = params.get('userId');
        if (approvedUserId) {
            db.ref(`approval/${approvedUserId}`).set({ approved: true });
        }
    }
}

// --- EmailJS Notification Function ---
async function sendEmailNotification(userName, message, userId) {
    try {
        const now = new Date();
        const time = now.toLocaleString();
        const templateParams = {
            name: userName,
            message: message,
            time: time,
            userId: userId
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
    let userName = currentUserName;
    const message = messageInput.value.trim();

    if (!userName) {
        userName = userNameInput.value.trim();
        if (!userName) {
            alert('Please enter your name');
            return;
        }
        currentUserName = userName;
        localStorage.setItem('chat_user_name', userName);
        userNameInput.style.display = 'none';
        listenForApproval(currentUserId);
    }

    if (!message) {
        alert('Please enter your message');
        return;
    }

    if (!isChatApproved() && !isAdmin && !waitingForApproval) {
        waitingForApproval = true;
        updateApprovalUI();
        // Store user in Firebase (optional, for admin dashboard)
        db.ref(`users/${currentUserId}`).set({ name: userName, requestedAt: Date.now() });
        // Set approval to false for this user
        db.ref(`approval/${currentUserId}`).set({ approved: false });
        sendEmailNotification(userName, message, currentUserId);
        listenForApproval(currentUserId);
        return;
    }
    if (!isChatApproved() && !isAdmin) {
        alert('Admin approval required to start chat.');
        return;
    }

    sendMessageToFirebase(userName, message);
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