CREATE TABLE IF NOT EXISTS goals (
	id INTEGER NOT NULL PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT NOT NULL, /* HTML */
	descriptionEnglish TEXT, /* HTML */
	descriptionGerman TEXT, /* HTML */
	authorName TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goalPosts (
	goalId INTEGER NOT NULL,
	dateTime INTEGER NOT NULL, /* Unix seconds UTC */
	isPublic INTEGER NOT NULL DEFAULT 0,
	text TEXT NOT NULL,  /* HTML */
	textEnglish TEXT,  /* HTML */
	textGerman TEXT,  /* HTML */
	type TEXT NOT NULL,
	PRIMARY KEY (goalId, dateTime)
);

CREATE TABLE IF NOT EXISTS goalPostImages (
	goalId INTEGER NOT NULL,
	parentDateTime INTEGER NOT NULL, /* Unix seconds UTC */
	contentType TEXT NOT NULL,
	file BLOB NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, contentType, file)
);

CREATE TABLE IF NOT EXISTS goalPostComments (
	goalId INTEGER NOT NULL,
	parentDateTime INTEGER NOT NULL, /* Unix seconds UTC */
	dateTime INTEGER NOT NULL, /* Unix seconds UTC */
	username TEXT NOT NULL,
	smartProgressUserId INTEGER,
	htmlText TEXT NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, dateTime, username, smartProgressUserId, htmlText)
);