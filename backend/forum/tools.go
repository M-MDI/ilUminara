package forum

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"time"
)

var (
	InfoLog  = log.New(os.Stdout, "INFO\t", log.Ldate|log.Ltime)
	ErrorLog = log.New(os.Stderr, "ERROR\t", log.Ldate|log.Ltime|log.Lshortfile)
)

func LogError(message string, err error) {
	if err != nil {
		ErrorLog.Printf("%s: %v", message, err)
	}
}

func LogInfo(msg string, args ...interface{}) {
	InfoLog.Printf(msg, args...)
}

func CheckError(msg string, err error) {
	if err != nil {
		ErrorLog.Printf("%s: %v", msg, err)
		panic(err)
	}
}

// check if data valid for create new user
func IsDataValid2(username, firstname, lastname, password, email, gender string, age int) error {
	if username == "" || password == "" || email == "" {
		return fmt.Errorf("required fields cannot be empty")
	}

	if age <= 0 || age > 120 {
		return fmt.Errorf("age must be between 1 and 120")
	}

	if len(password) < 2 || len(password) > 35 {
		return fmt.Errorf("password must be between 8 and 35 characters")
	}

	if valid, err := regexp.MatchString(`^[a-zA-Z0-9_-]{3,20}$`, username); err != nil {
		return fmt.Errorf("username validation error: %v", err)
	} else if !valid {
		return fmt.Errorf("username must be 3-20 characters, containing only letters, numbers, underscores, or hyphens")
	}

	nmReg := `^[a-zA-Z\s-]{2,50}$`
	if firstname != "" {
		if valid, _ := regexp.MatchString(nmReg, firstname); !valid {
			return fmt.Errorf("invalid firstname format")
		}
	}
	if lastname != "" {
		if valid, _ := regexp.MatchString(nmReg, lastname); !valid {
			return fmt.Errorf("invalid lastname format")
		}
	}

	mailReg := `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
	if valid, err := regexp.MatchString(mailReg, email); err != nil {
		return fmt.Errorf("email validation error: %v", err)
	} else if !valid {
		return fmt.Errorf("invalid email format")
	}

	if gender != "Men" && gender != "Women" {
		return fmt.Errorf("gender must be 'Men', 'women'")
	}

	return nil
}

func IsDataValid(username, firstname, lastname, pasword, email, gender string, age int) error {
	if username == "" || pasword == "" || email == "" {
		return fmt.Errorf("empty field")
	}

	if len(pasword) > 30 {
		return fmt.Errorf("the Password is too long, maximum 30 characters")
	}

	name, errName := regexp.MatchString(`^[a-zA-Z0-9_-]{3,20}$`, username)
	if errName != nil {
		return fmt.Errorf("something went wrong while validating the username")
	}
	if !name {
		return fmt.Errorf("invalid username: must be between 3 and 20 characters, and contain only letters, numbers, underscores, or hyphens")
	}

	find, err := regexp.MatchString(`^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,40}$`, email)
	if err != nil {
		return fmt.Errorf("something went wrong while validating the email")
	}
	if !find {
		return fmt.Errorf("invalid email address")
	}

	return nil
}

func IsLoggedIn(req *http.Request, sessionName string) (bool, int, error) {
	cookie, err := req.Cookie(sessionName)
	if err != nil {
		return false, 0, nil
	}
	var userID int
	var exp any
	result, errQuery := SelectOneRow("SELECT id,exp FROM user WHERE uuid = ?", cookie.Value)
	if errQuery != nil {
		return false, 0, errQuery
	}
	errscan := result.Scan(&userID, &exp)
	if errscan != nil {
		return false, 0, nil
	}

	layout := "2006-01-02 15:04:05.999999999-07:00"

	parsedTime, errparse := time.Parse(layout, fmt.Sprintf("%v", exp))
	if errparse != nil && exp != nil {
		return false, 0, errparse
	}

	if parsedTime.Before(time.Now()) {
		DeletUuid(cookie.Value)
		return false, 0, nil
	}

	return true, userID, nil
}

func FndUserByOAuthID(oauthID string, authStat string) (bool, error) {
	var userID string
	query := fmt.Sprintf("SELECT id FROM user WHERE %s = ?", authStat)
	row, err := SelectOneRow(query, oauthID)
	if err != nil {
		return false, nil
	}

	err = row.Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func RegisterUser(username, email, googlID string, authStat string) error {
	query := fmt.Sprintf("INSERT INTO user (nickname, email, password, created_at, %s) VALUES(?,?,?,?,?)", authStat)
	_, err := ExecQuery(query, username, email, "51r 794w4d", time.Now().Format(time.ANSIC), googlID)
	if err != nil {
		return err
	}
	return nil
}

func InsertUuidauth(uuid string, googleID string, exp time.Time, authStat string) error {
	query := fmt.Sprintf("UPDATE user SET uuid = ?,exp = ? WHERE %s = ?", authStat)
	_, err := ExecQuery(query, uuid, exp, googleID)
	return err
}

func Checkusername(username string) (bool, error) {
	rows, err := SelectQuery("SELECT nickname FROM user WHERE nickname = ?", username)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	if rows.Next() {
		return true, nil
	}
	return false, nil
}
