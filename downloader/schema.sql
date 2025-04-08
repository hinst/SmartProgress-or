CREATE TABLE IF NOT EXISTS goalPosts (
	goalId INTEGER NOT NULL,
	dateTime INTEGER NOT NULL, /* Unix seconds UTC */
	isPublic INTEGER,
	htmlText TEXT,
	type TEXT,
	PRIMARY KEY (goalId, dateTime)
);
