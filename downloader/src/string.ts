export function requireString(theString?: string) {
	if (!theString)
		throw new Error('Missing required string');
	return theString;
}

export async function getDataUrlFromBlob(data: Blob, contentType: string): Promise<string> {
	return 'data:' + contentType + ';base64,' + Buffer.from(await data.arrayBuffer()).toString('base64');
}
