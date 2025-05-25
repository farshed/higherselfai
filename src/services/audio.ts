export async function getMulawBase64FromURL(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`failed to fetch: ${res.status}`);

	const buf = Buffer.from(await res.arrayBuffer());

	const dataOffset = buf.indexOf('data');
	if (dataOffset === -1) throw new Error('no data chunk found');

	const dataStart = dataOffset + 8;
	const rawMulaw = buf.subarray(dataStart);

	return rawMulaw.toString('base64');
}

// export async function getMulawFromURL(url: string) {
// 	console.log('url', url);
// 	const res = await fetch(url);
// 	if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

// 	const buf = Buffer.from(await res.arrayBuffer());

// 	const dataOffset = buf.indexOf('data') + 8;
// 	const pcm = buf.subarray(dataOffset);

// 	const mulaw = new Uint8Array(pcm.length / 2);

// 	for (let i = 0; i < pcm.length; i += 2) {
// 		const sample = buf.readInt16LE(dataOffset + i);
// 		mulaw[i / 2] = linearToMulaw(sample);
// 	}

// 	return mulaw;
// }

export function decodeMulawChunk(payload: string) {
	const buf = Buffer.from(payload, 'base64');
	return new Uint8Array(buf);
}

export function getBlankMulawAudio(secs: number) {
	return Buffer.from(new Uint8Array(secs * 8000).fill(0xff)).toString('base64');
}
