# off/ — 桥接断开状态存档

> 记录 **2026-08-18** 的"语音桥断开"状态快照。此目录不是可运行包，只是状态备忘。

## 当时状态

| 项 | 状态 |
|---|---|
| 语音桥接 `:8765` | ❌ 断开（无进程监听） |
| 桥接 launcher `:8768` | ❌ 不存在（进程级启停方案已回滚删除） |
| DSH Web `:3080` | ✅ 运行中 |

## 背景

- 插件（回滚版 64.5KB）已部署在 Harness：`C:\Users\legion\.dsh\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-voice\`
- 音色库 6 个：兔娘 / 林起起（激活）/ 棉花 / 阿七 / 麻勒勒 / 黄雨萌
- 桥接为独立 Python 进程（venv-speech + uvicorn），**不会自动恢复**，需手动拉起

## 恢复桥接的方法

```powershell
# 方式一：一键脚本（会重启 web 并拉起桥接）
E:\AI\dsh-voice-ai-girlfriend\restart-dsh-web.cmd

# 方式二：只起桥接（不碰 web）
E:\AI\dsh-voice-ai-girlfriend\bridge\start-bridge.cmd

# 方式三：手动后台起
cd E:\AI\dsh-voice-ai-girlfriend\bridge
$env:TMP="E:\AI\dsh-voice-ai-girlfriend\.scratch"; $env:TEMP=$env:TMP; $env:HF_HOME="$env:TMP\hf-home"; $env:PYTHONIOENCODING="utf-8"
& "E:\AI\dsh-voice-ai-girlfriend\venv-speech\Scripts\python.exe" -m uvicorn voice_bridge:app --host 127.0.0.1 --port 8765
```

拉起后验证：`http://127.0.0.1:8765/api/health` 返回 `{"status":"ok",...}`。
