package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"RT-Forum/backend/forum"
)


func CreatePostHandlerApi(res http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		jsonResponse(res, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	flag, userID, errlogin := forum.IsLoggedIn(req, "token")
	if errlogin != nil {
		jsonResponse(res, http.StatusInternalServerError, "Something wrong")
		return
	}
	if !flag {
		jsonResponse(res, http.StatusUnauthorized, "You need to login")
		return
	}

	title := req.FormValue("title")
	content := req.FormValue("content")
	category := req.FormValue("category")

	var categories []string
	if category != "" {
		err := json.Unmarshal([]byte(category), &categories)
		if err != nil {
			jsonResponse(res, http.StatusInternalServerError, "JSON Unmarshal error")
			return
		}
	}

	if len(title) >= 200 || len(content) >= 2500 {
		jsonResponse(res, http.StatusBadRequest, "Size of title or content is too large")
		return
	}

	err := forum.InsertPost(strconv.Itoa(userID), title, content, time.Now(), categories)
	if err != nil {
		if err.Error() == "categoryNotFound" {
			jsonResponse(res, http.StatusBadRequest, "Invalid request body")
			return
		}
		jsonResponse(res, http.StatusInternalServerError, "Error add post")
		return
	}

	jsonResponse(res, http.StatusOK, "Post created successfully")
}
