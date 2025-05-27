package handler

import (
	"RT-Forum/backend/forum"
	"fmt"
	"net/http"
	"strconv"
)

func UserPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}


	ok, userID, err := forum.IsLoggedIn(r, "token")
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	if !ok {
		jsonResponse(w, http.StatusUnauthorized, "You must be logged in")
		return
	}

	page, pageErr := strconv.Atoi(r.FormValue("page"))
	if pageErr != nil {
		jsonResponse(w, http.StatusBadRequest, "Invalid page number")
		return
	}

	query := fmt.Sprintf(`
	SELECT
		p.id,
		(SELECT GROUP_CONCAT(cat.category, ', ') FROM category cat JOIN postcategory AS pc ON pc.category_id = cat.id WHERE pc.post_id = p.id) AS categories,
		(SELECT COUNT(pl.id) FROM post_likes AS pl WHERE pl.post_id = p.id AND pl.like_value = 1) AS likes,
		(SELECT COUNT(pl.id) FROM post_likes AS pl WHERE pl.post_id = p.id AND pl.like_value = -1) AS dislikes,
		(SELECT COUNT(com.id) FROM comment AS com WHERE com.post_id = p.id) AS comments,
		u.nickname AS username,
		p.title,
		p.content,
		p.created_at
	FROM
		post AS p
		JOIN user AS u ON p.user_id = u.id
		LEFT JOIN postcategory AS pc ON pc.post_id = p.id
		LEFT JOIN category AS cat ON pc.category_id = cat.id
	WHERE
		p.user_id = %d
	GROUP BY
		p.id
	ORDER BY 
		p.created_at DESC
	LIMIT
		7
	OFFSET
		%d
	`, userID, (page*7)-7)

	posts, err := forum.SelectQuery(query)
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	var Post FilterPostData
	var allPosts []FilterPostData
	for posts.Next() {
		err := posts.Scan(&Post.PostId, &Post.Categories, &Post.Likes, &Post.Dislikes, &Post.Comments, &Post.Username, &Post.Title, &Post.Content, &Post.CreatedAt)
		if err != nil {
			forum.ErrorLog.Println(err)
			continue
		}
		allPosts = append(allPosts, Post)
	}
	jsonResponse(w, http.StatusOK, allPosts)
}
