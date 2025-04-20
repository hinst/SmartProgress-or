export function requireString(theString?: string) {
	if (!theString) throw new Error('Missing required string');
	return theString;
}

export function readBoolean(theString?: string) {
	if (theString === 'true') return true;
	return false;
}
