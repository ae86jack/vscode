/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

type AudioPlayerOptions = {
	wsEndpoint: string;
	timeout?: number;
};

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


export class SimulateScriptPlayer extends EventEmitter {
	private _scripts: string[] = [];
	readonly _simulate: boolean;
	public _waitingForSprite = new Map<string, 'unknown' | 'playing' | 'end'>();

	// 发送台词

	constructor() {
		super();
		this._simulate = true;
	}

	playScript(script: string): string {
		this._scripts.push(script);
		const spriteId = this._scripts.length.toString();
		console.log(`>>>${script}`);
		const timeout = script.length / 5 * 1000;
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

	async close() { }
}
