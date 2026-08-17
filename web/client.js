// 小雅 AI 女友整合页：LiveTalking 数字人(WebRTC) + 语音球(桥接STT) + LLM(llama.cpp) + 口型(文本驱动)
'use strict';

const BRIDGE = 'http://127.0.0.1:8765';
const LLM_URL = 'http://127.0.0.1:8090/v1/chat/completions';
const PERSONA = '你叫小雅，是他的女朋友。你不是AI、不是助手、不是程序。说话口语化、每次两三句、带语气词（嗯、诶、呀）、有情绪。不用Markdown、列表、编号、表情符号。\n/no_think';

let pc = null;
let sessionid = '';
let history = [];
let lastSoundAt = 0;

const $ = (id) => document.getElementById(id);

// ── LiveTalking WebRTC 连接 ──────────────────────────────────────────────
function negotiate() {
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  return pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') resolve();
      else pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
    }))
    .then(() => fetch('/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: pc.localDescription.sdp, type: pc.localDescription.type }),
    }))
    .then((r) => r.json())
    .then((answer) => {
      sessionid = answer.sessionid;
      return pc.setRemoteDescription(answer);
    });
}

function connectDigitalHuman() {
  pc = new RTCPeerConnection({ sdpSemantics: 'unified-plan' });
  pc.addEventListener('track', (evt) => {
    if (evt.track.kind === 'video') $('video').srcObject = evt.streams[0];
    else $('audio').srcObject = evt.streams[0];
  });
  $('status').textContent = '连接中…';
  negotiate()
    .then(() => { $('status').textContent = '已连接 · 点球说话'; $('connectBtn').textContent = '重新连接'; })
    .catch((e) => { $('status').textContent = '连接失败: ' + e.message; });
}

// ── 语音球：录音 → 桥接STT ───────────────────────────────────────────────
let audioCtx = null;
let recorder = null;
let rafId = 0;
let silentMs = 0;
let chunks = [];

function stopRecording() {
  if (recorder) { recorder.onaudioprocess = null; recorder.disconnect(); recorder = null; }
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  $('ball').classList.remove('listening');
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      audioCtx = new AudioContext({ sampleRate: 16000 });
      const src = audioCtx.createMediaStreamSource(stream);
      recorder = audioCtx.createScriptProcessor(4096, 1, 1);
      chunks = [];
      silentMs = 0;
      recorder.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
        const now = Date.now();
        if (peak < 0.012) {
          if (lastSoundAt && now - lastSoundAt > 1800) { stopRecording(); sendAudio(); return; }
        } else {
          lastSoundAt = now;
        }
        // keep 16k PCM16 bytes
        const buf = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) buf[i] = Math.max(-1, Math.min(1, data[i])) * 0x7fff;
        chunks.push(new Uint8Array(buf.buffer));
      };
      src.connect(recorder);
      recorder.connect(audioCtx.destination);
      $('ball').classList.add('listening');
      $('ballHint').textContent = '聆听中…说完停一下自动发送';
      $('status').textContent = '聆听中…';
    })
    .catch((e) => { $('status').textContent = '麦克风不可用: ' + e.message; });
}

function sendAudio() {
  const body = new Blob(chunks);
  if (body.size < 2000) { $('status').textContent = '没听到声音，再试一次'; return; }
  $('status').textContent = '识别中…';
  fetch(BRIDGE + '/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Max-Audio-Sec': '30' },
    body,
  })
    .then((r) => r.json())
    .then((res) => {
      const text = (res.text || '').trim();
      if (!text) { $('status').textContent = '没识别到内容'; return; }
      addLog(text, 'me');
      askLLM(text);
    })
    .catch((e) => { $('status').textContent = '识别失败: ' + e.message; });
}

// ── LLM（llama.cpp）─────────────────────────────────────────────────────
function askLLM(userText) {
  $('status').textContent = '思考中…';
  history.push({ role: 'user', content: userText });
  fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: PERSONA }, ...history.slice(-8)], max_tokens: 400 }),
  })
    .then((r) => r.json())
    .then((data) => {
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
      if (!reply) { $('status').textContent = '大模型无回复'; return; }
      history.push({ role: 'assistant', content: reply });
      addLog(reply, 'her');
      speak(reply);
    })
    .catch((e) => { $('status').textContent = '大模型失败: ' + e.message; });
}

// ── 数字人说话（文本驱动，LiveTalking 内部 TTS + 口型）──────────────────
function speak(text) {
  if (!sessionid) { $('status').textContent = '未连接数字人'; return; }
  $('status').textContent = '说话中…';
  fetch('/human', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionid, text, type: 'echo' }),
  })
    .then((r) => r.json())
    .then((res) => {
      if (res.code === 0) setTimeout(() => { $('status').textContent = '已连接 · 点球说话'; }, 3000);
      else $('status').textContent = '数字人: ' + (res.msg || 'err');
    })
    .catch((e) => { $('status').textContent = '数字人失败: ' + e.message; });
}

function addLog(text, who) {
  const line = document.createElement('div');
  line.className = who;
  line.textContent = (who === 'me' ? '你：' : '小雅：') + text;
  $('log').appendChild(line);
  while ($('log').childNodes.length > 12) $('log').removeChild($('log').firstChild);
}

// ── 事件绑定 ────────────────────────────────────────────────────────────
$('connectBtn').addEventListener('click', connectDigitalHuman);
$('ball').addEventListener('click', () => {
  if (recorder) stopRecording();
  else startRecording();
});
$('send').addEventListener('click', () => {
  const text = $('text').value.trim();
  if (!text) return;
  $('text').value = '';
  addLog(text, 'me');
  askLLM(text);
});
$('text').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('send').click(); });
