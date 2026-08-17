# on/ — 语音桥接运行状态存档

> 记录 **2026-08-18** 语音桥接**恢复运行**后的状态与实现方法路径。
> 与 `off/`（断开状态备忘）对应：本目录是「如何把语音模块弄回现在这样」的可复现路径，全部步骤已实测。

## 当前状态（2026-08-18，已实测）

| 项 | 状态 |
|---|---|
| 语音桥接 `:8765` | ✅ 运行中（venv-speech + uvicorn，日志 `E:\AI\dsh-voice-ai-girlfriend\.scratch\voice-bridge.log`） |
| DSH Web `:3080` | ✅ 运行中（**live home = `E:\.dsh`**，不是 `C:\Users\legion\.dsh`） |
| ui-voice 插件 | ✅ canuse 精简版 64.5KB，已部署于 live home |
| 音色库 | ✅ 6 个：兔娘 / 林起起（激活）/ 棉花 / 阿七 / 麻勒勒 / 黄雨萌 |
| 功能实测 | ✅ `/api/health` ok；TTS 朗读 11s 音频正常；STT 闭环识别与文案一致 |

## 关键前提（容易踩坑）

1. **live home 是 `E:\.dsh`**：`canuse/README.md` 里写的还原路径 `C:\Users\legion\.dsh\...` 是**旧 home**（web 不从那里跑），别覆盖错地方。
2. **插件替换无需重启 web**：DSH client 插件按请求从磁盘读取、`?rev=` = 文件 SHA1。换文件后 **F5 即生效**（本次实测：替换后 boot rev `5f7b4e9ede42 → a939c5079090`，web 全程无重启）。
3. 桥接是独立 Python 进程，**不会随 web 自动重启**，需按下方方法拉起。

## 实现当前状态的方法路径

### ① 插件（回滚到 canuse 精简版）

解压 `canuse\dsh-client-ui-voice-harness.zip` 覆盖到：

```
E:\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\
```

与 zip 相比当时只有 4 个文件不一致，替换它们即可（其余一致）：

```
lib\client.js         64,554 B  ← 运行时代码（麦克风STT / 朗读TTS / 音色管理）
lib\client.js.map    100,115 B
lib\index.js             383 B  ← node 半端为空（桥接由脚本拉起，不走插件）
lib\types\index.d.ts     383 B
```

验证（无需重启 web）：

```powershell
# 1) 插件响应体哈希应等于 zip 内 lib\client.js：
curl.exe -s "http://127.0.0.1:3080/plugins/@deepseek-ai/dsh-client-ui-voice/client.js" -o served.js
(Get-FileHash served.js -Algorithm SHA256).Hash
#   = 8C5620D3E85E0656C24AC632993F0B550A243CC3F652450B04F046022C253131
# 2) 页面 boot HTML 里的 rev 会随文件内容变化（= 文件 SHA1 前 12 位）
```

> 注意：`E:\AI\packages\client\ui-voice` 是 66,658B **新版构建**的开发目录，live web 不从它读取；
> 若以后从那里重新构建并覆盖 `E:\AI\dsh-voice-ai-girlfriend\dist\ui-voice`（profile 的 `file:` 依赖源），会把新版带回来（当前 dist 已是 canuse 版）。

### ② 音色库

解压 `canuse\voices-harness.zip` 到（桥接在跑时会自动识别，刷新音色管理面板即可）：

```
E:\AI\dsh-voice-ai-girlfriend\assets\voices\
```

`.active.json` 按需保留/覆盖（当前激活 = 林起起）。音色「棉花」不在备份内（音频不公开，仅存本地）。

### ③ 拉起桥接（:8765）

```powershell
# 方式一：一键脚本（会重启 web！不满足"不重启"边界时别用）
E:\AI\dsh-voice-ai-girlfriend\restart-dsh-web.cmd

# 方式二：只起桥接（不碰 web）
E:\AI\dsh-voice-ai-girlfriend\bridge\start-bridge.cmd

# 方式三：手动后台起（本次实测方式）
cd E:\AI\dsh-voice-ai-girlfriend\bridge
$env:TMP="E:\AI\dsh-voice-ai-girlfriend\.scratch"; $env:TEMP=$env:TMP; $env:HF_HOME="$env:TMP\hf-home"; $env:PYTHONIOENCODING="utf-8"
& "E:\AI\dsh-voice-ai-girlfriend\venv-speech\Scripts\python.exe" -m uvicorn voice_bridge:app --host 127.0.0.1 --port 8765

# 方式四：web 未重启且旧 node 半端仍加载时，可用运行中 web 的路由拉起（本次实际使用）
curl.exe -X POST http://127.0.0.1:3080/voice-bridge/start
# → {"ok":true,"running":true}
```

> 回滚版插件的 node 半端（lib/index.js）是空的，**web 下次重启后 `/voice-bridge/start` 路由会消失**，
> 届时只能用方式一/二/三拉桥接。

### ④ 验证

```
http://127.0.0.1:8765/api/health   → {"status":"ok","stt":false,"tts":false,...}（模型按需懒加载）
http://127.0.0.1:8765/api/voices   → 6 个音色 + active
POST /api/tts  {"text":"..."}      → audio/wav（首次加载 10-60s）
POST /api/stt  (16kHz PCM16/wav)   → {text, language}
```

仓库 `bridge/smoke_tts.py` / `bridge/smoke_stt.py` 即现成测试脚本。

## 与 off/ 的关系

- `off/` = 桥接断开状态（2026-08-18 快照）：web 跑、桥接不跑、launcher(:8768) 已删除。
- `on/` = 桥接运行状态：web 跑 + 桥接跑 + 插件/音色 = canuse 备份。**当前处于此状态。**
