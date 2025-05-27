package handler

import (
	"html/template"
	"net/http"
)

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("./frontend/templates/index.html")
	if err != nil {
		ErrorHandler(w, r, "500")
		return
	}
	tmpl.Execute(w, nil)
}
