package handler

import (
	"html/template"
	"net/http"
)

// ErrorHandler handles errors and serves the appropriate error page
func ErrorHandler(w http.ResponseWriter, r *http.Request, status string) {
	errorCode := r.URL.Query().Get("error")
	if errorCode == "" {
		errorCode = status
	}
	errorPagePath := "./frontend/templates/error1.html"

	if errorCode != "400" && errorCode != "500" && errorCode != "404" {
		errorCode = "404"
	}

	tmpl, err := template.ParseFiles(errorPagePath)
	if err != nil {
		http.Error(w, "Failed to load error page", http.StatusInternalServerError)
		return
	}
	switch errorCode {
	case "404":
		w.WriteHeader(http.StatusNotFound)
	case "500":
		w.WriteHeader(http.StatusInternalServerError)
	default:
		w.WriteHeader(http.StatusBadRequest)
	}
	data := map[string]string{
		"ErrorCode": errorCode,
		"Message":   getErrorMessage(errorCode),
	}
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Failed to render error page", http.StatusInternalServerError)
	}
}

func getErrorMessage(code string) string {
	switch code {
	case "404":
		return "Page Not Found"
	case "500":
		return "Internal Server Error"
	default:
		return "An unexpected error occurred"
	}
}
