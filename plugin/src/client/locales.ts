/** `voice` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'mic.title': '语音输入',
  'mic.listening': '正在聆听…再点一下停止',
  'mic.transcribing': '识别中…',
  'mic.error': '语音输入不可用',
  'toggle.onHint': '开启语音朗读',
  'toggle.offHint': '关闭语音朗读',
  'voice.openHint': '音色管理',
  'voice.title': '音色管理',
  'voice.close': '关闭',
  'voice.empty': '还没有音色：上传一段参考音频即可创建',
  'voice.active': '使用中',
  'voice.switch': '使用',
  'voice.uploadTitle': '上传新音色',
  'voice.namePlaceholder': '音色名称（如：萝莉音）',
  'voice.textPlaceholder': '参考音频里说的话（逐字一致）',
  'voice.chooseFile': '选择音频',
  'voice.fileChosen': '已选择',
  'voice.upload': '上传并启用',
  'voice.uploading': '处理中…',
  'voice.hint': '切换音色后，下一次朗读生效（首次加载需几秒）。参考音频 3-60 秒、干净人声效果最佳。',
  'voice.rename': '重命名',
  'voice.renamePrompt': '输入新名称：',
  'voice.delete': '删除（进回收站）',
  'voice.deleteConfirm': '确定删除音色 ',
} satisfies Record<string, string>

/** The voice namespace key union. */
export type VoiceKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'mic.title': 'Voice input',
  'mic.listening': 'Listening… click again to stop',
  'mic.transcribing': 'Transcribing…',
  'mic.error': 'Voice input unavailable',
  'toggle.onHint': 'Turn on voice reading',
  'toggle.offHint': 'Turn off voice reading',
  'voice.openHint': 'Voice manager',
  'voice.title': 'Voice manager',
  'voice.close': 'Close',
  'voice.empty': 'No voices yet: upload a reference clip to create one',
  'voice.active': 'Active',
  'voice.switch': 'Use',
  'voice.uploadTitle': 'New voice',
  'voice.namePlaceholder': 'Voice name',
  'voice.textPlaceholder': 'The sentence spoken in the clip (verbatim)',
  'voice.chooseFile': 'Choose audio',
  'voice.fileChosen': 'Selected',
  'voice.upload': 'Upload & activate',
  'voice.uploading': 'Processing…',
  'voice.hint': 'Switch takes effect on the next reading (a few seconds to load). 3-60s clean voice clips work best.',
  'voice.rename': 'Rename',
  'voice.renamePrompt': 'New name:',
  'voice.delete': 'Delete (to Recycle Bin)',
  'voice.deleteConfirm': 'Delete voice ',
} satisfies Record<VoiceKey, string>
