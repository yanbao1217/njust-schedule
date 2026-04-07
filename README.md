# opencli-njust

`opencli-njust` 是一个面向 `OpenCLI` 的 NJUST 扩展示例项目。  
当前第一版实现了 `njust schedule`，用于在终端查询南京理工大学教务系统课表。

## 当前功能

- 查询课表：`opencli njust schedule`
- 支持按周过滤
- 支持按天过滤
- 支持按学期过滤
- 支持按关键字过滤
- 复用 OpenCLI 已登录浏览器会话
- 基于课表页面 HTML 解析，而不是依赖隐藏 JSON API

## 命令示例

```bash
opencli njust schedule
opencli njust schedule --week 7
opencli njust schedule --day today
opencli njust schedule --day thu --week 7
opencli njust schedule --term 2025-2026-2 --term-start 2026-02-23
opencli njust schedule --keyword 示例课程A
```

## 环境要求

开始前请确认本机具备以下环境：

- Node.js 20 或更高版本
- npm
- 已安装并可正常使用的 OpenCLI
- 本机存在 OpenCLI 运行目录：`%USERPROFILE%/.opencli/`
- 你已经能在浏览器里登录 NJUST 教务系统

建议先确认下面两个命令可用：

```bash
node -v
npm -v
```

## 安装步骤

这里的“安装”不是发布到 npm，而是把这个扩展项目构建后同步到你本机的 OpenCLI 运行目录。

### 1. 获取项目源码

如果你已经有本地目录，可以跳过。

如果是从 GitHub 拉取：

```bash
git clone <your-repo-url>
cd njust-project
```

### 2. 安装依赖

在项目根目录执行：

```bash
npm install
```

这一步会安装：

- TypeScript
- Vitest
- `@jackwener/opencli`
- Node 类型定义

安装完成后，项目里会生成 `node_modules/` 和 `package-lock.json`。

### 3. 编译 TypeScript

执行：

```bash
npm run build
```

编译成功后会生成：

```text
dist/
  njust/
    schedule.js
    schedule.d.ts
    types.js
    types.d.ts
    utils.js
    utils.d.ts
```

### 4. 运行测试

执行：

```bash
npm run test
```

这一步会运行项目里的 Vitest 测试，主要用于验证：

- 课表 HTML 解析逻辑
- 周次计算
- 命令注册和基础行为

### 5. 同步到本地 OpenCLI

执行：

```bash
npm run sync:opencli
```

这个脚本会把构建产物复制到你本机的 OpenCLI 目录：

```text
%USERPROFILE%/.opencli/clis/njust/
  schedule.js
  schedule.d.ts
  types.js
  types.d.ts
  utils.js
  utils.d.ts
```

### 6. 在 OpenCLI 中使用

同步完成后，就可以直接执行：

```bash
opencli njust schedule
```

如果你要指定周次或日期：

```bash
opencli njust schedule --week 7
opencli njust schedule --day mon
opencli njust schedule --day today
```

### 7. 首次使用时的注意事项

如果你第一次使用这个扩展，建议先确认：

1. 你的 OpenCLI 复用的浏览器已经登录教务系统
2. 教务系统页面当前可正常访问
3. 如果 `--week current` 结果不准确，请显式传学期开学日期：

```bash
opencli njust schedule --term 2025-2026-2 --term-start 2026-02-23
```

## 常用开发命令

```bash
npm install
npm run clean
npm run build
npm run test
npm run sync:opencli
npm run prepare:release
npm run pack:release
```

它们的含义如下：

- `npm run clean`：删除本地产物目录
- `npm run build`：编译 TypeScript 到 `dist/`
- `npm run test`：运行测试
- `npm run sync:opencli`：同步构建产物到本机 OpenCLI
- `npm run prepare:release`：准备 release 目录
- `npm run pack:release`：生成 GitHub Release zip 包

## 项目结构

```text
njust-project/
  .github/
    workflows/
      release.yml
  scripts/
    prepare-release.mjs
    package-release.ps1
    sync-opencli.mjs
  src/
    njust/
      schedule.ts
      schedule.test.ts
      types.ts
      utils.ts
  CHANGELOG.md
  LICENSE
  README.md
  RELEASING.md
  package.json
  tsconfig.json
```

## GitHub Releases

这个仓库已经补齐了 GitHub Releases 所需的基础文件和工作流。

本地检查 release：

```bash
npm install
npm run clean
npm run build
npm run test
npm run pack:release
```

如果流程成功，会生成：

```text
release/
  opencli-njust-v0.1.0/
  opencli-njust-v0.1.0.zip
```

推送版本 tag 后，GitHub Actions 会自动：

- 安装依赖
- 编译项目
- 运行测试
- 生成 release 目录
- 打包 zip 附件
- 创建 GitHub Release

示例：

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 注意事项

- `--week current` 依赖学期开学日期
- 优先顺序是：`--term-start` > `NJUST_TERM_START` > 根据学期字符串推断
- 如果学校校历和推断不一致，请显式传 `--term-start YYYY-MM-DD`
- 公开仓库建议只保留脱敏后的 fixture 或虚构测试数据
- 本地 `release/` 目录只用于生成 GitHub Release 附件，默认不提交到仓库

## 后续计划

- 增加 `njust exams`
- 增加 `njust grades`
- 优化当前周识别
- 增加更多解析测试和异常处理

