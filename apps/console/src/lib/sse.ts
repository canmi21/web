/**
 * An event stream read as it arrives: text in, each whole event's data out, a part held until its
 * blank line comes. The relay writes `data:` lines and `:` comments alone; a comment, and any field
 * but `data`, is passed over. See platform's spec/architecture/relay.md, RFC grmtb.
 */
export class Events {
	#held = '';

	/** Takes the next `text` of the stream; answers the data of each event it completed. */
	take(text: string): string[] {
		this.#held += text;
		const done: string[] = [];
		for (;;) {
			const held = this.#held.replace(/\r\n?/g, '\n');
			const end = held.indexOf('\n\n');
			if (end === -1) {
				this.#held = held;
				return done;
			}
			const lines = held.slice(0, end).split('\n');
			this.#held = held.slice(end + 2);
			const data = lines
				.filter((line) => line.startsWith('data:'))
				.map((line) => line.slice(5).replace(/^ /, ''));
			if (data.length) done.push(data.join('\n'));
		}
	}
}
