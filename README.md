<div align="center">

# 🎵 CuteMusic

**一款可爱的桌面音乐宠物播放器**

[![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?logo=windows&logoColor=white)]()

<img src="renderer\assets\rem.jpg" width="400" alt="CuteMusic 截图">

</div>

---

## ✨ 功能特性

- 🐱 **桌面宠物** — 透明无边框桌宠窗口，始终置顶，可自由拖拽、滚轮缩放
- 🎶 **本地音乐播放** — 支持 MP3、WAV、FLAC、OGG、AAC、M4A、WMA 格式
- 🖼️ **封面自动识别** — 自动读取音频内嵌封面，或匹配同目录同名 `.jpg/.png` 文件
- 📋 **歌单管理** — 创建、编辑歌单，将歌曲添加到不同歌单
- ⌨️ **全局快捷键** — 支持全局快捷键播放/暂停、上一曲/下一曲、音量调节、静音
- 🔄 **播放模式** — 列表循环、单曲循环、随机播放、顺序播放
- ⚙️ **个性化设置** — 自定义桌宠图片、桌宠大小、音量、快捷键
- 🔔 **系统托盘** — 最小化到托盘，右键菜单快速操作
- 🎨 **紫色主题** — 精心设计的暗紫色 UI，现代感十足

## 📸 界面预览

| 桌面宠物 | 播放面板 | 设置面板 |
|:---:|:---:|:---:|
| <img src="renderer\assets\rem.jpg" width="200"> | 播放控制、进度条、歌曲信息 | 音乐目录、快捷键、桌宠设置 |

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9
- **Windows** 10/11（当前仅支持 Windows）

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/cutemusic.git
cd cutemusic

# 2. 安装依赖
npm install

# 3. 启动应用
npm start
```

## 📦 打包部署

### 构建便携版（推荐）

```bash
npm run build:portable
```

构建完成后，可执行文件位于 `dist/CuteMusic.exe`，双击即可运行，无需安装。

### 构建安装版

```bash
npm run build
```

生成 NSIS 安装程序，支持自定义安装目录和创建桌面快捷方式。

> 构建产物位于 `dist/` 目录下。

## 📖 使用指南

### 1. 添加音乐目录

1. 启动应用后，右键桌面宠物 → 点击 **「🎵 打开界面」**
2. 切换到 **「⚙ 设置」** 标签页
3. 点击 **「+ 添加目录」**，选择你的音乐文件夹
4. 应用会自动扫描目录下的所有音频文件

### 2. 播放音乐

- 在 **「▶ 播放」** 标签页点击歌曲即可播放
- 也可在 **「♫ 歌单」** 标签页中管理歌单并播放
- 桌面宠物支持 **双击播放/暂停**，**右键打开菜单**

### 3. 快捷操作

| 操作 | 方式 |
|------|------|
| 播放/暂停 | 双击桌宠 / 右键菜单 / 界面按钮 |
| 上一曲/下一曲 | 界面按钮 |
| 播放模式切换 | 界面按钮（↻ ↺ 🎲 →） |
| 缩放桌宠 | 鼠标滚轮 |
| 移动桌宠 | 鼠标拖拽 |

## 🏗️ 项目结构

```
cutemusic/
├── electron/                # 主进程（Node.js）
│   ├── main.js              # 入口，窗口管理，IPC
│   ├── preload.js           # Context Bridge
│   ├── player-engine.js     # 播放引擎
│   ├── music-scanner.js     # 音乐目录扫描
│   ├── playlist-manager.js  # 歌单管理
│   ├── store.js             # 配置持久化（electron-store）
│   ├── tray.js              # 系统托盘
│   └── shortcut.js          # 全局快捷键
├── renderer/                # 渲染进程（浏览器窗口）
│   ├── pet/                 # 桌面宠物（透明窗口）
│   ├── panel/               # 功能面板（播放/歌单/设置）
│   ├── audio/               # 音频播放窗口
│   └── assets/              # 静态资源
├── data/                    # 运行时数据
│   ├── config.json          # 用户配置
│   ├── playlists/           # 歌单数据
│   └── pet-images/          # 桌宠图片
├── build/                   # 构建资源（图标等）
└── package.json
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Electron](https://www.electronjs.org/) 42 |
| 运行时 | [Node.js](https://nodejs.org/) 24 (CommonJS) |
| 音频解析 | [music-metadata](https://github.com/Borewit/music-metadata) 11 |
| 配置存储 | [electron-store](https://github.com/sindresorhus/electron-store) 11 |
| 打包工具 | [electron-builder](https://www.electron.build/) 26 |
| UI | 原生 HTML/CSS/JS（无框架） |

## ⚡ 架构设计

- **双窗口架构**：桌面宠物（透明无边框 200x200）+ 功能面板（按需创建 500x600）
- **IPC 通信**：通过 `preload.js` 的 `contextBridge` 暴露安全 API，无 `nodeIntegration`
- **自定义协议**：`cover://` 协议按需加载封面图片，避免 IPC 传输大文件
- **数据持久化**：用户配置存储于 `data/config.json`，歌单存储于 `data/playlists/*.json`

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

```bash
# Fork 后
git clone https://github.com/your-username/cutemusic.git
cd cutemusic
npm install
npm start
```

## 📋 更新日志

### v1.0.0

- 初始发布
- 桌面宠物 + 功能面板
- 本地音乐扫描与播放
- 歌单管理
- 全局快捷键
- 系统托盘
- 封面自动识别（内嵌 + 同名文件）
- 自定义桌宠图片

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 💬 联系方式

- **邮箱**：[hkxhyt@outlook.com](mailto:hkxhyt@outlook.com)
- **GitHub**：[@StayOne1](https://github.com/StayOne1)

---

<div align="center">

**如果这个项目对你有帮助，欢迎点个 ⭐ Star 支持一下！**

Made with ❤️ by 尤一

</div>
