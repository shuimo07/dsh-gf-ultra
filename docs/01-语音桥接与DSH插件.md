# 01 - 语音桥接与 DSH 插件

## 语音桥接（FastAPI, :8765）

依赖（`config/requirements-bridge.txt`）：

```powershell
python -m venv venv-speech
venv-speech\Scripts\pip install -r config\requirements-bridge.txt
# CUDA torch（清华镜像只有 CPU 版，必须从 PyTorch 官方源装）
venv-speech\Scripts\pip install --force-reinstall --no-deps "torch==2.13.0+cu126" "torchaudio==2.11.0+cu126" --index-url https://download.pytorch.org/whl/cu126
```

模型（ModelScope 下载）：

```powershell
# FunASR（STT）
venv-speech\Scripts\python -m modelscope download --model iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch --local_dir models\funasr\<id>
# Qwen3-TTS 1.7B Base（声音克隆，必须 Base 版）
venv-speech\Scripts\python -m modelscope download --model Qwen/Qwen3-TTS-12Hz-1.7B-Base --local_dir Qwen3-TTS-12Hz-1.7B-Base
```

> `python -m modelscope` 在新版不可用，用 `snapshot_download` API 或 CLI。

配置：复制 `bridge-config.example.json` → `bridge-config.json`，改 `tts.model_name`、`tts.ref_audio`、`tts.ref_text`。

启动：

```powershell
venv-speech\Scripts\python.exe -m uvicorn voice_bridge:app --host 127.0.0.1 --port 8765
```

## DSH 插件（ui-voice）

插件源码在 `plugin/`，DSH 以 npm 包方式运行时，安装路径为：

```
C:\Users\<user>\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\
```

注册：在 `~/.dsh/profiles/web/cordis.patch.yml` 加：

```yaml
- insert:
    - id: ui-voice
      name: '@deepseek-ai/dsh-client-ui-voice'
```

独立构建（无需整个 harness monorepo）：

```bash
npm i -D typescript tsdown lightningcss @types/react   # 构建工具
tsc -p tsconfig.json                                   # 类型 + lib/types
tsdown --config tsdown.config.ts                        # lib/index.js + lib/client.js
```

客户端 bundle 通过 `window.__ModuleLoader__.load({id, factory})` 加载，外部依赖只有 react 等平台模块。

## 修复记录

- **隐藏女友窗后点不回来**：隐藏时 `<video>` 元素被卸载，重新显示时设置视频源的 effect 依赖里没有 `visible`，不会重跑 → 视频空白。修复：effect 依赖加入 `visible`。
- **新会话首条回复不朗读**：历史基线判定把新会话第一条 settled 回复当历史吞掉。修复：记录流式 `running` 锚点 + 挂载 1.5s 无历史则冻结基线为 0。
- **回复含 emoji 时 TTS 崩溃（500）**：qwen3_tts_handler 控制台打印 emoji 在 GBK 下崩溃。修复见 `patches/qwen3-tts-emoji-print.patch`。
