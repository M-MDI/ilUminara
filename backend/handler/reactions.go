package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"RT-Forum/backend/forum"
)

type Like struct {
	ID        int `json:"id"`
	ItemID    int `json:"item_id"`
	LikeValue int `json:"like"`
}

func Reactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}

	ok, userID, err := forum.IsLoggedIn(r, "token")
	if err != nil {
		forum.LogError("Login check failed", err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	if !ok {
		jsonResponse(w, http.StatusUnauthorized, "You must be logged in")
		return
	}

	itemID, err := strconv.Atoi(r.FormValue("item_id"))
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	statuslike, err := strconv.Atoi(r.FormValue("status_like"))
	if err != nil || statuslike < -1 || statuslike > 1 {
		jsonResponse(w, http.StatusBadRequest, "Invalid like status")
		return
	}

	itemType := r.FormValue("item_type")
	if itemType != "comment" && itemType != "post" {
		itemType = "post"
	}

	var likeErr error
	if itemType == "comment" {
		likeErr = forum.LikeComment(itemID, userID, statuslike)
	} else {
		likeErr = forum.LikePost(itemID, userID, statuslike)
	}

	if likeErr != nil {
		forum.LogError(fmt.Sprintf("Like operation failed for %s ID %d", itemType, itemID), likeErr)
		jsonResponse(w, http.StatusInternalServerError, "Failed to update like status")
		return
	}

	jsonResponse(w, http.StatusOK, fmt.Sprintf("%s like updated successfully", itemType))
}

func CheckIfUserLike(w http.ResponseWriter, r *http.Request, itemType string) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}

	ok, userID, err := forum.IsLoggedIn(r, "token")
	if err != nil {
		forum.LogError("Login check failed", err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	if !ok {
		jsonResponse(w, http.StatusUnauthorized, "You must be logged in")
		return
	}

	var itemID int
	var err2 error

	if itemType == "post" {
		itemID, err2 = strconv.Atoi(r.FormValue("post_id"))
	} else if itemType == "comment" {
		itemID, err2 = strconv.Atoi(r.FormValue("comment_id"))
	} else {
		jsonResponse(w, http.StatusBadRequest, "Invalid item type")
		return
	}

	if err2 != nil {
		jsonResponse(w, http.StatusBadRequest, "Invalid ID")
		return
	}

	tableName := ""
	itemIDKey := ""
	likeColumn := ""

	if itemType == "post" {
		tableName = "post_likes"
		itemIDKey = "post_id"
		likeColumn = "like_value"
	} else if itemType == "comment" {
		tableName = "commentlike"
		itemIDKey = "comment_id"
		likeColumn = "like"
	}

	query := fmt.Sprintf("SELECT id, %s, %s FROM %s WHERE %s = ? AND user_id = ?",
		itemIDKey, likeColumn, tableName, itemIDKey)

	row, err := forum.SelectOneRow(query, itemID, userID)
	if err != nil {
		forum.LogError("Database query failed", err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	var like Like
	err = row.Scan(&like.ID, &like.ItemID, &like.LikeValue)
	if err != nil {
		jsonResponse(w, http.StatusOK, nil)
		return
	}

	jsonResponse(w, http.StatusOK, like)
}
