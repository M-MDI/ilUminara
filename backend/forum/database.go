package forum

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

const (
	// Use /tmp directory for Vercel compatibility
	DatabasePath = "/tmp/database.db"
	ErrOpenDB    = "OPEN ERROR: %v"
	ErrDBOpen    = "Failed to open the database"
	ErrExecDB    = "Execute failed: %s"
	ErrQueryDB   = "Query failed: %s"
)

func CreateDataBase() {
	// Ensure directory exists
	dir := filepath.Dir(DatabasePath)
	os.MkdirAll(dir, 0755)

	db, err := sql.Open("sqlite3", DatabasePath)

	CheckError("open file database", err)

	// Enable foreign key support
	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	CheckError("pragma on error :", err)

	// User table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS user (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nickname TEXT NOT NULL UNIQUE,
		age INTEGER NOT NULL,
		gender TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
		created_at TEXT NOT NULL,
		uuid TEXT UNIQUE,
		exp TEXT 
	);`)
	CheckError("table user error :", err)

	// message table
	_, err = db.Exec(`CREATE TABLE IF not EXISTS message (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
		chat_id INTEGER NOT NULL,
        sender_user TEXT NOT NULL,
        message_text TEXT NOT NULL,
        send_at TEXT NOT NULL,
		FOREIGN KEY (chat_id) REFERENCES chat (id) ON DELETE CASCADE,
        FOREIGN KEY (sender_user) REFERENCES user (nickname) ON DELETE CASCADE
    );`)
	CheckError("table message error :", err)

	// chat table
	_, err = db.Exec(`CREATE TABLE IF not EXISTS chat (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_one TEXT NOT NULL,
			user_tow TEXT NOT NULL,
			last_send TEXT NOT NULL,
			FOREIGN KEY (user_one) REFERENCES user (nickname) ON DELETE CASCADE,
			FOREIGN KEY (user_tow) REFERENCES user (nickname) ON DELETE CASCADE
		);`)
	CheckError("table chat error :", err)

	// Post table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS post (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );`)
	CheckError("table post error :", err)

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        like_value INTEGER NOT NULL CHECK(like_value IN (-1, 0, 1)),
        FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );`)
	CheckError("table post_likes error :", err)

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment_content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        hasChange INTEGER,
        FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );`)
	CheckError("table comment error :", err)

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS commentlike (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        like INTEGER NOT NULL,
        FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );`)
	CheckError("table like error :", err)

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL UNIQUE,
        description TEXT
    );`)
	CheckError("table category error :", err)

	_, err = db.Exec(`INSERT OR IGNORE INTO category (category, description) 
        VALUES ('General', 'Default category for uncategorized posts')`)
	CheckError("insert general category error:", err)

	newCategories := []struct {
		name, desc string
	}{
		{"Fun", "Posts related to humor, games, and entertainment"},
		{"Technology", "Posts about tech, programming, and innovations"},
		{"Entertainment", "Posts about movies, music, and arts"},
		{"Business", "Posts about business, finance, and entrepreneurship"},
		{"News", "Posts about current events and news"},
		{"Zone01", "Posts related to Zone01 specific content"},
	}

	for _, cat := range newCategories {
		_, err = db.Exec(`INSERT OR IGNORE INTO category (category, description) VALUES (?, ?)`,
			cat.name, cat.desc)
		CheckError("insert category error:", err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS postcategory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE
    );`)
	CheckError("table postcategory error :", err)
	db.Close()
}

func SelectQuery(query string, args ...any) (*sql.Rows, error) {
	db, err := sql.Open("sqlite3", DatabasePath)
	if err != nil {
		LogError(ErrDBOpen, err)
		return nil, err
	}
	defer db.Close()

	rows, er := db.Query(query, args...)
	if er != nil {
		LogError(fmt.Sprintf(ErrQueryDB, query), er)
		return nil, fmt.Errorf("QUERY ERROR: %v", er)
	}
	return rows, nil
}

// for single row
func SelectOneRow(query string, args ...any) (*sql.Row, error) {
	db, err := sql.Open("sqlite3", DatabasePath)
	if err != nil {
		LogError(ErrDBOpen, err)
		return nil, err
	}
	defer db.Close()
	return db.QueryRow(query, args...), nil
}

func ExecQuery(query string, args ...any) (sql.Result, error) {
	db, err := sql.Open("sqlite3", DatabasePath)
	if err != nil {
		LogError(ErrDBOpen, err)
		return nil, err
	}
	defer db.Close()

	rs, err := db.Exec(query, args...)
	if err != nil {
		LogError(fmt.Sprintf(ErrExecDB, query), err)
		return nil, fmt.Errorf("EXEC ERROR: %v", err)
	}
	return rs, nil
}
