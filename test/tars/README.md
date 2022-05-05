# Note

```json
{
  quality: 0,
  codePath: undefined,
  workspacePath: '/var/folders/mb/00b21lts0sb5gx93cvn_g3l00000gn/T/vscsmoke/vscode-smoketest-express',
  userDataDir: '/var/folders/mb/00b21lts0sb5gx93cvn_g3l00000gn/T/vscsmoke/d',
  extensionsPath: '/var/folders/mb/00b21lts0sb5gx93cvn_g3l00000gn/T/vscsmoke/extensions-dir',
  waitTime: 20,
  logger: MultiLogger { loggers: [ [FileLogger] ] },
  logsPath: '/Users/ae86/Projects/github/vscode/.build/logs/smoke-tests-electron',
  verbose: false,
  remote: false,
  web: false,
  legacy: false,
  tracing: false,
  headless: false,
  browser: undefined,
  extraArgs: []
}
```


## quokka.js

quokka新建js，里面data-uri是`untitled:Untitled-1`

```js
await app.workbench.editor.waitForTypeInEditor('untitled:Untitled-1', '');
```


## playwright

playwright工程里的packages/playwright-core/src/server的 input.ts文件很有参考价值。

playwright虽然有slowMo属性可以配置，Electron却没有这个属性。但为了精细控制，我们最好不要这个slowMo属性。


## 自动补全

https://code.visualstudio.com/docs/editor/intellisense
思路一：补全的触发时间大于输入时间，比如200ms后触发，而输入间隔是100ms。


## 架构

