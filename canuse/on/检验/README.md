# 检验/ — Harness 当前状态检查记录

> DeepSeek Harness 语音模块**当前运行状态**的逐项检验记录。
> 位置：`canuse/on/` 下（`on/` = 运行状态存档，`检验/` = 该状态的逐项检查结果）。
> 检验时间：**2026-08-18**（首次）；**2026-09-20 复核**（DSH web 升级后复检，见下）。

## 一、运行进程 / 端口

| 服务 | 端口 | 状态 | 进程 | 启动时间 | 说明 |
|---|---|---|---|---|---|
| DSH Web | `:3080` | ✅ LISTENING | node（pid 46804，`D:\AI\固件\node.exe`） | 2026-09-20 22:52（升级后重启；历史 pid 18788/21828/35104/30812） | live home = `E:\.dsh`；**新版带访问令牌鉴权**（无 token 的 HTTP 一律 404，根响应 `dsh web authentication required`） |
| 语音桥接 | `:8765` | ✅ LISTENING | python3.12（pid 30196，venv-speech uvicorn） | 2026-09-20 23:02（应用自愈探测修复后重启；历史 pid 13768/33808） | 独立进程，不受 web 重启影响；模型按需懒加载 |

## 二、插件状态（ui-voice）

- 部署位置（live home）：`E:\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\`
- 版本：**canuse + 自愈增强版** —— `lib\client.js`（65,038 B）SHA256 `CC2AFB8F9B95…`（比 canuse 原始版多一段 VoiceToggle 自检钩子，**每次点击开关都触发**），与 golden `E:\AI\dsh-voice-ai-girlfriend\dist\ui-voice\` **逐文件一致（0 差异）**
- web 实际下发：`/plugins/@deepseek-ai/dsh-client-ui-voice/client.js` 响应体哈希 = `CC2AFB8F…`（= golden）；boot HTML `rev = 14bd10acc0b7`（= 文件 SHA1，替换后按请求重算）
  - **2026-09-20 起**：web 加了访问令牌鉴权，未带 token 的探测请求返回 404 → 自愈里的"web 下发"检查标记为 `unverifiable`（**不再算作漂移**）；带 token 的浏览器会话仍正常拿到插件包
- node 半端 `lib/index.js` = 增强版（4,725 B，带 `/voice-bridge/start|stop` 路由，2026-08-18 恢复，live+golden 同步）：**已生效**——`POST /voice-bridge/start` 实测返回 `{"ok":true,"running":true}`（2026-08-18 02:53），桥接掉线时点击朗读开关即可自动拉起

## 三、音色库

- 位置：`E:\AI\dsh-voice-ai-girlfriend\assets\voices\`（与 `canuse\voices-harness.zip` **一致，0 差异**）
- 音色 6 个：兔娘 / **林起起（激活）** / 棉花 / 阿七 / 麻勒勒 / 黄雨萌（棉花为本地额外音色，不在备份内）
- 激活：林起起（`.active.json`，并经 `/api/voices` 返回确认）

## 四、功能闭环检验（全链路实测）

| 检查项 | 方法 | 结果 |
|---|---|---|
| `/api/health` | GET | ✅ `{"status":"ok","stt":true,"tts":true,"stt_error":null,"tts_error":null}`（模型已加载） |
| `/api/voices` | GET | ✅ 6 个音色 + `active=林起起` |
| TTS 朗读 | POST `/api/tts` `{"text":"…"}` | ✅ 2026-08-18：`audio/wav` 356,396 B / 11.14s；**2026-09-20 复测**：334,892 B / 10.46s @16kHz 单声道，RMS 5235 / peak 27893（非静音） |
| STT 识别 | POST `/api/stt`（合成音频回灌，闭环） | ✅ 识别文本与原文一致（个别音近字属 ASR 正常误差）；2026-09-20 复测同样通过 |
| 音色管理 | `/api/voices/active|rename|delete|upload` | 接口就绪（未做破坏性测试） |
| **自愈 selfheal** | POST `/api/selfheal`（**每次点击朗读开关，开/关都触发**） | ✅ 实测：故意破坏 `lib\client.js` 后，自愈检出 `plugin:lib/client.js=drift` 并从 golden 整目录恢复；音色 zip 为内存内比对。**2026-09-20**：web 探测支持鉴权门（404→unverifiable），复检 `consistent=True` |

> 测试文案：*「你好呀，我是林起起。语音模块正在自检，这段话应该能被朗读出来，麦克风识别也应该正常。如果顺利，我们就可以继续聊天啦。」*

## 五、配置 / 环境

- live home：`E:\.dsh`（`DSH_HOME`）；`C:\Users\legion\.dsh` 为旧 home（web 不从其运行）
- `E:\.dsh\settings.yaml`：`agent-default-model` = deepseek-official / `deepseek-v4-flash`；`ui-theme` = system
- 加载插件（`cordis.patch.yml`）：`ui-skin-center`、`tool-xiaoliuren`、`ui-voice`
- git 推送指向：global `core.sshCommand` → `C:/Windows/System32/OpenSSH/ssh.exe … -i E:/AI/ssh-key/gh_ed25519`（已验证 `git push` 正常）

## 六、结论

✅ Harness 语音模块处于**运行状态**且功能正常（健康检查、音色、TTS、STT、自愈全通）；
web 已升级为带访问令牌鉴权的新版（pid 46804，2026-09-20 22:52 起），本模块未受影响：
插件按磁盘内容下发、rev=SHA1，带 token 的浏览器会话 F5 即生效；桥接为独立进程（pid 30196，2026-09-20 23:02 起）。
