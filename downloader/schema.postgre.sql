CREATE TABLE IF NOT EXISTS goals (
	id BIGINT NOT NULL PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT NOT NULL, /* HTML */
	authorName TEXT NOT NULL,

	imageData BYTEA NOT NULL,
	imageContentType TEXT NOT NULL
);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS imageData BYTEA NOT NULL default '';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS imageContentType TEXT NOT NULL default '';

CREATE TABLE IF NOT EXISTS goalPosts (
	goalId BIGINT NOT NULL,
	dateTime BIGINT NOT NULL, /* Unix seconds UTC */
	isPublic BOOLEAN NOT NULL DEFAULT FALSE,
	text TEXT NOT NULL,  /* HTML */
	textEnglish TEXT,  /* HTML */
	textGerman TEXT,  /* HTML */
	type TEXT NOT NULL,
	title TEXT,
	titleEnglish TEXT,
	titleGerman TEXT,
	PRIMARY KEY (goalId, dateTime)
);

CREATE TABLE IF NOT EXISTS goalPostImages (
	goalId BIGINT NOT NULL,
	parentDateTime BIGINT NOT NULL, /* Unix seconds UTC */
	sequenceIndex BIGINT NOT NULL,
	contentType TEXT NOT NULL,
	file BYTEA NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, sequenceIndex)
);

CREATE TABLE IF NOT EXISTS goalPostComments (
	goalId BIGINT NOT NULL,
	parentDateTime BIGINT NOT NULL, /* Unix seconds UTC */
	dateTime BIGINT NOT NULL, /* Unix seconds UTC */
	smartProgressUserId BIGINT,
	username TEXT NOT NULL,
	text TEXT NOT NULL,
	PRIMARY KEY (goalId, parentDateTime, dateTime, smartProgressUserId)
);
