package handler

import (
	"html"
	"net/http"
	"strconv"
	"time"

	"RT-Forum/backend/forum"
)

type Comment struct {
	ID             int    `json:"id"`
	Username       string `json:"user_name"`
	CommentContent string `json:"comment_content"`
	PostID         int    `json:"post_id"`
	CreatedAt      string `json:"created_at"`
	HasChange      int    `json:"hasChange"`
	Like           int    `json:"like"`
	Dislike        int    `json:"dislike"`
}

func Add_comment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	isLoged, user_id, err := forum.IsLoggedIn(r, "token")
	if err != nil{
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
	}
	if !isLoged {
		jsonResponse(w, http.StatusUnauthorized, "You need to log in")
		return
	}
	post_id := r.FormValue("post_id")
	content := r.FormValue("content")

	if len(content) >= 1100 || len(content) == 0 {
		jsonResponse(w, http.StatusBadRequest, "Size of comment is too large")
		return
	}


	if post_id == "" || content == "" {
		jsonResponse(w, http.StatusBadRequest, "Missing required fields")
		return
	}
   
	//check if post id exist
   var post int
	row, err := forum.SelectOneRow("SELECT id FROM post WHERE id = ?", post_id)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
		return
	}
	errpost := row.Scan(&post)
	if errpost != nil {
		jsonResponse(w, http.StatusBadRequest, "post id not exist")
		return
	}

	content = html.EscapeString(content)
	
	query := `INSERT INTO comment (post_id, user_id,comment_content,created_at,hasChange) VALUES(?, ?, ?, ?, 0)`
	_, errr := forum.ExecQuery(query, post_id, user_id, content, time.Now(), 0)
	if errr != nil {
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
		return
	}
	jsonResponse(w, http.StatusCreated, "comment created")
}

func Get_comments(w http.ResponseWriter, req *http.Request) {
	
	if req.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	
	post_id := req.URL.Query().Get("post_id")
	page := req.URL.Query().Get("page")
	if post_id == "" {
		jsonResponse(w, http.StatusBadRequest, "Something wrong")
		return
	}
	
	Page, err := strconv.Atoi(page)
	if err != nil || Page < 1 {
		jsonResponse(w, http.StatusBadRequest, "Something wrong")
		return
	}
	offset := (Page - 1) * 5
	query := `
        SELECT
    		cmt.id,
    		u.nickname,
    		cmt.comment_content,
			cmt.post_id,
    		cmt.created_at,
    		cmt.hasChange,
    		(SELECT count(*) FROM commentlike AS cmtl WHERE cmtl.like = 1 AND cmtl.comment_id = cmt.id) AS like,
    		(SELECT count(*) FROM commentlike AS cmtl WHERE cmtl.like = -1 AND cmtl.comment_id = cmt.id) AS dislike
		FROM
		    comment AS cmt
		    JOIN user AS u on cmt.user_id = u.id
		    JOIN post AS p on cmt.post_id = p.id

		WHERE p.id = ?

		ORDER BY cmt.created_at DESC

		LIMIT 5 OFFSET ?
`
	sqlrows, err := forum.SelectQuery(query, post_id, offset)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
		return
	}
	
	var comments []Comment
	for sqlrows.Next() {
		var comment Comment
		if err := sqlrows.Scan(
			&comment.ID,
			&comment.Username,
			&comment.CommentContent,
			&comment.PostID,
			&comment.CreatedAt,
			&comment.HasChange,
			&comment.Like,
			&comment.Dislike,
		); err != nil {
			jsonResponse(w, http.StatusInternalServerError, "Failed to process comments")
			return
		}
		comments = append(comments, comment)
	}

	jsonResponse(w, http.StatusOK, comments)
}
