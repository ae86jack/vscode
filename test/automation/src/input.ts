/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export class Keyboard {

	readonly delay: number | undefined;

	constructor(private code: Code, delay?: number) {
		this.delay = 100;
	}

	async _doSlowMo() {
		if (this.delay) {
			await new Promise(x => setTimeout(x, this.delay));
		} else {
			return;
		}
	}

	async down(key: string) {
		await this.code.keyboardDown(key);
		await this._doSlowMo();
	}

	async up(key: string) {
		await this.code.keyboardUp(key);
		await this._doSlowMo();
	}

	async insertText(text: string) {
		await this.code.insertText(text);
		await this._doSlowMo();
	}

	async type(text: string) {
		for (const char of text) {
			await this.insertText(char);
		}
	}

	async press(key: string) {
		await this.code.keyboardPress(key, { delay: this.delay });
	}

	async insertLine(): Promise<void> {
		if (process.platform === 'darwin') {
			await this.code.dispatchKeybinding('cmd+enter');
		} else {
			throw new Error(`NotImplementedError`);
		}
	}

	async dispatch(key: string) {
		await this.code.dispatchKeybinding(key);
	}
}
