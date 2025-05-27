const usrsContenar = document.getElementById("users_contenar");
let socket;
let isMoerUsers = true;

window.lastSelect = window.lastSelect || null;

function msessagesWS() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket("/ws");

  socket.onopen = () => {
    console.log("successfully connected");
  };
  
  socket.onclose = () => {
    setTimeout(msessagesWS, 3000);
  };

  socket.onerror = () => {
    console.error("WebSocket error");
    createAlert("alert-danger", "WebSocket error");
  };

  socket.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    switch (data.type) {
      case "typing":
        if (data.isTyping) {
            showTypingIndicator(data.sender);
        }
        break;
      case "error":
        createAlert("alert-danger", data.message);
        break;
      case "user_status":
        displayOnline(data);
        break;
      default:
        handleChatMessage(data);
        break;
    }
  };
}

function handleChatMessage(data) {
  if (data.sender === userOpenChat) {
    addMessageInChat(data);
  } else {
    createAlert("alert-info", `${data.sender}: ${data.text}`);
    addNotifNumber(data.sender);
  }
}

let loop = {};
async function showTypingIndicator(user) {

  const chatContainer = document.getElementById(`contaner_${user}`)
  if (!chatContainer) return;
  
  let typing = chatContainer.querySelector("#typinggg");
  if (!typing) return;
  
  typing.classList.remove("none");

  if (loop[user]) {
    clearTimeout(loop[user]);
  }

  loop[user] = setTimeout(() => {
    typing.classList.add("none");
  }, 1000);

}

// TYPING===============*************************

async function sendMessage(btn) {
  try {
    const { state } = await window.checkIfLoggedIn();
    if (!state) {
      createAlert("alert-danger", "You need to login!");
      return;
    }

    const messageInput = document.getElementById("messageInput");
    const name = btn.getAttribute("sendto");
    
    if (!name) {
      createAlert("alert-danger", "Please select a user");
      return;
    }
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    if (message.length > 160) {
      createAlert("alert-danger", "Message too long (max 160 characters)");
      return;
    }

    socket.send(
      JSON.stringify({
        text: message,
        receiver: name,
        timestamp: new Date(),
      })
    );

    sendTypingNotification(name, false);
    addMyMessage(message);
    updateUserOrder(name);
    messageInput.value = "";
    
  } catch (err) {
    createAlert("alert-danger", "Failed to send message");
    console.error(err);
  }
}

function updateUserOrder(name) {
  const contanerUser = document.getElementById(`contaner_${name}`);
  if (!contanerUser) return;

  const isOnline = contanerUser.classList.contains('online-user');
  const newUser = document.createElement("div");
  newUser.id = `contaner_${name}`;
  newUser.classList.add("messageProfile");
  if (isOnline) {
    newUser.classList.add("online-user");
  } else {
    newUser.classList.add("offline-user");
  }
  newUser.classList.add("selectUser");
  newUser.setAttribute("onclick", "clickusers(this)");
  newUser.innerHTML = contanerUser.innerHTML;
  
  // Find the appropriate section header
  const header = isOnline ? 
    Array.from(document.querySelectorAll('.users-section-header')).find(h => h.textContent === 'Online Users') :
    Array.from(document.querySelectorAll('.users-section-header')).find(h => h.textContent === 'Offline Users');
    
  if (header) {
    // Since a message was just sent/received, move the user to the top of their section
    const section = isOnline ? 
      document.querySelector('.online-users-section') :
      document.querySelector('.offline-users-section');
    
    if (section) {
      // Insert at the top of the section
      if (section.firstChild) {
        section.insertBefore(newUser, section.firstChild);
      } else {
        section.appendChild(newUser);
      }
    }
  } else {
    // If no header exists yet, create one and add the user
    const header = document.createElement("div");
    header.className = "users-section-header";
    header.textContent = isOnline ? "Online Users" : "Offline Users";
    const section = document.createElement("div");
    section.className = isOnline ? "online-users-section" : "offline-users-section";
    section.appendChild(newUser);
    
    if (isOnline) {
      usrsContenar.insertBefore(header, usrsContenar.firstChild);
      usrsContenar.insertBefore(section, header.nextSibling);
    } else {
      usrsContenar.appendChild(header);
      usrsContenar.appendChild(section);
    }
  }

  window.lastSelect = newUser.id;
  contanerUser.remove();
}

