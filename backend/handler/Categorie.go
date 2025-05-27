package handler

import (
	"net/http"

	"RT-Forum/backend/forum"
)

type categorie struct {
	Id          int    `json:"id"`
	Categorie   string `json:"category"`
	Description string `json:"description"`
}

func Categorie(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		rows, err := forum.SelectQuery("SELECT * FROM category")
		if err != nil {
			jsonResponse(w, http.StatusInternalServerError, "Internal Server Error")
			return
		}
		var categ categorie
		var result []categorie
		for rows.Next() {
			rows.Scan(&categ.Id, &categ.Categorie, &categ.Description)
			result = append(result, categ)
		}
		jsonResponse(w, http.StatusOK, result)
	} else {
		jsonResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}
