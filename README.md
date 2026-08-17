# DSH GF Ultra

> ## 🚧 项目已太监（Abandoned）
>
> 本项目于 2026-08 正式停止开发。**数字人 / 真口型（LiveTalking + wav2lip）/ 本地大模型（llama.cpp + Qwen3-4B）部分已成废案**，
> 相关代码保留在此仅作历史存档，不再维护、不再保证可用。
>
> 保留下来并实际在用的是其中的**语音模块**：给 [dsh-voice-ai-girlfriend](https://github.com/beiyege-01/dsh-voice-ai-girlfriend)
> 的 DeepSeek Harness 语音插件做的一整套增强与修复（麦克风 STT、朗读 TTS、音色管理）。该模块在本仓库 `plugin/` + `bridge/` 中可独立使用。
>
> 已从使用环境（DSH Harness 插件）移除的功能：皮肤管理、女友窗、QQ 推送、排队/插话模式；对应桥接接口（`/api/skins*`、`/api/media/*`、`/api/qq/*`、`/api/companion/*`、`/api/bridge/unload`）已删除。
> 开发过程中使用的皮肤素材（视频/图片）与音色素材（参考音频）打包在 `assets/` 下存档。

## 当前可用功能（语音模块）

- 🎙️ 麦克风对话：浏览器录音 → 桥接 FunASR 中文识别（`/api/stt`）
- 🔊 朗读回复：Qwen3-TTS 音色克隆 TTS（`/api/tts`），支持打断（服务端 silero VAD 抢话）
- 🎵 音色管理：多音色列表 / 切换 / **重命名** / 删除（进回收站）/ 上传参考音频（.mp3 直接识别，.mp4 视频只取音轨，自动转 16k WAV）
- 🛠️ 修复清单：女友窗隐藏后空白、新会话首条回复不朗读、emoji 导致 TTS 崩溃、朗读偶发卡死（45s 超时）

> 所有组件跑在 **Windows 原生环境**（无需 WSL），存储全部在 E 盘。

## 架构（语音模块）

```
你的话 → 浏览器语音球(麦克风) → 桥接 FunASR 识别(:8765) → DSH 大模型回复
   → 桥接 Qwen3-TTS 克隆音色合成(:8765) → 浏览器播放 🔊朗读
   → 播放中抢话由 /api/vad（silero VAD）实时检测，支持打断
```

```
┌───────────── 浏览器 DSH Web :3080 ──────────────┐
│  ui-voice 插件：🎙️麦克风 🔊朗读 🎵音色管理       │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────┐
│ 语音桥接 :8765 (FastAPI)                         │
│  FunASR 中文 STT + Qwen3-TTS 音色克隆 + VAD 抢话  │
│  /api/stt /api/tts /api/vad /api/voices*        │
└─────────────────────────────────────────────────┘
```

## 历史（废案部分，仅存档）

| 功能 | 说明 | 状态 |
|---|---|---|
| 数字人 + 真口型 | LiveTalking + wav2lip256（WebRTC 视频流） | ❌ 废案 |
| 本地大模型 | llama.cpp + Qwen3-4B-Q4_K_M（:8090） | ❌ 废案 |
| 皮肤管理 | 视频/图片皮肤切换、上传 | ❌ 已移除 |
| 女友窗 | 显示/隐藏联动启停 LiveTalking + llama | ❌ 已移除 |
| QQ 推送 | NapCat OneBot 双向桥 | ❌ 已移除 |
| 排队/插话模式 | 插件 BusyToggle | ❌ 已移除 |

废案相关源码：`web/`（数字人整合页）、`patches/`（LiveTalking/TTS Windows 补丁）、`docs/03`、`docs/04`。

## 当前可用功能清单

| 功能 | 说明 | 状态 |
|---|---|---|
| DSH 语音插件（ui-voice） | 麦克风/朗读/音色管理 + 全部 bug 修复 | ✅ |
| 音色管理 | 列表/切换/重命名/删除（回收站）/上传（.mp3 直接识别，.mp4 取音轨转 16k WAV） | ✅ |
| 语音桥接 | `/api/stt` `/api/tts` `/api/vad` `/api/voices*` `/api/health` | ✅ |

## 一键开关（语音模块）

| 你的操作 | 自动触发 |
|---|---|
| 🔊 开启朗读 | 桥接按需加载 FunASR + TTS 模型（首次等几秒） |
| 🔊 关闭朗读 | 桥接进程整体停止（进程级启停，不占显存） |

## 存储位置（全部在 E 盘）

| 内容 | 位置 |
|---|---|
| 项目代码 / 插件 / 脚本 | `E:\AI\dsh-voice-ai-girlfriend`、`E:\AI\dsh-gf-ultra`（本仓库） |
| 皮肤 / 音色素材（已存档） | 本仓库 `assets\skins`、`assets\voices` |
| STT/TTS 模型权重 | `E:\AI\dsh-voice-ai-girlfriend\models`、`Qwen3-TTS-12Hz-1.7B-Base` |
| 临时 / 缓存 | `E:\AI\dsh-voice-ai-girlfriend\.scratch` |

## 快速开始（语音模块）

```powershell
# 1. 安装依赖并下载模型（首次）
E:\AI\dsh-voice-ai-girlfriend\setup-deps.ps1
E:\AI\dsh-voice-ai-girlfriend\setup-models.ps1

# 2. 启动语音桥接（:8765）
E:\AI\dsh-voice-ai-girlfriend\bridge\start-bridge.cmd

# 3. 启动 DSH Web（:3080），插件里开麦克风/朗读即可
http://127.0.0.1:3080
```

## 目录结构

```
dsh-gf-ultra/
├── plugin/        # ui-voice 插件源码（语音模块，含全部修复）
├── bridge/        # 语音桥接（STT / TTS / VAD / 音色管理 API）
├── assets/        # 📦 开发期使用的皮肤（视频/图片）+ 音色（参考音频）存档
├── web/           # 🗄️ 废案：数字人整合页（仅存档）
├── scripts/       # 一键启动 / 重启 / 停止脚本
├── patches/       # 🗄️ 废案：LiveTalking / TTS 的 Windows 修复补丁（仅存档）
├── config/        # 配置模板
└── docs/          # 部署文档（01/02 语音模块；03/04 废案存档）
```

## 部署文档

- [01 - 语音桥接与 DSH 插件](docs/01-语音桥接与DSH插件.md)
- [02 - 皮肤与音色管理](docs/02-皮肤与音色管理.md)（皮肤部分已废案，音色部分仍有效）
- [03 - LiveTalking 口型同步（Windows）](docs/03-LiveTalking口型同步.md)（🗄️ 废案存档）
- [04 - 本地大模型与整合页面](docs/04-本地大模型与整合页面.md)（🗄️ 废案存档）

## 硬件要求

- NVIDIA 显卡 8GB 显存（本项目：RTX 4060 Laptop 8GB 实测通过，语音模块满载 ~4GB）
- 磁盘：模型与依赖约 8GB（E 盘）

## 致谢与许可

- 语音桥接/插件：基于 [beiyege-01/dsh-voice-ai-girlfriend](https://github.com/beiyege-01/dsh-voice-ai-girlfriend)（Apache-2.0）增强
- 废案部分部署思路参考：零度解说《AI 赛博女友》本地部署教程
