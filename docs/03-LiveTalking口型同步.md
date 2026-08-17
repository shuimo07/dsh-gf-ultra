# 03 - LiveTalking 口型同步（Windows 原生）

[lipku/LiveTalking](https://github.com/lipku/LiveTalking) + wav2lip256，Windows 原生部署（无需 WSL）。

## 安装

```powershell
git clone https://github.com/lipku/LiveTalking.git E:\AI\LiveTalking
cd E:\AI\LiveTalking
python -m venv .venv-lt
.venv-lt\Scripts\pip install torch==2.9.1 torchvision==0.24.1 torchaudio==2.9.1 --index-url https://download.pytorch.org/whl/cu128
.venv-lt\Scripts\pip install -r requirements.txt
```

> 官方 README 已支持 Python 3.12 + torch 2.9.1 cu128。

## 模型

- `wav2lip256.pth` → `models/wav2lip.pth`（**必须重命名**，代码写死路径）
- `wav2lip256_avatar1.tar.gz` → 解压到 `data/avatars/wav2lip256_avatar1/`

模型来源：夸克网盘/Google Drive（官方 README），或第三方部署包。

## ffmpeg

LiveTalking 录制需要系统 ffmpeg（Windows 上无内置）。安装：

```powershell
npm install ffmpeg-static   # 自带完整 ffmpeg.exe
# 把 node_modules\ffmpeg-static\ffmpeg.exe 放到 PATH 中（如 E:\AI\ffmpeg\）
```

## 启动

```powershell
$env:PATH = "E:\AI\ffmpeg;$env:PATH"
.venv-lt\Scripts\python app.py --transport webrtc --model wav2lip --avatar_id wav2lip256_avatar1
```

验证：`http://127.0.0.1:8010/index.html`，或无浏览器验证（记录 MP4）：

```
POST /offer (WebRTC SDP) → sessionid
POST /record {type:start_record}
POST /human {sessionid, text, type:echo}   # edge_tts 合成 + wav2lip 渲染
POST /record {type:end_record}
GET  /record/{sessionid} → MP4
```

实测：infer ~48fps / final ~25fps（实时达标），576×768@25fps 音视频同步。

## Windows 修复补丁

- `patches/livetalking-windows-record.patch`：`start_recording` 时 `width/height` 可能为 0（首次渲染帧还没到），导致 ffmpeg `-s 0x0` 启动失败。修复：从 `frame_list_cycle` 首帧推导尺寸。

## 换自己的形象

`http://127.0.0.1:8010/avatar.html`：上传一个 5s 左右的闭嘴底版视频（idle.mp4），Avatar ID 保留 `wav2lip256_` 前缀，提交生成后重启服务并换 `--avatar_id`。

> 口型模型替换的是嘴部区域，底版视频人物手部不要遮挡下颌线，否则出鬼影。
