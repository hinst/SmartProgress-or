export function requireString(theString?: string) {
    if (!theString)
        throw new Error('Missing required string');
    return theString;
}
