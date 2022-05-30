/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

type AudioPlayerOptions = {
	wsEndpoint: string;
	timeout?: number;
};

interface SpeakPart {
	partId: string;
	ssml: string;
}

interface Sentence {
	text: string;
	begin_time: string;
	end_time: string;
}

const endingPunctuationMarks = ['.', '。', '?', '？', '!', '！'];

function removeSpeakRootTag(text: string) {
	return text.substring(text.indexOf('<speak>') + 7, text.lastIndexOf('</speak>'));
}

export class AudioPlayer extends EventEmitter {
	private _ws: WebSocket;
	public _waitingForSprite = new Map<string, 'unknown' | 'playing' | 'end'>();
	private _closePromise: Promise<void>;

	static async connect(options: AudioPlayerOptions): Promise<AudioPlayer> {
		const { wsEndpoint, timeout = 30000 } = options;
		const ws = new WebSocket(wsEndpoint);
		const errorPromise = new Promise((_, reject) => ws.on('error', (error) => reject(error)));
		const closePromise = new Promise((_, reject) => ws.on('close', () => reject(new Error('Connection closed'))));
		const audioPlayerPromise = new Promise<AudioPlayer>((resolve, reject) => {
			ws.on('open', async () => {
				resolve(new AudioPlayer(ws));
			});
		});
		let timer: NodeJS.Timeout;
		try {
			await Promise.race([
				audioPlayerPromise,
				errorPromise,
				closePromise,
				new Promise(
					(_, reject) =>
						(timer = setTimeout(() => reject(`Timeout of ${timeout}ms exceeded while connecting.`), timeout))
				),
			]);
			return await audioPlayerPromise;
		} finally {
			clearTimeout(timer!);
		}
	}

	constructor(ws: WebSocket) {
		super();
		this._ws = ws;
		ws.on('close', (code, reason) => this.emit('close'));
		ws.on('message', (message) => this._dispatch(JSON.parse(message.toString())));
		this._closePromise = new Promise((f) => ws.on('close', f));
	}

	async close() {
		this._ws.close();
		await this._closePromise;
	}

	_dispatch(message: any) {
		const { method, params } = message;
		if (method === 'audioSpriteEnd') {
			const { spriteId } = params;
			this._waitingForSprite.set(spriteId, 'end');
			this.emit('audioSpriteEnd', spriteId);
		}
	}
	playAudioSprite(spriteId: string) {
		if (this._ws.readyState === 2 /** CLOSING */ || this._ws.readyState === 3 /** CLOSED */) {
			throw new Error('AudioPlayer: writing to closed WebSocket connection');
		}
		this._ws.send(
			JSON.stringify({
				method: 'playAudioSprite',
				params: {
					spriteId: spriteId,
				},
			})
		);
		this._waitingForSprite.set(spriteId, 'playing');
	}

	getSpriteStatus(spriteId: string): 'unknown' | 'playing' | 'end' {
		return this._waitingForSprite.get(spriteId) || 'unknown';
	}

}

export function getTimeFormat(date: Date | null = null): string {
	if (date === null) {
		date = new Date();
	}
	return date.toLocaleTimeString() + date.getMilliseconds();
}


export class ScriptPlayer extends EventEmitter {
	private _scripts: string[] = [];
	readonly _simulate: boolean;
	public _waitingForSprite = new Map<string, 'unknown' | 'playing' | 'end'>();
	// private _begin: number;
	// private _lines: [number, number][] | undefined = undefined;
	// private _subTexts: string[] = [];
	// private _hasSsml: boolean = false;
	// private _hasSentences: boolean = false;
	public readonly workspacePath: string;
	private _sentences: Sentence[] | undefined = undefined;
	private _sprite: Record<string, [number, number]> | undefined = undefined;
	// private
	// 发送台词

	constructor(workspacePath: string) {
		super();
		this.workspacePath = workspacePath;
	}

