# PR 说明 - bbg v1 实现交付

## 概览

- 本次交付完成 `bbg` CLI v1 六大命令：`init`、`add-repo`、`doctor`、`sync`、`release`、`upgrade`。
- 技术栈落地：Node.js + TypeScript + Commander + Handlebars + Vitest。
- 完成模板体系、分析器、治理文档生成、升级补丁机制、跨平台基础能力与回归测试。

## 主要变更

- CLI 与命令
  - 新增 `src/cli.ts` 与六个命令实现。
  - 完成全局错误边界与退出码映射。
- 配置与治理
  - 新增 `.bbg/config` 读写与 hash 追踪能力。
  - `doctor --fix` 支持修复 `.gitignore` 与缺失根治理文件。
- 模板与生成
  - 新增 `templates/generic`、`templates/handlebars`、`templates/scaffold`。
  - 支持 root/child AGENTS、README、workflow/architecture/domain 脚手架生成。
- 升级机制
  - `upgrade` 按 tracked files 与 manifest 处理 overwrite/patch/skip/new。
  - 支持 `.bbg/upgrade-patches/<path>.patch` 输出与安全 notice 分支。
- 测试
  - 单测 + 集成测试齐备，覆盖 analyzer、命令流程、升级/发布关键路径。

## 验证结果

在 `master` 分支执行：

```bash
npm run build
npm run test
node dist/cli.js --help
```

结果：

- 构建通过（`dist/cli.js` 与声明文件生成成功）
- 测试通过（`21` 个测试文件、`86` 个测试通过）
- `--help` 输出包含全部 v1 命令

## 备注

- 此文档用于 PR 说明与交付留痕。
- 如后续走 GitHub PR 流程，可直接复制本文件内容作为 PR 描述基础。
