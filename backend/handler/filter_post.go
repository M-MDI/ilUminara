package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"RT-Forum/backend/forum"
)

type FilterPostData struct {
	PostId     int    `json:"id"`
	Categories any    `json:"categories"`
	Likes      int    `json:"likes"`
	Dislikes   int    `json:"dislikes"`
	Comments   int    `json:"comments"`
	Username   string `json:"username"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	CreatedAt  string `json:"created_at"`
}

func FilterPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method Not Allowed")
		return
	}

	page, pageErr := strconv.Atoi(r.FormValue("page"))
	if pageErr != nil || page < 1 {
		jsonResponse(w, http.StatusBadRequest, "Invalid page number")
		return
	}

	categorie := r.FormValue("categ")
	date := r.FormValue("date")
	like := r.FormValue("like")

	// check general bad request
	if (date != "" && date != "ASC" && date != "DESC") || (like != "" && like != "ASC" && like != "DESC") {
		jsonResponse(w, http.StatusBadRequest, "Invalid sort parameters")
		return
	}

	// if user not logged in cant filter with date and like
	ok, _, err := forum.IsLoggedIn(r, "token")
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(w, http.StatusInternalServerError, "Something wrong")
		return
	}
	if !ok && (date != "" || like != "") {
		jsonResponse(w, http.StatusUnauthorized, "You must be logged in to filter posts")
		return
	}

	if date == "" && like == "" {
		date = "DESC" // Default sort order
	}

	myQuery := manageFilterQuery(page, categorie, date, like)
	posts, err := forum.SelectQuery(myQuery)
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	defer posts.Close()

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

	if err = posts.Err(); err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(w, http.StatusInternalServerError, "Error processing posts")
		return
	}

	jsonResponse(w, http.StatusOK, allPosts)
}

func manageFilterQuery(page int, cat string, date string, like string) string {
	numPage := strconv.Itoa((page * 7) - 7)
	whereCat := ""
	orderBy := ""

	if cat != "" {
		if cat == "General" {
			whereCat = "WHERE NOT EXISTS (SELECT 1 FROM postcategory pc2 WHERE pc2.post_id = p.id)"
		} else {
			whereCat = "WHERE cat.category = '" + cat + "'"
		}
	}

	// Always include created_at in ORDER BY for consistent ordering
	if date == "ASC" || date == "DESC" {
		orderBy = fmt.Sprintf("ORDER BY DATETIME(p.created_at) %s", date)
	} else if like == "ASC" || like == "DESC" {
		orderBy = fmt.Sprintf("ORDER BY likes %s, DATETIME(p.created_at) DESC", like)
	} else {
		orderBy = "ORDER BY DATETIME(p.created_at) DESC"
	}

	return fmt.Sprintf(`
	SELECT
		p.id,
		(SELECT GROUP_CONCAT(cat.category, ', ') FROM category cat JOIN postcategory AS pc ON pc.category_id = cat.id WHERE pc.post_id = p.id) AS categories,
		(SELECT COUNT(pl.id) FROM post_likes AS pl WHERE pl.post_id = p.id AND pl.like_value = 1) AS likes,
		(SELECT COUNT(pl.id) FROM post_likes AS pl WHERE pl.post_id = p.id AND pl.like_value = -1) AS dislikes,
		(SELECT COUNT(com.id) FROM comment AS com WHERE com.post_id = p.id) AS comments,
		u.nickname AS username,
		p.title,
		p.content,
		STRFTIME('%%Y-%%m-%%dT%%H:%%M:%%SZ', p.created_at) AS created_at
	FROM
		post AS p
		JOIN user AS u ON p.user_id = u.id
		LEFT JOIN postcategory AS pc ON pc.post_id = p.id
		LEFT JOIN category AS cat ON pc.category_id = cat.id
	%s
	GROUP BY
		p.id
	%s
	LIMIT
		7
	OFFSET
		%s
	`, whereCat, orderBy, numPage)
}
