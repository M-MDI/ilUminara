package handler

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"RT-Forum/backend/forum"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Message struct {
	Type      string    `json:"type"` 
	Text      string    `json:"text"`
	Sender    string    `json:"sender"`
	Receiver  string    `json:"receiver"`
	IsTyping  bool      `json:"isTyping"`
	Timestamp time.Time `json:"timestamp"`
}

var clients = struct {
	sync.RWMutex
	m map[string][]*websocket.Conn
}{
	m: make(map[string][]*websocket.Conn),
}

// upgdare con to websocket
func WsEndpoint(res http.ResponseWriter, req *http.Request) {
	isloked, id, err := forum.IsLoggedIn(req, "token")
	if err != nil {
		forum.ErrorLog.Println(err)
		return
	}
	if !isloked {
		jsonResponse(res, http.StatusUnauthorized, "you need to login")
		return
	}

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(res, req, nil)
	if err != nil {
		forum.ErrorLog.Println(err)
		return
	}
	defer ws.Close()

	nekname, err := forum.GetUserById(id)
	if err != nil {
		forum.ErrorLog.Println(err)
		return
	}

	clients.Lock()
	clients.m[nekname] = append(clients.m[nekname], ws)
	clients.Unlock()
	UserStatusOnline(nekname, true)
	defer func() {
		if len(clients.m[nekname]) == 0 {
			UserStatusOnline(nekname, false)
		}
	}()

	reader(ws, nekname)
}


func reader(conn *websocket.Conn, sender string) {
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			clients.m[sender] = DeletElemnt(clients.m[sender], conn)
			return
		}
		msg.Sender = sender

		if msg.Type == "typing" {
			sendTypingNotification(sender, msg.Receiver, msg.IsTyping)
			continue
		}

		err = saveMessage(sender, msg)
		if err != nil {
			errws := map[string]interface{}{
				"type":    "error",
				"message": err.Error(),
			}
			forum.ErrorLog.Println(err)
			for _, con := range clients.m[sender] {
				con.WriteJSON(&errws)
			}
			return
		}

		clients.RLock()
		Allcon, ok := clients.m[msg.Receiver]
		clients.RUnlock()

		if ok {
			for _, con := range Allcon {
				if err = con.WriteJSON(msg); err != nil {
					return
				}
			}
		}

	}
}

func sendTypingNotification(sender, receiver string, isTyping bool) {
	notification := Message{
		Type:     "typing",
		Sender:   sender,
		Receiver: receiver,
		IsTyping: isTyping,
	}

	clients.RLock()
	receiverConns, ok := clients.m[receiver]
	clients.RUnlock()

	if ok {
		for _, con := range receiverConns {
			err := con.WriteJSON(notification)
			if err != nil {
				log.Println("Error sending typing notification:", err)
			}
		}
	}
}

func DeletElemnt(arrWs []*websocket.Conn, conn *websocket.Conn) []*websocket.Conn {
	var res []*websocket.Conn
	for _, con := range arrWs {
		if con != conn {
			res = append(res, con)
		}
	}
	return res
}

func UserStatusOnline(nickname string, isOnline bool) {
	statusMsg := map[string]interface{}{
		"type":      "user_status",
		"nickname":  nickname,
		"connected": isOnline,
	}

	clients.RLock()
	for _, conn := range clients.m {
		for _, con := range conn {
			err := con.WriteJSON(statusMsg)
			if err != nil {
				forum.ErrorLog.Println(err)
			}
		}
	}
	clients.RUnlock()
}

func saveMessage(sender string, msg Message) error {
	err := checkMessageIsValid(msg.Text, msg.Timestamp)
	if err != nil {
		return err
	}

	chatID, err := forum.GetChatID(sender, msg.Receiver, msg.Timestamp)
	if err != nil {
		return fmt.Errorf("get charID %v", err)
	}

	err = forum.UpdateLastTimeChat(chatID, msg.Timestamp)
	if err != nil {
		return fmt.Errorf("update last time %v", err)
	}

	err = forum.Insertmessage(chatID, sender, msg.Text, msg.Timestamp)
	if err != nil {
		return fmt.Errorf("insert message %v", err)
	}
	return nil
}

func checkMessageIsValid(msg string, timestamp time.Time) error {
	if msg == "" {
		return fmt.Errorf("empty data not valid")
	}
	if len(msg) > 1000 {
		return fmt.Errorf("data too long, max 160 characters")
	}

	return nil
}

func clearConn(name string) {
	clients.RLock()
	delete(clients.m, name)
	clients.RUnlock()
}
