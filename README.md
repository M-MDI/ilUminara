# RT-Forum

A real-time forum application with post management, messaging, and authentication features.

## 📝 Description

RT-Forum is a full-stack web application that allows users to create accounts, post content, interact with other users' posts through likes/dislikes and comments, and communicate with other users via a real-time chat system.

Built with Go for the backend and vanilla JavaScript for the frontend, this application showcases real-time features using WebSockets for instant messaging and notifications.

## ✨ Features

### User Management
- User registration and authentication
- User profiles
- Online status indicators

### Posts
- Create, view posts
- Like/dislike posts
- Filter posts by categories
- View posts by most liked

### Comments
- Add comments to posts
- View discussion threads

### Real-time Chat
- Private messaging between users
- Online/offline status indicators
- Typing indicators
- Message notifications
- Chat history

### Security
- Protected routes requiring authentication
- Secure password handling
- Session-based authentication

## 🚀 Technology Stack

### Backend
- Go (Golang)
- SQLite database
- WebSockets for real-time communication

### Frontend
- Vanilla JavaScript
- HTML/CSS
- WebSocket API

## 🛠️ Installation

### Prerequisites
- Go 1.16+
- SQLite

### Steps

1. Clone the repository:
```bash
git clone https://learn.zone01oujda.ma/git/mmoulabbi/real-time-forum.git
cd RT-Forum
```

2. Install dependencies:
```bash
go mod download
```

3. Run the application:
```bash
go run main.go
```

4. Access the application in your browser:
```
http://localhost:8080
```

## 📘 Usage

### Registration and Login
1. Create a new account or log in with existing credentials
2. Non-authenticated users cannot view any posts or content

### Posts
1. Click on "Create Post" to create a new post
2. Add title, content, and select categories
3. View posts in the home feed
4. Like or dislike posts by clicking the respective buttons
5. Click on a post to view and add comments

### Chat
1. Click on a user from the users list to start a chat
2. Type messages and press Enter or click the send button
3. Real-time notifications appear when you receive a new message

### Navigation
- Use Home button to return to the main feed
- Use My Liked Posts to view posts you've liked
- Use categories filter to view posts by category

