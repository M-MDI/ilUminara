package handler

import (
	"encoding/json"
	"net/http"

	"RT-Forum/backend/forum"
)

type LastUser struct {
	User string `json:"lastuser"`
}
type User struct {
	Nickname  string `json:"nickname"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Online    bool   `json:"online"`
}


func GetUsersApi(res http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		jsonResponse(res, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}
	ok, _, err := forum.IsLoggedIn(req, "token")
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(res, http.StatusInternalServerError, "Something went wrong")
		return
	}
	if !ok {
		jsonResponse(res, http.StatusUnauthorized, "You must be login")
		return
	}
	var lastuser LastUser
	errdecode := json.NewDecoder(req.Body).Decode(&lastuser)
	if errdecode != nil {
		forum.ErrorLog.Println(errdecode)
		jsonResponse(res, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer req.Body.Close()

	rows, err := forum.GetUsers(lastuser.User)
	if err != nil {
		jsonResponse(res, http.StatusNotFound, "No user found")
		return
	}
	var user User
	var users []User
	for rows.Next() {
		err := rows.Scan(&user.Nickname, &user.Firstname, &user.Lastname)
		if err != nil {
			forum.ErrorLog.Println(err)
			jsonResponse(res, http.StatusInternalServerError, "Somthing went wrong")
			return
		}

		clients.RLock()
		arr, ok := clients.m[user.Nickname]
		user.Online = ok && len(arr) > 0
		clients.RUnlock()

		users = append(users, user)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(res, http.StatusInternalServerError, "Error with rows")
		return
	}
	jsonResponse(res, http.StatusOK, users)
}

func GetUserOrganizedlastMsgApi(res http.ResponseWriter, req *http.Request) {
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

	rows, err := forum.LastUsers(name)
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(res, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	defer rows.Close()

	var user User
	var users []User
	for rows.Next() {
		err := rows.Scan(&user.Nickname, &user.Firstname, &user.Lastname)
		if err != nil {
			forum.ErrorLog.Println(err)
			jsonResponse(res, http.StatusInternalServerError, "Error scanning rows")
			return
		}

		clients.RLock()
		arr, ok := clients.m[user.Nickname]
		if ok && len(arr) != 0 {
			user.Online = true
		} else {
			user.Online = false
		}
		clients.RUnlock()

		users = append(users, user)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(res, http.StatusInternalServerError, "Somthng went wrong")
		return
	}
	jsonResponse(res, http.StatusOK, users)
}
