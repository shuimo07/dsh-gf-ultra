# canuse/ — 当前可用备份

> 数字人废案回滚后，**DeepSeek Harness 里实际正在运行的 ui-voice 插件**与**当前音色库**打包备份。

## 文件

| 文件 | 说明 |
|---|---|
| `dsh-client-ui-voice-harness.zip` | 插件包（60 KB，压缩后），内容见下 |
| `voices-harness.zip` | 当前音色库（2.4 MB）：兔娘 / 林起起 / 阿七 / 麻勒勒 / 黄雨萌 |
| `waiting/黄雨萌.mp4` | 黄雨萌音色的原始视频（音轨提取为参考音频） |

> 音色「棉花」不在备份内（其音频素材不公开，仅存于本地 `E:\AI\dsh-voice-ai-girlfriend\waiting\棉花\` 与 `assets\voices\棉花\`）。

## 插件包内容（zip 根 = 插件目录）

```
package.json
lib/client.js       64,554 B  ← 运行时代码（精简版：麦克风STT / 朗读TTS / 音色管理）
lib/client.js.map   100,115 B
lib/index.js        383 B
lib/invariant.js    966 B
lib/types/**        类型声明（含少量废案残留 .d.ts，仅类型、不影响运行）
```

## 音色包内容（zip 根 = voices 目录）

```
兔娘/ref_audio.wav + ref_text.txt
林起起/ref_audio.wav + ref_text.txt   ← 当前激活音色
阿七/ref_audio.wav + ref_text.txt
麻勒勒/ref_audio.wav + ref_text.txt
黄雨萌/ref_audio.wav + ref_text.txt
.active.json        ← 激活状态（还原时按需保留/覆盖）
```

## 还原方法

插件：把 zip 解压覆盖到（需先关掉 DSH Web）：

```
C:\Users\legion\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\
```

音色：解压到（桥接在跑时会自动识别，刷新音色管理面板即可）：

```
E:\AI\dsh-voice-ai-girlfriend\assets\voices\
```

刷新页面即生效。插件对应源码在仓库 `plugin/`（与打包内容一致，构建产物 client.js 相同）。
