#!/bin/bash
#
# 发布 payermax-developer-mcp-server 到 npmjs.org
# 每次发布都基于 main 分支的最新版本
#
# 用法:
#   ./scripts/publish.sh          # 自动 patch 版本号 (1.0.2 → 1.0.3)
#   ./scripts/publish.sh minor    # minor 版本号 (1.0.2 → 1.1.0)
#   ./scripts/publish.sh major    # major 版本号 (1.0.2 → 2.0.0)
#   ./scripts/publish.sh 1.2.3    # 指定版本号
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$PROJECT_DIR/../../../" && pwd)"
REGISTRY="https://registry.npmjs.org"

cd "$REPO_ROOT"

echo "📦 payermax-developer-mcp-server 发布脚本"
echo "=========================================="

# 1. 切换到 main 分支并拉取最新
echo ""
echo "🔀 切换到 main 分支并拉取最新..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  # 检查是否有未提交的变更
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "❌ 当前分支 $CURRENT_BRANCH 有未提交的变更，请先 commit 或 stash"
    exit 1
  fi
  git checkout main
fi
git pull origin main
echo "✅ 已切换到 main 分支最新版本"

cd "$PROJECT_DIR"

# 2. 检查 npmjs.org 登录状态
echo ""
echo "🔑 检查 npmjs.org 登录状态..."
if ! npm whoami --registry "$REGISTRY" > /dev/null 2>&1; then
  echo "❌ 未登录 npmjs.org，请先执行: npm login --registry $REGISTRY"
  exit 1
fi
WHOAMI=$(npm whoami --registry "$REGISTRY")
echo "✅ 已登录: $WHOAMI"

# 3. 运行测试
echo ""
echo "🧪 运行测试..."
npm test
echo "✅ 测试通过"

# 4. 更新版本号
BUMP="${1:-patch}"
echo ""
if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  npm version "$BUMP" --no-git-tag-version
else
  npm version "$BUMP" --no-git-tag-version
fi
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 版本号: $NEW_VERSION"

# 5. dry-run 验证
echo ""
echo "🔍 dry-run 验证..."
npm publish --registry "$REGISTRY" --access public --dry-run
echo ""
echo "✅ dry-run 通过"

# 6. 确认发布
echo ""
echo "🚀 即将发布 payermax-developer-mcp-server@$NEW_VERSION 到 $REGISTRY"
echo "   确认发布？(y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "已取消，版本号已更新为 $NEW_VERSION（未发布），请手动 git checkout -- package.json 回退"
  exit 0
fi

# 7. 正式发布
npm publish --registry "$REGISTRY" --access public
echo ""
echo "✅ 发布成功: payermax-developer-mcp-server@$NEW_VERSION"

# 8. 提交版本号变更到 main
echo ""
echo "📝 提交版本号变更..."
cd "$REPO_ROOT"
git add mcp/payermax-developer-mcp-server/package.json
git commit -m "chore: bump payermax-developer-mcp-server to v$NEW_VERSION"
git push origin main
echo "✅ 版本号变更已推送到 main"
echo ""
echo "🎉 完成: https://www.npmjs.com/package/payermax-developer-mcp-server"
