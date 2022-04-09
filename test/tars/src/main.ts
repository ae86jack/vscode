/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as rimraf from 'rimraf';
import * as mkdirp from 'mkdirp';
import { Application, MultiLogger, Logger, ConsoleLogger, FileLogger } from '../../automation';
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
	loggers.push(new ConsoleLogger());

	// Prepare logs path
	fs.rmSync(logsPath, { recursive: true, force: true, maxRetries: 3 });
	mkdirp.sync(logsPath);

	// Always log to log file
	loggers.push(new FileLogger(path.join(logsPath, 'smoke-test-runner.log')));

	return new MultiLogger(loggers);
}

const testDataPath = path.join(os.tmpdir(), 'vscsmoke');
if (fs.existsSync(testDataPath)) {
	rimraf.sync(testDataPath);
}
fs.mkdirSync(testDataPath);
process.once('exit', () => {
	try {
		if (app) {
			app.stop();
		}
		rimraf.sync(testDataPath);
	} catch {
		// noop
	}
});

const workspacePath = '/Users/ae86/Projects/tmp/vscode-smoketest-express';
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

	app = createApp(defaultOptions);
	await app.start();

	// Open 3 editors
	// await app.workbench.quickaccess.openFile(join(app.workspacePathOrFolder, 'bin', 'www'));
	// await app.workbench.quickaccess.runCommand('View: Keep Editor');
	// await app.workbench.quickaccess.openFile(join(app.workspacePathOrFolder, 'app.js'));
	// await app.workbench.quickaccess.runCommand('View: Keep Editor');
	// await app.workbench.editors.newUntitledFile();

	// // Verify 3 editors are open
	// await app.workbench.editors.selectTab('Untitled-1');
	// await app.workbench.editors.selectTab('app.js');
	// await app.workbench.editors.selectTab('www');

	const textToType = 'Hello, Code';

	// open editor and type
	await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'app.js'));
	await app.workbench.editor.waitForTypeInEditor('app.js', textToType + '\nSecond line! ');
	// await app.workbench.editor.waitForEditorFocus('app.js', 2);
	await app.workbench.editor.waitForTypeInEditor('app.js', 'Third line!');
	// await app.workbench.editors.saveOpenedFile();
	// await app.workbench.editor.waitForTypeInEditor('app.js', '\nThird line!');
	// await app.workbench.editors.waitForTab('app.js', true);

	// save
	// await app.workbench.editors.saveOpenedFile();
}

(async () => {
	try {
		await run();
	} catch (e) {
	}
})();
