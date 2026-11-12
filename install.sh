#!/usr/bin/env bash
# DeepSeek Harness skills 一键安装脚本
# 用法:
#   bash install.sh                 # 安装全部 177 个技能到 ~/.dsh/skills/
#   bash install.sh biopython       # 只安装指定技能（可多个，空格分隔）
#   DSH_SKILLS_DIR=/path bash install.sh   # 自定义目标目录
set -euo pipefail

REPO_URL="https://github.com/Ivringmk/deepseek-skill.git"
DEST="${DSH_SKILLS_DIR:-$HOME/.dsh/skills}"
SRC_SUBDIR="scientific-agent-skills/skills"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> 克隆仓库: $REPO_URL"
git clone --depth 1 "$REPO_URL" "$TMP/repo"

mkdir -p "$DEST"

if [ "$#" -gt 0 ]; then
  echo "==> 安装指定技能到: $DEST"
  for name in "$@"; do
    if [ -d "$TMP/repo/$SRC_SUBDIR/$name" ]; then
      cp -r "$TMP/repo/$SRC_SUBDIR/$name" "$DEST/"
      echo "    [OK] $name"
    else
      echo "    [跳过] 未找到技能: $name（用 ls 查看可用技能）"
    fi
  done
else
  echo "==> 安装全部技能到: $DEST"
  cp -r "$TMP/repo/$SRC_SUBDIR/"* "$DEST/"
  echo "    共安装 $(ls "$DEST" | wc -l) 个技能"
fi

echo
echo "==> 完成。在 DeepSeek Harness 新会话中用 /技能名 调用，或让任务自动匹配。"
echo "    技能清单见仓库中的 DEEPSEEK_SKILLS.md"
