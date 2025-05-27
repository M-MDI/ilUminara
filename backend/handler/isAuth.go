package handler

import (
	"RT-Forum/backend/forum"
	"net/http"
)

func IsLoggedInHandler(w http.ResponseWriter, r *http.Request) {
	ok, userID,errlogin := forum.IsLoggedIn(r, "token")
	if errlogin != nil{
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
	}

	if !ok {
		jsonResponse(w, http.StatusOK, nil)
		return
	}

	var username string
	
	row, err := forum.SelectOneRow("SELECT nickname FROM user WHERE id = ?", userID)
	err2 := row.Scan(&username)
	if err != nil || err2 != nil {
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	
	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"loggedIn": true,
		"username": username,
	})
}