function sendTypingNotification(receiver, isTyping) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({
      type: "typing",
      receiver: receiver,
      isTyping: isTyping,  // Add isTyping status
      timestamp: new Date()
    })
  );
}

document.getElementById("messageInput").addEventListener("input", function () {
  const receiver = document.querySelector("[sendto]")?.getAttribute("sendto");
  if (!receiver) return;

  //Send "typing" status
  sendTypingNotification(receiver, true);
});

// Add Enter key handler
document.getElementById("messageInput").addEventListener("keypress", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    const sendButton = document.getElementById("sendBtn");
    if (sendButton) {
      sendMessage(sendButton);
    }
  }
});

// *******************************************************************************************


function closeWS() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
}
function end(txt) {
  return `<div class="txt">${txt}</div>`
}

function processUserData(data, first) {
  // For empty or invalid data, only show no more users when getting additional users
  if (!data || !Array.isArray(data)) {
    isMoerUsers = false;
    return first ? end("Waiting for users to connect...") : "";
  }

  // Filter out current user from the data
  data = data.filter(usr => usr.nickname !== window.username);
  
  if (data.length === 0) {
    isMoerUsers = false;
    return first ? end("Waiting for users to connect...") : "";
  }

  const { onlineUsers, offlineUsers } = sortUsersByStatus(data);
  return renderUserSections(onlineUsers, offlineUsers, first);
}

function sortUsersByStatus(users) {
  const onlineUsers = [];
  const offlineUsers = [];
  
  // First sort all users by nickname case-insensitive
  users.sort((a, b) => a.nickname.toLowerCase().localeCompare(b.nickname.toLowerCase()));
  
  for (let usr of users) {
    // Check if there's an existing element to determine true online status
    const existingUser = document.getElementById(`contaner_${usr.nickname}`);
    const isOnline = existingUser ? 
      existingUser.classList.contains('online-user') : 
      usr.online || usr.connected;

    if (usr.nickname !== window.username) {
      if (isOnline) {
        usr.online = true;  // Ensure template gets correct status
        onlineUsers.push(usertemplate(usr));
      } else {
        usr.online = false;  // Ensure template gets correct status
        offlineUsers.push(usertemplate(usr));
      }
    }
  }
  
  return { onlineUsers, offlineUsers };
}

function renderUserSections(onlineUsers, offlineUsers, first) {
  if (first) {
    let sections = [];
    
    // Create online users section if there are online users
    if (onlineUsers.length > 0) {
      sections.push('<div class="users-section-header">Online Users</div>');
      sections.push('<div class="online-users-section">');
      sections.push(onlineUsers.join(''));
      sections.push('</div>');
    }
    
    // Create offline users section if there are offline users
    if (offlineUsers.length > 0) {
      sections.push('<div class="users-section-header">Offline Users</div>');
      sections.push('<div class="offline-users-section">');
      sections.push(offlineUsers.join(''));
      sections.push('</div>');
    }
    
    return sections.join('');
  }
  
  // For infinite scroll/updates, just append the users
  return onlineUsers.join('') + offlineUsers.join('');
}

async function getusers(first) {
  if (!isMoerUsers) return;

  try {
    const lastuser = getLastUserId();
    const response = await fetchUsers(lastuser);
    const data = await response.json();
    
    const html = processUserData(data, first);
    if (first) {
      usrsContenar.innerHTML = html;
    } else {
      usrsContenar.innerHTML += html;
    }
  } catch (err) {
    createAlert("alert-danger", "Failed to get users");
    console.error(err);
  }
}

function getLastUserId() {
  const users = document.querySelectorAll('.messageImg');
  if (users.length === 0) return "";
  return users[users.length - 1].id.slice(5);
}

async function fetchUsers(lastuser) {
  const response = await fetch("/api/getUsers", {
    method: "POST",
    body: JSON.stringify({ lastuser }),
  });

  if (!response.ok) {
    dangerError(response.status);
    throw new Error("Failed to fetch users");
  }

  return response;
}

function usertemplate(usr) {
  let clas = "messageImg";
  if (usr.online) {
    clas += " greenOnline";
  }

  return `<div id="contaner_${usr.nickname}" class="messageProfile ${usr.online ? 'online-user' : 'offline-user'}" onclick="clickusers(this)">
            <img id="user_${usr.nickname}" class="${clas}" src="/public/img/default.avif" alt="">
            <div class="names">           
                <h3>${usr.nickname}</h3>
                <p>${usr.firstname || ''} ${usr.lastname || ''}</p>
            </div>
            <div class="notification-badge" id="label_${usr.nickname}"></div>
            <div id="typinggg" class="none">
                <span>${usr.nickname} is typing</span>
                <div class="loading">
                    <div></div>
                    <div></div>
                </div>
            </div>
        </div>`;
}

