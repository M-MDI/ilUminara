package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"RT-Forum/backend/forum"
)

type ChatUser struct {
	User        string `json:"chatuser"`
	LastMessage string `json:"lastMessage"`
}

type GetMsg struct {
	Send     string `json:"send"`
	Message  string `json:"Message"`
	TimeSend string `json:"timeSend"`
}
// get messages by 10 check time of last message
func GetMessages(res http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		jsonResponse(res, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}

	ok, id, err := forum.IsLoggedIn(req, "token")
	if err != nil {
		forum.ErrorLog.Println("IsLoggedIn error:", err)
		jsonResponse(res, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	if !ok {
		jsonResponse(res, http.StatusUnauthorized, "You must be logged in")
		return
	}

	name, err := forum.GetUserById(id)
	if err != nil {
		forum.ErrorLog.Println("GetUserById error:", err)
		jsonResponse(res, http.StatusInternalServerError, "User not found")
		return
	}

	var chatuser ChatUser
	err = json.NewDecoder(req.Body).Decode(&chatuser)
	if err != nil {
		forum.ErrorLog.Println("JSON decode error:", err)
		jsonResponse(res, http.StatusInternalServerError, "Failed to decode request body")
		return
	}
	defer req.Body.Close()

	rows, err := forum.GetChatMessages(name, chatuser.User, chatuser.LastMessage)
	if err != nil {
		if err == sql.ErrNoRows {
			// forum.ErrorLog.Println("Row scan error:", err)
			jsonResponse(res, http.StatusOK, "")
			return
		}
		forum.ErrorLog.Println("GetChatMessages error:", err)
		jsonResponse(res, http.StatusInternalServerError, "Failed to retrieve messages")
		return
	}
	defer rows.Close()

	var msg GetMsg
	var allMsg []GetMsg
	for rows.Next() {
		err := rows.Scan(&msg.Send, &msg.Message, &msg.TimeSend)
		if err != nil {
			forum.ErrorLog.Println("Row scan error:", err)
			jsonResponse(res, http.StatusInternalServerError, "Failed to scan message row")
			return
		}
		allMsg = append(allMsg, msg)
	}

	if err = rows.Err(); err != nil {
		forum.ErrorLog.Println("Rows iteration error:", err)
		jsonResponse(res, http.StatusInternalServerError, "Error during message retrieval")
		return
	}

	jsonResponse(res, http.StatusOK, allMsg)
}
