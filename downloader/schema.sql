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
	sequenceIndex INTEGER NOT NULL,
	contentType TEXT NOT NULL,
	file BLOB NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, sequenceIndex)
);

CREATE TABLE IF NOT EXISTS goalPostComments (
	goalId INTEGER NOT NULL,
	parentDateTime INTEGER NOT NULL, /* Unix seconds UTC */
	dateTime INTEGER NOT NULL, /* Unix seconds UTC */
	smartProgressUserId INTEGER,
	username TEXT NOT NULL,
	text TEXT NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, dateTime, smartProgressUserId)
);