# DSH GF Ultra

把 [dsh-voice-ai-girlfriend](https://github.com/beiyege-01/dsh-voice-ai-girlfriend) 升级成**全程本地、真口型同步**的 AI 女友全家桶。

- 🎙️ 语音对话（FunASR 中文识别 + Qwen3-TTS 音色克隆）
- 👧 数字人皮肤系统（换装面板：视频/图片皮肤，一键切换、上传）
- 🎵 音色管理系统（参考音频上传，多音色一键切换）
- 👄 **实时口型同步**（LiveTalking + wav2lip256，嘴型跟语音走）
- 🧠 本地大模型（llama.cpp + Qwen3-4B，断网可用，无需 API）
- 🌐 整合网页：数字人 + 语音球，说一句答一句

> 所有组件跑在 **Windows 原生环境**（无需 WSL），存储全部在 E 盘。

## 架构

```
你的话 → 浏览器语音球 → 桥接 FunASR 识别(:8765)
   → llama-server Qwen3-4B 思考(:8090, /no_think 关闭思考)
   → LiveTalking edge_tts 合成 + wav2lip 实时口型(:8010)
   → 数字人开口说话，嘴型与语音同步（WebRTC 视频流）
```

```
┌───────────── 浏览器 :8010/girlfriend.html ─────────────┐
│  数字人视频(WebRTC) + 语音球 + 文字输入                  │
└──────┬──────────────────────────────┬─────────────────┘
       │ WebRTC(/offer /human)        │ HTTP (CORS)
┌──────▼─────────────┐      ┌─────────▼──────────────────┐
│ LiveTalking :8010  │      │ 桥接 :8765 (STT/TTS)        │
│ wav2lip 口型       │      │ FunASR + Qwen3-TTS 音色克隆  │
└────────────────────┘      └────────────────────────────┘
┌────────────────────┐      ┌────────────────────────────┐
│ llama-server :8090 │      │ DSH Web :3080 (插件 UI)      │
│ Qwen3-4B 本地 LLM  │      │ ui-voice 皮肤/音色/朗读插件   │
└────────────────────┘      └────────────────────────────┘
```

## 已实现功能清单

| 功能 | 说明 | 状态 |
|---|---|---|
| DSH 语音插件（ui-voice） | 麦克风/朗读/插话开关 + 修复隐藏窗口空白 bug + 修复新会话首条回复不朗读 bug | ✅ |
| 皮肤管理 | 🎨 面板：新建/**重命名**/切换/上传（.mp4 视频 + .jpg 图片待机、视频说话动画），15s 自动刷新 | ✅ |
| 音色管理 | 🎵 面板：多音色列表/切换/**重命名**/上传参考音频（.mp3 直接识别，.mp4 视频只取音轨，自动转 16k WAV） | ✅ |
| 口型同步 | LiveTalking wav2lip256：infer ~48fps / final ~25fps（实时），录制 MP4 验证通过 | ✅ |
| 本地大模型 | llama.cpp + Qwen3-4B-Q4_K_M（2.5GB），`/no_think` 关闭思考，本地回复 | ✅ |
| 整合网页 | `girlfriend.html`：数字人 + 语音球 + 文字输入，说一句答一句 | ✅ |
| 一键启动 | `start-girlfriend.cmd` 双击拉起全部服务 | ✅ |

## 快速开始

```powershell
# 一键启动（LLM + 口型 + 语音桥接）
E:\AI\dsh-voice-ai-girlfriend\start-girlfriend.cmd

# 浏览器打开
http://127.0.0.1:8010/girlfriend.html
#   1. 点「连接数字人」等待出画
#   2. 点语音球说话 / 底部输入框打字
#   3. 数字人开口回答，嘴型跟语音同步
```

其它入口：

| 地址 | 用途 |
|---|---|
| `:8010/girlfriend.html` | 数字人 + 语音球整合页 |
| `:8010/index.html` | LiveTalking 官方测试页 |
| `:8010/avatar.html` | 上传视频生成个人数字人形象 |
| `:3080` | DSH Web（插件 UI：🎨皮肤 🎵音色 🔊朗读 🎙️麦克风） |
| `:8765/api/health` | 语音桥接健康检查 |

## 目录结构

```
dsh-gf-ultra/
├── plugin/        # 增强版 ui-voice 插件源码（皮肤/音色管理 + 修复）
├── bridge/        # 增强版语音桥接（skins/voices API）
├── web/           # 整合页（数字人 + 语音球）
├── scripts/       # 一键启动 / 重启 / 停止脚本
├── patches/       # LiveTalking / TTS 的 Windows 修复补丁
├── config/        # 配置模板
└── docs/          # 详细部署文档
```

## 部署文档

- [01 - 语音桥接与 DSH 插件](docs/01-语音桥接与DSH插件.md)
- [02 - 皮肤与音色管理](docs/02-皮肤与音色管理.md)
- [03 - LiveTalking 口型同步（Windows）](docs/03-LiveTalking口型同步.md)
- [04 - 本地大模型与整合页面](docs/04-本地大模型与整合页面.md)

## 硬件要求

- NVIDIA 显卡 8GB 显存（本项目：RTX 4060 Laptop 8GB 实测通过）
- 磁盘：模型与依赖约 15GB（E 盘）

## 致谢与许可

- 语音桥接/插件：基于 [beiyege-01/dsh-voice-ai-girlfriend](https://github.com/beiyege-01/dsh-voice-ai-girlfriend)（Apache-2.0）增强
- 口型同步：[lipku/LiveTalking](https://github.com/lipku/LiveTalking)（Apache-2.0）+ wav2lip256
- 部署思路参考：零度解说《AI 赛博女友》本地部署教程
- 大模型：Qwen3-4B（Qwen，Apache-2.0 / Qwen License）
