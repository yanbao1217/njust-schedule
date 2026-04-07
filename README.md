# opencli-njust

`opencli-njust` 是一个面向 `OpenCLI` 的 NJUST 扩展示例项目。当前第一版提供 `njust schedule`，用于在终端查询教务系统课表。

## Features

- `opencli njust schedule`
- 按周过滤
- 按天过滤
- 按学期过滤
- 按关键字过滤
- 复用 OpenCLI 浏览器登录态
- 基于课表页面 HTML 解析

## Quick Start

### Requirements

- Node.js 20+
- npm
- 已安装 OpenCLI
- 本机可以正常登录 NJUST 教务系统

### Install

克隆项目后，在项目根目录执行：

```bash
npm install
npm run build
npm run test
npm run sync:opencli
```

同步完成后即可使用：

```bash
opencli njust schedule
```

## Usage

```bash
opencli njust schedule
opencli njust schedule --week 7
opencli njust schedule --day today
opencli njust schedule --day thu --week 7
opencli njust schedule --term 2025-2026-2 --term-start 2026-02-23
opencli njust schedule --keyword 示例课程A
```

如果 `--week current` 不准确，请显式传：

```bash
--term-start YYYY-MM-DD
```

## Project Structure

```text
njust-project/
  .github/workflows/release.yml
  scripts/
  src/njust/
  CHANGELOG.md
  LICENSE
  README.md
  RELEASING.md
  package.json
  tsconfig.json
```

## Development

```bash
npm run clean
npm run build
npm run test
npm run sync:opencli
```

OpenCLI 同步目标目录：

```text
%USERPROFILE%/.opencli/clis/njust/
```

## GitHub Releases

本地检查发布包：

```bash
npm run clean
npm run build
npm run test
npm run pack:release
```

推送版本标签后会自动创建 GitHub Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

详细流程见 [RELEASING.md](C:\Users\刘岩\Desktop\njust-project\RELEASING.md)。

## Notes

- `--week current` 依赖学期开学日期
- 优先顺序：`--term-start` > `NJUST_TERM_START` > 学期字符串推断
- 公开仓库只建议保留脱敏或虚构测试数据
- `release/` 仅用于本地生成 GitHub Release 附件

## Roadmap

- `njust exams`
- `njust grades`
- 更稳定的当前周识别
- 更多解析测试和异常处理

