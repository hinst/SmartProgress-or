CREATE TABLE IF NOT EXISTS goalPosts (
	goalId INTEGER NOT NULL,
	dateTime INTEGER NOT NULL, /* Unix seconds UTC */
	isPublic INTEGER,
	htmlText TEXT,
	type TEXT,
	PRIMARY KEY (goalId, dateTime)
);

CREATE TABLE IF NOT EXISTS goalPostImages (
	goalId INTEGER NOT NULL,
	parentDateTime INTEGER NOT NULL, /* Unix seconds UTC */
	contentType TEXT NOT NULL,
	file BLOB NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, contentType, file)
);