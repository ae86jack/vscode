/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { Application, MultiLogger, Logger, FileLogger } from '../../automation';
import { createApp } from './utils';

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

	// Log to console if verbose
	// loggers.push(new ConsoleLogger());

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
	} catch {
		// noop
	}
});

const workspacePath = '/Users/ae86/Projects/tarslab/vscode/.build/vscode-smoketest-express';
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
	logsPath: '/Users/ae86/Projects/tarslab/vscode/.build/logs/tars-tests',
	verbose: false,
	remote: false,
	web: false,
	legacy: false,
	tracing: false,
	headless: false,
	browser: undefined,
};



async function run(): Promise<void> {
	app = createApp(defaultOptions);
	await app.start();

	// * Open 3 editors
	// TODO: await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'bin', 'www'));
	// await app.workbench.quickaccess.runCommand('View: Keep Editor');
	// await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'app.js'));
	// await app.workbench.editors.selectTab('app.js');
	// const line2 = await app.workbench.editor.getTextContentInLine('app.js', 2);
	// console.log(`line2=${line2}`);

	// Close extension editor because keybindings dispatch is not working when web views are opened and focused
	// https://github.com/microsoft/vscode/issues/110276

	await app.workbench.quickaccess.runCommand('quokka.createJavaScriptFile');

	// https://www.30secondsofcode.org/articles/s/code-anatomy-chaining-reduce-for-loop

	const lines = [``, `const files = [ 'foo.txt ', '.bar', '   ', 'baz.foo' ];`,
		`let filePaths = [];`,
		``,
		`for (let file of files) {`,
		`const fileName = file.trim();`,
		`if(fileName) {`,
		`const filePath = \`~/cool_app/\${fileName}\`;`,
		`filePaths.push(filePath);`,
		` }`,
		``];


	// open editor and type
	const file = 'untitled:Untitled-1';
	// const slowMo = 0;

	await app.workbench.editor.waitForEditorFocus(file, 1);
	// await app.workbench.keyboard.type(lines[1]);
	await app.workbench.editor.waitForTypeInEditor(file, lines[1]);

	await app.workbench.keyboard.insertLine();
	await app.workbench.keyboard.type('let filePaths = [];');
	await app.workbench.keyboard.press('ArrowLeft');

	await app.workbench.keyboard.down('Shift');
	// await new Promise(x => setTimeout(x, slowMo));
	for (let i = 0; i < '[];'.length; i++) {
		await app.workbench.keyboard.press('ArrowLeft');
	}
	// await new Promise(x => setTimeout(x, slowMo));

	await app.workbench.keyboard.up('Shift');
	// await new Promise(x => setTimeout(x, slowMo));

	// await app.workbench.keyboard.press('Backspace');
	// await app.workbench.editor.waitForTypeInEditor(file, lines[2]);

	// await app.workbench.editor.insertLine();
	// await app.workbench.editor.waitForTypeInEditor(file, lines[3]);

	// await app.workbench.editor.insertLine();
	// await app.workbench.editor.waitForTypeInEditor(file, lines[4]);

	// await app.workbench.editor.dispatchKeybinding('enter');
	// await app.workbench.editor.waitForTypeInEditor(file, lines[5]);

	// await app.workbench.editor.insertLine();
	// await app.workbench.editor.waitForTypeInEditor(file, lines[6]);

	// await app.workbench.editor.dispatchKeybinding('enter');
	// await app.workbench.editor.waitForTypeInEditor(file, lines[7]);

	// await app.workbench.editor.insertLine();
	// await app.workbench.editor.waitForTypeInEditor(file, lines[8]);

	// await app.workbench.editor.waitForEditorFocus(file, 10);
	// await app.workbench.editor.insertLine();
	// await app.workbench.editor.waitForTypeInEditor(file, "filePaths;");

	// await app.workbench.editor.waitForEditorFocus(file, 7);
	// const line7 = await app.workbench.editor.getTextContentInLine(file, 7);
	// console.log(`line7=${line7}`);
	// await app.workbench.editor.waitForEditorSpanFocus(file, 7, 2);
	// await app.workbench.editor.dispatchKeybinding('right');
	// await app.workbench.editor.dispatchKeybinding('right');
	// await app.workbench.editor.waitForTypeInEditor(file, '*insert*');

	// save
	// await app.workbench.editors.saveOpenedFile();
}

(async () => {
	await run();
})();
