# 语音英语查询

一款面向小朋友的中英文单词语音查询应用。按住圆形按钮说出中文词语（或英文单词），即可显示对应的英文单词、中文释义，并自动朗读单词发音和逐字母拼写（如 apple → A-P-P-L-E）。点击单词可重复朗读拼写。

- **手机 / iPad / 电脑** 浏览器均可使用
- **词库来源：有道词典**（suggest JSONP 接口 + 有道发音，无跨域限制）
- 中文 ⇄ 英文 双向识别与查询
- **纯静态单页**，可直接托管在 GitHub Pages，无需后端

## 在线使用

本项目已发布到 GitHub Pages，手机/iPad 直接用浏览器打开：

https://nucleonshux.github.io/voice-english-query/

> 语音识别（Web Speech API）要求 HTTPS 环境，GitHub Pages 自带 HTTPS，手机浏览器可直接使用语音功能。

## 功能

- 按住说话：长按圆形按钮说出中文或英文，松手自动查询
- 智能切换识别语言：说中文用中文识别，说英文自动切英文识别
- 大字单词 + 小字释义，排版适合儿童阅读
- 自动朗读：有道美音读单词 → 逐字母拼写（带字母高亮动画）
- 点击单词：重复朗读拼写
- 键盘输入降级模式：麦克风不可用时可直接输入查询

## 本地运行（任选其一）

### 方式一：直接打开静态页（最简单）

浏览器直接打开 `client/index.html` 即可使用（无需任何依赖）。

### 方式二：Node 静态托管

需要 Node.js 16+。

```bash
# 在项目根目录
npm start
# 或
node server/index.js
```

然后浏览器打开 <http://localhost:3000> 即可使用。

## 项目结构

```
├── client/
│   └── index.html        # 纯静态前端（语音识别 + 有道查询 + 朗读）
├── server/
│   └── index.js          # 可选：Node 静态托管（也可做完整词典代理）
├── package.json
└── README.md
```

## 技术说明

- 语音识别：浏览器原生 Web Speech API（`webkitSpeechRecognition`），无需额外 SDK
- 词库：有道词典 suggest 接口（`dict.youdao.com/suggest`），支持 JSONP，中英双向
- 单词发音：有道发音接口（`dict.youdao.com/dictvoice`），美音 mp3
- 拼读：浏览器原生 SpeechSynthesis 逐字母朗读

## License

MIT
