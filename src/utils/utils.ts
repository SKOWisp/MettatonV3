// Checks if an element can be found in an array
function matches(query: any, array: any[]) {
	for (let i = 0; i < array.length; i++) {
		const element = array[i];
		if (query === element) {
			return true;
		}
	}
	return false;
}

// Shuffles an array
function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}


interface SplitOptions {
	maxLength?: number,
	char?: string,
	prepend?: string,
	append?: string
}

/**
  * Splits a string into multiple chunks at a designated character that do not exceed a specific length.
  * @param {string} text Content to split
  * @param {SplitOptions} [options] Options controlling the behavior of the split
  * @returns {string[]}
  */
function splitString(text: string, { maxLength = 2_000, char = '\n', prepend = '', append = '' }: SplitOptions = {}) {

	if (text == '') return [];
	if ((text + append + prepend).length <= maxLength) return [prepend + text + append];

	let splitText: (string | null)[] = [text];

	if (Array.isArray(char)) {
		while (char.length > 0 && splitText.some(elem => elem!.length > maxLength)) {
			const currentChar = char.shift();

			if (currentChar instanceof RegExp) {
				splitText = splitText.flatMap(chunk => chunk!.match(currentChar)) ;
			}
			else {
				splitText = splitText.flatMap(chunk => chunk!.split(currentChar));
			}
		}
	}
	else {
		splitText = text.split(char);
	}

	if (splitText.some(elem => elem!.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');

	const messages = [];
	let msg = prepend;

	for (const chunk of splitText) {
		if (msg && (msg + char + chunk + append).length > maxLength) {
			messages.push(msg + append);
			msg = prepend;
		}
		msg += (msg && msg !== prepend ? char : '') + chunk;
	}

	return messages.concat(msg + append).filter(m => m);
}


export { matches, shuffle, splitString };