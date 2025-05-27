package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"RT-Forum/backend/forum"

	"github.com/gofrs/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Login struct {
	Emailname string `json:"emailname"`
	Password  string `json:"password"`
}

type SignUp struct {
	Nickname  string `json:"nickname"`
	Gender    string `json:"gender"`
	Age       int    `json:"age"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Pasword   string `json:"pasword"`
}

func SignUpHandlerApi(res http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		jsonResponse(res, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	isLoged, _, err := forum.IsLoggedIn(req, "token")
	if err != nil {
		forum.ErrorLog.Println(err)
		jsonResponse(res, http.StatusInternalServerError, "Shomthing went wrong")
		return
	}

	if isLoged {
		jsonResponse(res, http.StatusUnauthorized, "Alerady logged in (Refresh the page)")
		return
	}

	var signup SignUp
	errdecode := json.NewDecoder(req.Body).Decode(&signup)
	if errdecode != nil {
		forum.ErrorLog.Println(errdecode)
		jsonResponse(res, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer req.Body.Close()

	username := signup.Nickname
	age := signup.Age
	firstname := signup.FirstName
	lastname := signup.LastName
	pasword := signup.Pasword
	email := signup.Email
	gender := signup.Gender

	valid := forum.IsDataValid(username, firstname, lastname, pasword, email, gender, age)
	if valid != nil {
		jsonResponse(res, http.StatusUnprocessableEntity, valid.Error())
		return
	}

	hashPass, errHash := bcrypt.GenerateFromPassword([]byte(pasword), bcrypt.DefaultCost)
	if errHash != nil {
		forum.ErrorLog.Println(errHash)
		jsonResponse(res, http.StatusInternalServerError, "Something wrong")
		return
	}

	err = forum.InsertUser(username, firstname, lastname, email, string(hashPass), gender, age)
	if err != nil {
		if err.Error() == "EXEC ERROR: UNIQUE constraint failed: user.email" {
			jsonResponse(res, http.StatusConflict, "Email already exists")
			return

		} else if err.Error() == "EXEC ERROR: UNIQUE constraint failed: user.nickname" {
			jsonResponse(res, http.StatusConflict, "user name already exists")
			return

		} else {
			forum.ErrorLog.Println(err)
			jsonResponse(res, http.StatusInternalServerError, "Something wrong")
			return
		}
	}

	jsonResponse(res, http.StatusOK, "welcom "+username)
}

func LogInHandlerApi(res http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		jsonResponse(res, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	isLoged, _, errlogin := forum.IsLoggedIn(req, "token")
	if errlogin != nil {
		jsonResponse(res, http.StatusInternalServerError, "Something wrong")
		return
	}
	if isLoged {
		jsonResponse(res, http.StatusUnauthorized, "You are alerady logged (Refresh the page)")
		return
	}

	var login Login
	err := json.NewDecoder(req.Body).Decode(&login)
	if err != nil {
		jsonResponse(res, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer req.Body.Close()

	nameEmail := login.Emailname
	password := login.Password

	ok := forum.CheckHashPasword(password, nameEmail)
	if ok != nil {
		if ok.Error() == "userNotFound" {
			jsonResponse(res, http.StatusUnauthorized, "email or username not correct")
			return
		} else {
			jsonResponse(res, http.StatusUnauthorized, "Password not correct")
			return
		}
	}

	uid, err := uuid.NewV4()
	if err != nil {
		// error generet uuid
		jsonResponse(res, http.StatusInternalServerError, "Something wrong")
		return
	}

	exp := time.Now().Add(72 * time.Hour)

	err = forum.InsertUuid(uid.String(), nameEmail, exp)
	if err != nil {
		// error add user in sqlite
		jsonResponse(res, http.StatusBadRequest, "Something wrong")
		return
	}

	http.SetCookie(res, &http.Cookie{
		Name:     "token",
		Value:    uid.String(),
		Expires:  exp,
		HttpOnly: true,
		Path:     "/",
		Secure:   true,
	})

	jsonResponse(res, http.StatusOK, "Login successful")
}

func LogoutHandlerApi(res http.ResponseWriter, req *http.Request) {
	uid, err := req.Cookie("token")
	if err != nil {
		jsonResponse(res, http.StatusUnauthorized, "Please log in first")
		return
	}
	name, err := forum.GetUserByUuid(uid.Value)
	if err != nil {
		jsonResponse(res, http.StatusInternalServerError, "Error logout")
		return
	}
	clearConn(name)

	if err = forum.DeletUuid(uid.Value); err != nil {
		jsonResponse(res, http.StatusInternalServerError, "Error during logout")
		return
	}

	http.SetCookie(res, &http.Cookie{
		Name:   "token",
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})
	jsonResponse(res, http.StatusOK, "Logout successful")
}