	async loadConfig() {
		const files = await fs.promises.readdir(this.workspacePath);
		for (const file of files) {
			if (file.endsWith('.sentences.json')) {
				// this._hasSentences = true;
				const sentencesFilePath = path.join(this.workspacePath, file);
				const sentencesText = await fs.promises.readFile(sentencesFilePath, { encoding: 'utf-8' });
				const sentencesData = JSON.parse(sentencesText);
				this._sentences = sentencesData['sentences'];
			}
			if (file.endsWith('.sprite.json')) {
				const spriteFilePath = path.join(this.workspacePath, file);
				const spriteText = await fs.promises.readFile(spriteFilePath, { encoding: 'utf-8' });
				const spriteData = JSON.parse(spriteText);
				this._sprite = spriteData['sprite'];
			}
		}
	}

	// begin() {
	// 	this._begin = Date.now();
	// }

	playScript(script: string): string {
		const spriteId = this._scripts.length.toString();
		this._scripts.push(script);
		let timeout: number;
		if (this._sprite) {
			const [begin_time, end_time] = this._sprite[`part${spriteId}`];
			timeout = end_time - begin_time;
		} else {

			// const start = Date.now();
			// console.log(getTimeFormat(start) + `>>>${script}`);
			timeout = script.length / 5 * 1000;

			// this._subTexts.push(script);
			// console.log(`start=${start - this._begin}`);

			// this._lines.push([start - this._begin, start - this._begin + timeout]);
		}
		console.log(getTimeFormat() + ` >>>${script}`);
		this._waitingForSprite.set(spriteId, 'playing');
		setTimeout(() => {
			this._waitingForSprite.set(spriteId, 'end');
			this.emit('audioSpriteEnd', spriteId);
		}, timeout);
		return spriteId.toString();
	}

	getSpriteStatus(spriteId: string): 'unknown' | 'playing' | 'end' {
		return this._waitingForSprite.get(spriteId) || 'unknown';
	}

	getSsml() {
		let ssml = '<speak>';
		let i = 0;
		const parts: SpeakPart[] = [];
		for (const part of this._scripts) {
			if (!endingPunctuationMarks.includes(part.charAt(part.length - 1))) {
				throw new Error(`${part} missing ending punctuation marks ${endingPunctuationMarks}`);
			}
			ssml += part;
			parts.push({
				partId: `part${i}`,
				ssml: part,
			});
			i++;
		}
		ssml += '</speak>';
		return {
			parts: parts,
			ssml: ssml,
		};
	}


	getSrt(): string | undefined {
		if (!this._sentences) {
			return undefined;
		}

		const lines: [number, number][] = [];
		const subTexts: string[] = [];
		for (const sentence of this._sentences) {
			lines.push([parseInt(sentence.begin_time), parseInt(sentence.end_time)]);
			subTexts.push(removeSpeakRootTag(sentence.text));
		}

		let srt = '';
		for (let i = 0; i < subTexts.length; i++) {
			// line number
			srt += i + 1 + '\n';
			// line time
			let sh, sm, ss, sms;
			let eh, em, es, ems;
			const [timeStart, timeEnd] = lines[i];
			const leftPad = str => `${str}`.padStart(2, '0');
			const leftPad3 = str => `${str}`.padStart(3, '0');
			sh = leftPad(Math.floor(timeStart / 3600000));
			sm = leftPad(Math.floor((timeStart % 3600000) / 60000));
			ss = leftPad(Math.floor(timeStart % 60000 / 1000));
			sms = leftPad3(Math.floor(timeStart % 1000));
			eh = leftPad(Math.floor(timeEnd / 3600000));
			em = leftPad(Math.floor((timeEnd % 3600000) / 60000));
			es = leftPad(Math.floor(timeEnd % 60000 / 1000));
			ems = leftPad3(Math.floor(timeEnd % 1000));

			srt += `${sh}:${sm}:${ss},${sms} --> ${eh}:${em}:${es},${ems}\n`;
			srt += subTexts[i];
			srt += '\n\n';
		}
		return srt;
	}

	async saveSrt() {
		const srt = this.getSrt();
		if (srt) {
			const srtFile = path.join(this.workspacePath, 'subtitles.srt');
			await fs.promises.writeFile(srtFile, srt);
		}
	}

	async saveSsml() {
		const { parts, ssml } = this.getSsml();
		const ssmlFile = path.join(this.workspacePath, 'speak.json');
		await fs.promises.writeFile(ssmlFile, JSON.stringify({ parts, ssml }, null, 2));
	}

	async autoWriteFile() {
		await this.saveSsml();
		await this.saveSrt();
	}

	async close() { }
}