function displayOnline(usr) {
  const usrImg = document.getElementById("user_" + usr.nickname);
  const container = document.getElementById("contaner_" + usr.nickname);
  
  if (!usrImg || !container) return;

  const wasOnline = container.classList.contains("online-user");
  const nowOnline = usr.connected;

  // Only proceed if status actually changed
  if (wasOnline === nowOnline) return;

  if (nowOnline) {
    usrImg.classList.add("greenOnline");
    container.classList.remove("offline-user");
    container.classList.add("online-user");
    
    // Find online section or create it
    let onlineSection = document.querySelector('.online-users-section');
    let onlineHeader = Array.from(document.querySelectorAll('.users-section-header'))
      .find(header => header.textContent === "Online Users");
    
    if (!onlineHeader) {
      onlineHeader = document.createElement("div");
      onlineHeader.className = "users-section-header";
      onlineHeader.textContent = "Online Users";
      usrsContenar.insertBefore(onlineHeader, usrsContenar.firstChild);
      
      onlineSection = document.createElement("div");
      onlineSection.className = "online-users-section";
      onlineHeader.after(onlineSection);
    } else if (!onlineSection) {
      onlineSection = document.createElement("div");
      onlineSection.className = "online-users-section";
      onlineHeader.after(onlineSection);
    }

    // Move user to online section while maintaining their position in chat order
    const existingUsers = Array.from(onlineSection.children);
    if (existingUsers.length === 0) {
      onlineSection.appendChild(container);
    } else {
      // Find where to insert based on existing order
      const referenceUser = existingUsers.find(el => 
        el.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (referenceUser) {
        referenceUser.before(container);
      } else {
        onlineSection.appendChild(container);
      }
    }
  } else {
    usrImg.classList.remove("greenOnline");
    container.classList.remove("online-user");
    container.classList.add("offline-user");
    
    // Find offline section or create it
    let offlineSection = document.querySelector('.offline-users-section');
    let offlineHeader = Array.from(document.querySelectorAll('.users-section-header'))
      .find(header => header.textContent === "Offline Users");
    
    if (!offlineHeader) {
      offlineHeader = document.createElement("div");
      offlineHeader.className = "users-section-header";
      offlineHeader.textContent = "Offline Users";
      usrsContenar.appendChild(offlineHeader);
      
      offlineSection = document.createElement("div");
      offlineSection.className = "offline-users-section";
      offlineHeader.after(offlineSection);
    } else if (!offlineSection) {
      offlineSection = document.createElement("div");
      offlineSection.className = "offline-users-section";
      offlineHeader.after(offlineSection);
    }
    
    // Move user to offline section while maintaining their position in chat order
    const existingUsers = Array.from(offlineSection.children);
    if (existingUsers.length === 0) {
      offlineSection.appendChild(container);
    } else {
      // Find where to insert based on existing order
      const referenceUser = existingUsers.find(el => 
        el.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (referenceUser) {
        referenceUser.before(container);
      } else {
        offlineSection.appendChild(container);
      }
    }
  }
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const usersContenar = document.getElementById("users_contenar");

const usersScroll = debounce(async () => {
  const { scrollTop, scrollHeight, clientHeight } = usersContenar;
  if (scrollTop + clientHeight >= scrollHeight - 10) {
    await getusers();
  }
}, 200);
usersContenar.addEventListener('scroll', usersScroll)



async function lastUsersChat() {
  try {
    const response = await fetch('/api/lastUsersChat', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      dangerError(response.status);
      throw new Error("Failed to fetch users");
    }

    const data = await response.json();
    
    // Reset isMoerUsers since this is a fresh load
    isMoerUsers = true;
    
    if (!data || !Array.isArray(data)) {
      usrsContenar.innerHTML = end("Waiting for users to connect...");
      return;
    }

    // Filter out current user from the data
    const filteredData = data.filter(usr => usr.nickname !== window.username);
    
    if (filteredData.length === 0) {
      usrsContenar.innerHTML = end("Waiting for users to connect...");
      return;
    }

    // On first load with no chat history, sort alphabetically
    if (!hasAnyChatHistory()) {
      const { onlineUsers, offlineUsers } = sortUsersByStatus(filteredData);
      const html = renderUserSections(onlineUsers, offlineUsers, true);
      if (html) {
        usrsContenar.innerHTML = html;
      } else {
        usrsContenar.innerHTML = end("Waiting for users to connect...");
      }
    } else {
      // With chat history, preserve the order from the backend (sorted by last message)
      const sections = [];
      const online = filteredData.filter(usr => usr.online);
      const offline = filteredData.filter(usr => !usr.online);

      if (online.length > 0) {
        sections.push('<div class="users-section-header">Online Users</div>');
        sections.push('<div class="online-users-section">');
        sections.push(online.map(usr => usertemplate(usr)).join(''));
        sections.push('</div>');
      }
      
      if (offline.length > 0) {
        sections.push('<div class="users-section-header">Offline Users</div>');
        sections.push('<div class="offline-users-section">');
        sections.push(offline.map(usr => usertemplate(usr)).join(''));
        sections.push('</div>');
      }
      
      usrsContenar.innerHTML = sections.join('');
    }
  } catch (error) {
    createAlert("alert-danger", "Failed to get last users");
    console.error(error);
  }
}

// Helper function to check if there's any chat history
function hasAnyChatHistory() {
  const msgElements = document.querySelectorAll('.msgNameText');
  return msgElements.length > 0;
}

let isMoreMessages = true;
let lastUserClick = "";
let userOpenChat = null
let lastSelect = null;


const chat = document.getElementById("chat");
const sendBtn = document.getElementById("sendBtn");
const container = document.querySelector(".container");
const chatBtnInput = document.getElementById("chatbtninput");

async function getMessages(user, newuser) {
    if (!isMoreMessages) return;

    let lastMsg = "";
    const msgNameText = document.querySelectorAll(".msgNameText");
    const sendTo = sendBtn.getAttribute("sendto");

    if (!user) {
        user = sendTo;
    }

    if (msgNameText.length > 0 && !newuser) {
        lastMsg = msgNameText[0].children[2].dataset.date;
    }
    try {
        const response = await fetch("/api/getMessages", {
            method: "POST",
            body: JSON.stringify({ chatuser: user, lastMessage: lastMsg }),
        });

        if (response.status === 412) {
            isMoreMessages = false;
            return null;
        }

        if (!response.ok) {
            dangerError(response.status);
            throw new Error("Failed to fetch messages");
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            isMoreMessages = false;
            return null;
        }
        return data;
    } catch (err) {
        createAlert("Failed to get messages");
        return null;
    }
}

function chattemplate(msg, right = "") {
    return Addchattemplate({
        sender: msg.send,
        text: msg.Message,
        timestamp: msg.timeSend
    }, right);
}

function Addchattemplate(msg, right = "") {
    return `
        <div class="msgNameText ${right}">
            <p>${msg.sender}</p>
            <h3>${msg.text}</h3>
            <p data-date="${msg.timestamp}">${new Date(msg.timestamp).toLocaleString()}</p>
        </div>
    `;
}

function addNotifNumber(nickname) {
    let notifications = JSON.parse(localStorage.getItem('chatNotifications') || '{}');
    notifications[nickname] = (parseInt(notifications[nickname] || '0') + 1);
    localStorage.setItem('chatNotifications', JSON.stringify(notifications));
    
    let lbl = document.getElementById(`label_${nickname}`);
    if (lbl) lbl.textContent = notifications[nickname].toString();
}

function clearNotifications(nickname) {
    let notifications = JSON.parse(localStorage.getItem('chatNotifications') || '{}');
    delete notifications[nickname];
    localStorage.setItem('chatNotifications', JSON.stringify(notifications));
    
    const notifBadge = document.getElementById(`label_${nickname}`);
    if (notifBadge) notifBadge.textContent = "";
}

function restoreNotifications() {
    const notifications = JSON.parse(localStorage.getItem('chatNotifications') || '{}');
    Object.entries(notifications).forEach(([nickname, count]) => {
        const badge = document.getElementById(`label_${nickname}`);
        if (badge) {
            badge.textContent = count.toString();
            if (count > 0) {
                badge.classList.add('active');
            }
        }
    });
}

// Add this function to clear notifications on logout
function clearAllNotifications() {
    localStorage.removeItem('chatNotifications');
    document.querySelectorAll('.notification-badge').forEach(badge => {
        badge.textContent = "";
        badge.classList.remove('active');
    });
}

function addMessageInChat(msg) {
    const msgElement = document.createElement('div');
    msgElement.innerHTML = chattemplate({ 
        send: msg.sender,
        Message: msg.text,
        timeSend: msg.timestamp
    }, msg.sender === window.username ? "directionRight" : "");
    chat.appendChild(msgElement);
    chat.scrollTop = chat.scrollHeight;
}

function addMyMessage(textmsg) {
    const msgElement = document.createElement('div');
    msgElement.innerHTML = chattemplate({ 
        send: window.username,
        Message: textmsg,
        timeSend: new Date()
    }, "directionRight");
    chat.appendChild(msgElement);
    chat.scrollTop = chat.scrollHeight;
}

function CloseChat() {
    document.getElementById(lastSelect)?.classList.remove('selectUser')
    lastSelect = null
    lastUserClick = ""
    userOpenChat = null
    sendBtn.setAttribute("sendto", "");
    container.classList.remove("openchat");
    chat.classList.add("none");
    chatBtnInput.classList.add("none");
    chatBtnInput.style.right = ""; // Reset position
}

function openchat(data, isNewUser = false) {
    if (isNewUser) {
        chat.innerHTML = "";
        isMoreMessages = true;
    }
    container.classList.add("openchat");
    chat.classList.remove("none");
    chatBtnInput.classList.remove("none");
    chatBtnInput.style.right = "20px"; // Add some spacing from the right edge

    // Update chat title
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
        chatTitle.textContent = userOpenChat;
    }

    if (data === "First chat" || data === "No more message") {
        chat.innerHTML = end(data);
        return;
    }

    let innerChat = "";
    // Since messages come in DESC order from backend, reverse them for display
    const messages = [...data].reverse();
    
    // Display messages in chronological order (oldest first)
    for (let msg of messages) {
        const isCurrentUser = msg.send === window.username;
        innerChat += chattemplate(msg, isCurrentUser ? "directionRight" : "");
    }

    if (isNewUser) {
        chat.innerHTML = innerChat;
        chat.scrollTop = chat.scrollHeight;
    } else {
        // For loading older messages, don't reverse since we want them at the top
        innerChat = "";
        for (let msg of data) {
            const isCurrentUser = msg.send === window.username;
            innerChat += chattemplate(msg, isCurrentUser ? "directionRight" : "");
        }
        chat.insertAdjacentHTML("afterbegin", innerChat);
    }
}

async function clickusers(userElement) {    
    if (lastSelect) {
        document.getElementById(lastSelect).classList.remove('selectUser')
    }
    userElement.classList.add("selectUser")
    lastSelect = userElement.id

    const name = userElement.querySelector("h3").textContent;
    userOpenChat = name;
    
    // Clear notifications when opening chat
    clearNotifications(name);
    const notifBadge = userElement.querySelector(".notification-badge");
    if (notifBadge) notifBadge.textContent = "";

    if (name === lastUserClick) return;
    lastUserClick = name;

    sendBtn.setAttribute("sendto", name);
    isMoreMessages = true;

    let data = await getMessages(name, true);
    if (!data || !Array.isArray(data) || data.length === 0) {
        // No messages yet, show empty chat message
        openchat("First chat", true);
        return;
    }

    openchat(data, true);
}

const chatScroll = debounce(async () => {
    if (!isMoreMessages) return;

    const { scrollTop } = chat;
    // Load more messages when user scrolls near the top
    if (scrollTop < 50) {
        let data = await getMessages();
        if (!data) {
            isMoreMessages = false;
            chat.insertAdjacentHTML("afterbegin", end("No more messages"));
            return;
        }
        
        let innerChat = "";
        // Display older messages at the top
        for (let msg of data) {
            const isCurrentUser = msg.send === window.username;
            innerChat += chattemplate(msg, isCurrentUser ? "directionRight" : "");
        }
        
        // Store current scroll position and height
        const previousHeight = chat.scrollHeight;
        const previousScroll = chat.scrollTop;
        
        // Add older messages at the top
        chat.insertAdjacentHTML("afterbegin", innerChat);
        
        // Maintain scroll position
        chat.scrollTop = chat.scrollHeight - previousHeight + previousScroll;
    }
}, 200);

chat.addEventListener("scroll", chatScroll);

// Add event listener to restore notifications after page load
window.addEventListener('load', () => {
    setTimeout(restoreNotifications, 500); // Small delay to ensure user list is loaded
});