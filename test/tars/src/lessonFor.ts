/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { Application, MultiLogger, Logger, FileLogger } from '../../automation';
import { createApp } from './utils';
import { ScriptPlayer, getTimeFormat } from './base';

let app: Application | undefined = undefined;

const rootPath = path.join(__dirname, '..', '..', '..');
const logsPath = (() => {
	const logsParentPath = path.join(rootPath, '.build', 'logs');

	let logsName: string;
	logsName = 'tars';

	return path.join(logsParentPath, logsName);
})();

const logger = createLogger();

function createLogger(): Logger {
	const loggers: Logger[] = [];

	// Prepare logs path
	fs.rmSync(logsPath, { recursive: true, force: true, maxRetries: 3 });
	mkdirp.sync(logsPath);

	// Always log to log file
	loggers.push(new FileLogger(path.join(logsPath, 'smoke-test-runner.log')));

	return new MultiLogger(loggers);
}

process.env.VSCODE_DEV = '1';
const testDataPath = '/Users/ae86/Projects/vscsmoke';
process.once('exit', () => {
	try {
		if (app) {
			app.stop();
		}
		// rimraf.sync(testDataPath);
	} catch {
		// noop
	}
});

const workspacePath = '/Users/ae86/Projects/tarslab/thirty-seconds-of-js';
const extensionsPath = path.join(testDataPath, 'extensions-dir');
const userDataDir = path.join(testDataPath, 'd');
mkdirp.sync(extensionsPath);

const defaultOptions = {
	quality: 0,
	codePath: undefined,
	workspacePath,
	userDataDir,
	extensionsPath,
	waitTime: 20,
	logger,
	logsPath: '/Users/ae86/Projects/github/vscode/.build/logs/tars-tests',
	verbose: false,
	remote: false,
	web: false,
	legacy: false,
	tracing: false,
	headless: false,
	browser: undefined,
	extraArgs: []
};

async function run(): Promise<void> {
	const scriptPlayer = new ScriptPlayer(testDataPath);
	await scriptPlayer.loadConfig();

	const sprites: string[] = [];
	const start = (script: string) => {
		sprites.push(scriptPlayer.playScript(script));
	};

	const end = async () => {
		const spriteId = sprites.pop()!;
		if (spriteId && scriptPlayer.getSpriteStatus(spriteId) !== 'end') {
			await new Promise<void>((resolve, reject): void => {
				scriptPlayer.once('audioSpriteEnd', (arg: any) => {
					if (arg === spriteId) {
						resolve();
					}
				});
				scriptPlayer.once('close', () => reject(new Error('AudioPlayer: Websocket closed before sprite ends')));
			});
		}
	};

	app = createApp(defaultOptions);
	await app.start();
	console.log(getTimeFormat() + ' app start');
	// scriptPlayer.begin();
	const editor = app.workbench.editor;
	const keyboard = app.workbench.keyboard;

	// await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'README.md'));
	await keyboard.dispatch('cmd+b');

	const file = 'for-in-for-of-foreach-draft.js';
	// quickaccess.openFile依赖配置 "workbench.editor.showTabs": true
	await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'draft', file));

	// 启动前，先设置好。 settings.zoomlevel: 3
	// await keyboard.dispatch('cmd+-');
	// await keyboard.dispatch('cmd+-');
	// await keyboard.dispatch('cmd+-');
	await app.workbench.quickaccess.runCommand('quokka.makeQuokkaFromExistingFile');

	// close panel, terminal
	// await new Promise(x => setTimeout(x, 1000));
	// await keyboard.dispatch('cmd+j');
	let line = 12;

	start(`我们先写个for in例子。for in循环遍历对象的属性。`);
	await editor.waitForEditorFocus(file, ++line);
	await keyboard.type(`for (let property in ['a', 'b', 'c'])`);
	await end();

	start(`属性单词property，不妨缩写为P-R-O-P。`);
	for (let i = 0; i < ` in ['a', 'b', 'c'])`.length; i++) {
		await keyboard.dispatch('left');
	}
	await keyboard.dispatch('cmd+d');
	await keyboard.dispatch('Backspace');
	await keyboard.type('prop');
	await end();

	start(`循环数组，用console打印出来。输出是数组的下标。`);
	await keyboard.insertLine();
	await keyboard.dispatch('Tab');
	await keyboard.type(`console.log(prop);`);
	await end();

	start(`遍历字符串的属性。`);
	await keyboard.insertLine();
	await keyboard.dispatch('shift+Tab');
	await keyboard.type(`for (let prop in 'str')`);
	await end();

	start(`得到是字符的下标。`);
	await keyboard.insertLine();
	await keyboard.dispatch('Tab');
	await keyboard.type(`console.log(prop);`);
	await end();

	start(`上面的两种用法比较少见，这个就很常见，遍历字典。`);
	await keyboard.insertLine();
	await keyboard.dispatch('shift+Tab');
	await keyboard.type(`for (let prop in {a: 1, b: 2, c: 3})`);
	await end();

	start(`输出的是字典的key, a, b, c。`);
	await keyboard.insertLine();
	await keyboard.dispatch('Tab');
	await keyboard.type(`console.log(prop);`);
	await end();

	// const srt = scriptPlayer.getSrt();
	// const speakXmlFile = path.join(testDataPath, 'speak.srt');
	// await fs.promises.writeFile(speakXmlFile, srt);
	// console.log('Saved to ' + speakXmlFile);
	// console.log(srt);

	app.stop();
	console.log(getTimeFormat() + ' app stop');
	scriptPlayer.autoWriteFile();
	// save
	// await app.workbench.editors.saveOpenedFile();
}

(async () => {
	await run();
})();
