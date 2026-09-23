# 语音英语查询

一款面向小朋友的中英文单词语音查询应用。按住圆形按钮说出中文词语（或英文单词），即可显示对应的英文单词、音标、中文释义，并自动朗读单词发音和逐字母拼写（如 apple → A-P-P-L-E）。点击单词可重复朗读拼写。

- **手机 / iPad / 电脑** 浏览器均可使用
- **词库来源：有道词典**（后端代理查询，避免浏览器跨域限制）
- 中文 ⇄ 英文 双向识别与查询

## 功能

- 按住说话：长按圆形按钮说出中文或英文，松手自动查询
- 智能切换识别语言：说中文用中文识别，说英文自动切英文识别
- 大字单词 + 小字释义，排版适合儿童阅读
- 自动朗读：单词发音 → 逐字母拼写（带字母高亮动画）
- 点击单词：重复朗读拼写
- 键盘输入降级模式：麦克风不可用时可直接输入查询

## 本地运行

需要 Node.js 16+。

```bash
# 在项目根目录
npm start
# 或
node server/index.js
```

然后浏览器打开 <http://localhost:3000> 即可使用。

> 手机/iPad 真机使用时，语音识别（Web Speech API）要求 **HTTPS 或 localhost**。部署到 HTTPS 环境（如 Vercel / Render / 云服务器）后手机浏览器即可正常使用语音功能。

## 部署到线上（可选）

本项目是纯 Node 后端 + 静态前端，可直接部署到任何支持 Node.js 的平台：

1. **Vercel / Render / Railway**：选择 Node 服务，构建命令留空，启动命令 `npm start`（或 `node server/index.js`），环境变量设置 `PORT`
2. **云服务器**：`npm start` 后用 Nginx 反代，并配置 HTTPS 证书
3. **Docker**：使用 Node 20 基础镜像，`CMD ["node", "server/index.js"]`

## 项目结构

```
├── client/
│   └── index.html        # 前端页面（语音识别 + 朗读 + 显示）
├── server/
│   └── index.js          # Node 后端（静态托管 + 有道词典代理查询）
├── package.json
└── README.md
```

## 技术说明

- 语音识别：浏览器原生 Web Speech API（`webkitSpeechRecognition`），无需额外 SDK
- 语音合成：浏览器原生 SpeechSynthesis，英文语音朗读
- 词库：有道词典公开查询接口（`dict.youdao.com/jsonapi`），由后端代理转发

## License

MIT
