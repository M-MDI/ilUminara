package handler

import (
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"RT-Forum/backend/forum"
	"RT-Forum/backend/handler"
)

func resetDatabase() {
	// Remove the existing database file
	os.Remove(forum.DatabasePath)
	// Create new database with empty tables
	forum.CreateDataBase()
	fmt.Println("Database has been reset successfully")
}

func main() {
	// Define command line flags
	reset := flag.Bool("reset", false, "Reset the database before starting the server")
	flag.Parse()

	// Check if reset flag is set
	if *reset {
		fmt.Println("Resetting database...")
		resetDatabase()
	} else {
		forum.CreateDataBase()
	}

	addr := ":8080"
	mux := http.NewServeMux()

	mux.HandleFunc("/public/", handleStaticFile)

	mux.HandleFunc("/", func(res http.ResponseWriter, req *http.Request) {
		HandlerFunc(res, req)
	})

	fmt.Println("Server started...")
	err := http.ListenAndServe(addr, mux)
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		os.Exit(1)
	}
}

func handleStaticFile(res http.ResponseWriter, req *http.Request) {
	directories := []string{"img", "js", "templates", "css"}
	for _, dir := range directories {
		if strings.HasPrefix(req.URL.Path, "/public/"+dir) {
			if req.URL.Path == "/public/"+dir || strings.HasSuffix(req.URL.Path, "/") {
				handler.ErrorHandler(res, req, "404")
				return
			}

			filePath := strings.TrimPrefix(req.URL.Path, "/public/"+dir+"/")
			if strings.Contains(filePath, "/") {
				handler.ErrorHandler(res, req, "404")
				return
			}

			file := "./frontend/" + dir + "/" + filePath
			_, err := os.Stat(file)
			if err != nil {
				handler.ErrorHandler(res, req, "404")
				return
			}

			// Set content type based on file extension
			ext := strings.ToLower(filepath.Ext(file))
			contentType := ""
			switch ext {
			case ".css":
				contentType = "text/css"
			case ".js":
				contentType = "application/javascript"
			case ".png":
				contentType = "image/png"
			case ".jpg", ".jpeg":
				contentType = "image/jpeg"
			case ".gif":
				contentType = "image/gif"
			case ".svg":
				contentType = "image/svg+xml"
			case ".html":
				contentType = "text/html"
			case ".avif":
				contentType = "image/avif"
			default:
				contentType = "application/octet-stream"
			}
			res.Header().Set("Content-Type", contentType)
			http.ServeFile(res, req, file)
			return
		}
	}
	handler.ErrorHandler(res, req, "404")
}

func HandlerFunc(res http.ResponseWriter, req *http.Request) {
	switch req.URL.Path {
	// handler
	case "/":
		handler.HomeHandler(res, req)

	// api EndPoints
	case "/api/sign-up":
		handler.SignUpHandlerApi(res, req)

	case "/api/log-in":
		handler.LogInHandlerApi(res, req)

	case "/api/logout":
		handler.LogoutHandlerApi(res, req)

	case "/api/is-logged-in":
		handler.IsLoggedInHandler(res, req)

	case "/api/categ":
		handler.Categorie(res, req)

	case "/api/likedPost":
		handler.Likedposts(res, req)

	case "/api/user/profil":
		handler.UserProfile(res, req)

	case "/api/filterPost":
		handler.FilterPost(res, req)

	case "/api/userPosts":
		handler.UserPosts(res, req)

	case "/api/getComments":
		handler.Get_comments(res, req)

	case "/api/addComment":
		handler.Add_comment(res, req)

	case "/api/create-post":
		handler.CreatePostHandlerApi(res, req)

	case "/api/reactions":
		handler.Reactions(res, req)

	case "/api/commentReactions":
		handler.Reactions(res, req)

	case "/api/checklike":
		handler.CheckIfUserLike(res, req, "post")

	case "/api/check-comment-like":
		handler.CheckIfUserLike(res, req, "comment")

	// web socket
	case "/ws":
		handler.WsEndpoint(res, req)

	case "/api/getUsers":
		handler.GetUsersApi(res, req)

	case "/api/lastUsersChat":
		handler.GetUserOrganizedlastMsgApi(res, req)

	case "/api/getMessages":
		handler.GetMessages(res, req)

	default:
		res.WriteHeader(http.StatusNotFound)
		handler.HomeHandler(res, req)
		return
	}
}
