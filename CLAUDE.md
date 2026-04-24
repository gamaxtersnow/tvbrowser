# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在本仓库中协作时提供指引。

## 项目概述

一款 tvOS 浏览器应用，专为在 Apple TV 上用遥控器观看国内视频平台（优酷、腾讯视频、爱奇艺）而设计。基于 WKWebView 加载平台网页版，通过 JavaScript 注入和遥控器映射实现 TV 端原生浏览体验。

## 架构

- **纯 tvOS 客户端** —— 不需要后端。认证、播放、DRM 等复杂度全部由各平台网页播放器承担。
- WKWebView 容器 + Swift/SwiftUI 壳子，负责页面导航和遥控器处理。
- JavaScript 注入层：将桌面/移动端网页适配为 TV 端交互（焦点管理、字号放大、自动全屏）。

## 构建与运行

```bash
# 用 Xcode 打开项目
open *.xcodeproj

# Apple TV 模拟器构建
xcodebuild -scheme <scheme> -destination 'platform=tvOS Simulator,name=Apple TV' build

# 真机部署：Xcode → Devices 窗口配对 Apple TV，同网络下直接 Run
```

## 约束

- 仅个人使用，不上架 App Store。通过 Xcode 直接侧载到 Apple TV。
- 用户在国内，可直接访问三家平台的网页和 CDN。
- 目标平台：优酷 (youku.com)、腾讯视频 (v.qq.com)、爱奇艺 (iqiyi.com)。

## 开发工具

### agent-browser（网页调研）

项目配置了 [agent-browser](https://github.com/vercel-labs/agent-browser) 用于开发期间的网页内容抓取和 DOM 分析。需要调研外部网页信息时使用：

```bash
# 抓取网页可交互元素结构（用于分析各平台 DOM）
agent-browser open https://v.qq.com
agent-browser snapshot -i

# 抓取网页文本内容
agent-browser get text @e1

# 截图确认页面效果
agent-browser screenshot page.png

# 完成后关闭
agent-browser close
```

典型使用场景：
- 分析优酷/腾讯/爱奇艺网页的 DOM 结构和 CSS 选择器（为 JS 注入脚本做准备）
- 抓取 Apple Developer 文档的特定章节内容
- 查看网页截图确认视觉适配效果

首次使用需安装：`npm i -g agent-browser && agent-browser install`
