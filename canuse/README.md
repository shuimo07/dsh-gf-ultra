# canuse/ — 当前可用插件备份

> 数字人废案回滚后，**DeepSeek Harness 里实际正在运行的 ui-voice 插件**打包备份。

## 文件

| 文件 | 说明 |
|---|---|
| `dsh-client-ui-voice-harness.zip` | 插件包（60 KB，压缩后），内容见下 |

## 包内容（zip 根 = 插件目录）

```
package.json
lib/client.js       64,554 B  ← 运行时代码（精简版：麦克风STT / 朗读TTS / 音色管理）
lib/client.js.map   100,115 B
lib/index.js        383 B
lib/invariant.js    966 B
lib/types/**        类型声明（含少量废案残留 .d.ts，仅类型、不影响运行）
```

## 还原方法

把 zip 解压覆盖到（需先关掉 DSH Web）：

```
C:\Users\legion\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\
```

刷新页面即生效。对应源码在仓库 `plugin/`（与打包内容一致，构建产物 client.js 相同）。
