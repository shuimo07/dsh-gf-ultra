# 检验/ — Harness 当前状态检查记录

> DeepSeek Harness 语音模块**当前运行状态**的逐项检验记录。
> 位置：`canuse/on/` 下（`on/` = 运行状态存档，`检验/` = 该状态的逐项检查结果）。
> 检验时间：**2026-08-18 首次** → **2026-09-20 复核** → **2026-09-20 23:27 修复后复验（当前有效）**。

## 〇、当前状态一句话（2026-09-20 23:27 实测）

✅ **全通**：DSH 0.1.6-alpha.2（带令牌鉴权）下，插件正常挂载（麦克风/朗读/音色管理按钮齐全）、
**回复朗读已恢复**（桥接日志连续出现 `POST /api/tts → 200`，逐句流式合成）、音色库/自愈/桥接全部正常。

## 一、运行进程 / 端口

| 服务 | 端口 | 状态 | 进程 | 启动时间 | 说明 |
|---|---|---|---|---|---|
| DSH Web | `:3080` | ✅ LISTENING | node（pid 46804，`D:\AI\固件\node.exe`） | 2026-09-20 22:52（DSH 升级到 0.1.6-alpha.2 后重启；历史 pid 18788/21828/35104/30812） | live home = `E:\.dsh`；**带访问令牌鉴权**（无 token 的 HTTP → 404，根响应 `dsh web authentication required`） |
| 语音桥接 | `:8765` | ✅ LISTENING | python3.12（pid 39044，venv-speech uvicorn） | 2026-09-20 23:05（由 web 的 `/voice-bridge/start` 路由拉起，detached；历史 pid 13768/33808/30196） | 独立进程；模型按需懒加载 |

## 二、插件状态（ui-voice）

- 部署位置（live home）：`E:\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\`
- 版本：**canuse + 自愈增强 + 0.1.6 兼容修复**，与 golden `E:\AI\dsh-voice-ai-girlfriend\dist\ui-voice\` **逐文件一致（0 差异）**：

| 文件 | 大小 | SHA256（前 16） | 说明 |
|---|---|---|---|
| `package.json` | 994 B | `C34D156B44734B66` | 已移除 `@deepseek-ai/dsh-client-runtime`（0.1.6 已删除该包） |
| `lib/client.js` | 65,369 B | `2F38C084727DE580` | canuse + 点击自愈钩子 + `useChat` 朗读监听 + 面板位置修复；**rev = `a6d002d3ee56`**（SHA1，按请求重算） |
| `lib/index.js` | 4,725 B | `4E60E3D927B51EF7` | node 半端，带 `/voice-bridge/start|stop` 路由（桥接掉线时点击朗读开关可自动拉起） |

- web 下发：带 token 的浏览器会话按请求拿到上述 `client.js`（rev `a6d002d3ee56`）；未带 token 的探测返回 404 → 自愈标记 `unverifiable`（**不算漂移**）。
- **2026-09-20 三处兼容修复**（DSH rc → 0.1.6-alpha.2）：
  1. **依赖**：`dsh.client.inject` 移除已被删除的 `@deepseek-ai/dsh-client-runtime` —— 原先客户端加载器一直等待该插件 id，导致 **ui-voice 整体不挂载**（无按钮、不朗读）；
  2. **朗读链路**：`SessionSnapshot` 已删除 `chat` 字段 → 原 `snapshot.chat.nodes` 必抛 `TypeError`，回复永不朗读（`/api/tts` 恒为 0）。改为会话级 `useChat((s) => s)` 取 ChatSnapshot（`snapshot.nodes.values()`），并保留旧框架回退；
  3. **面板位置**：0.1.6 输入框行带 `container-type: inline-size`（成为 `position:fixed` 后代的包含块），音色管理面板原先的全屏浮层被限制在该行内、显得贴底 → 改为相对输入框行**向上弹出**的浮层。

## 三、音色库

- 位置：`E:\AI\dsh-voice-ai-girlfriend\assets\voices\`（与 `canuse\voices-harness.zip` **一致，0 差异**）
- 音色 6 个：兔娘 / **林起起（激活）** / 棉花 / 阿七 / 麻勒勒 / 黄雨萌（棉花为本地额外音色，不在备份内）
- 激活：林起起（`.active.json`，并经 `/api/voices` 返回确认）

## 四、功能闭环检验（全链路实测）

| 检查项 | 方法 | 结果 |
|---|---|---|
| `/api/health` | GET | ✅ `{"status":"ok","stt":false,"tts":true,...}`（模型按需加载，TTS 已加载） |
| `/api/voices` | GET | ✅ 6 个音色 + `active=林起起`；2026-09-20 23:20 起日志出现该请求 = **插件已挂载** |
| **回复朗读（TTS）** | 插件朗读监听 → POST `/api/tts` | ✅ **2026-09-20 23:26–23:27 实测**：连续多条 `POST /api/tts → 200`，`TTS OK: 28/72/88 chars → 4.6/13.1/14.1s wav`（逐句流式）；修复前为 0 次 |
| TTS 独立测试 | POST `/api/tts` `{"text":"…"}` | ✅ 2026-08-18：356,396 B / 11.14s；2026-09-20 复测：334,892 B / 10.46s @16kHz，RMS 5235 / peak 27893 |
| STT 识别 | POST `/api/stt`（合成音频回灌，闭环） | ✅ 识别文本与原文一致（个别音近字属 ASR 正常误差），2026-09-20 复测通过 |
| 音色管理 | `/api/voices/active|rename|delete|upload` | 接口就绪；面板改为输入框上方弹出 |
| **自愈 selfheal** | POST `/api/selfheal`（每次点击朗读开关，开/关都触发） | ✅ 复检 `consistent=True`；破坏 `lib\client.js` 后可自动从 golden 恢复；web 探测支持鉴权门（404→unverifiable） |
| 桥接自动拉起 | POST `:3080/voice-bridge/start` | ✅ 实测：停掉桥接后调用该路由 → `{"ok":true,"running":true}`，桥接自行拉起（免 token） |

> 测试文案：*「你好呀，我是林起起。语音模块正在自检，这段话应该能被朗读出来，麦克风识别也应该正常。如果顺利，我们就可以继续聊天啦。」*

## 五、配置 / 环境

- live home：`E:\.dsh`（`DSH_HOME`）；`C:\Users\legion\.dsh` 为旧 home（web 不从其运行）
- DSH 版本：**0.1.6-alpha.2**（`E:\WBData\roaming\npm\node_modules\@deepseek-ai\dsh`）
- `E:\.dsh\settings.yaml`：`agent-default-model` = deepseek-official / `deepseek-v4-flash`
- 加载插件（`cordis.patch.yml`）：`tool-xiaoliuren`、`ui-voice`、`dsh-vscode-bridge`、三个 Power BI MCP
- git 推送指向：global `core.sshCommand` → `C:/Windows/System32/OpenSSH/ssh.exe … -i E:/AI/ssh-key/gh_ed25519`（已验证 `git push` 正常）

## 六、结论

✅ **语音模块处于运行状态且功能完整**：插件挂载、麦克风、回复朗读（TTS）、音色库、自愈、桥接自动拉起全部实测通过；
web 为 0.1.6-alpha.2（pid 46804，带令牌鉴权），桥接为独立进程（pid 39044，web 路由拉起）；
插件改动按请求下发（rev=SHA1），**F5 即生效**，无需重启 web。
