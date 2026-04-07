# opencli-njust

`OpenCLI` 的 NJUST 扩展示例项目，当前实现了 `njust schedule`，用于在终端查询教务系统课表。

## 功能

- 复用 OpenCLI 的浏览器登录态和 Cookie
- 抓取 NJUST 教务系统课表页面 HTML
- 解析学期课表网格和课程明细表
- 支持按周、按天、按学期、按关键字过滤
- 输出适合 OpenCLI 表格展示的标准行数据

## 当前命令

```bash
opencli njust schedule
opencli njust schedule --week 7
opencli njust schedule --day today
opencli njust schedule --day thu --week 7
opencli njust schedule --term 2025-2026-2 --term-start 2026-02-23
opencli njust schedule --keyword 示例课程A
```

## 项目结构

```text
njust-project/
  src/
    njust/
      schedule.ts
      utils.ts
      types.ts
      schedule.test.ts
  scripts/
    sync-opencli.mjs
  dist/
  README.md
  package.json
  tsconfig.json
```

## 开发

```bash
npm install
npm run build
npm run test
```

## GitHub Releases

这个仓库已经补齐了 GitHub Releases 所需的基础文件和工作流。

本地打包检查：

```bash
npm install
npm run build
npm run test
npm run pack:release
```

发布流程：

```bash
git tag v0.1.0
git push origin v0.1.0
```

推送 `v*` tag 后，GitHub Actions 会自动：

- 安装依赖
- 编译项目
- 运行测试
- 生成 release 目录
- 打包 zip 附件
- 创建 GitHub Release

## 同步到本地 OpenCLI

构建后执行：

```bash
npm run sync:opencli
```

默认会把以下文件复制到本机 OpenCLI 运行目录：

```text
%USERPROFILE%/.opencli/clis/njust/
  schedule.js
  schedule.d.ts
  utils.js
  utils.d.ts
  types.js
  types.d.ts
```

## 注意事项

- `--week current` 依赖学期开学日期。
- 优先顺序是：`--term-start` > `NJUST_TERM_START` > 根据学期字符串推断。
- 如果学校校历和推断不一致，请显式传 `--term-start YYYY-MM-DD`。
- 公开仓库建议只保留脱敏后的 fixture 或虚构测试数据，不要提交真实课表页面样本。
- 本地 `release/` 目录只用于生成 GitHub Release 附件，默认不提交到仓库。

## 后续计划

- `njust exams`
- `njust grades`
- 更稳定的“当前周”自动识别
- 把解析逻辑拆成更多纯函数测试
