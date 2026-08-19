#!/bin/bash
#
# 发布 payermax-developer-mcp-server 到 npmjs.org
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
REGISTRY="https://registry.npmjs.org"

cd "$PROJECT_DIR"

echo "📦 payermax-developer-mcp-server 发布脚本"
echo "=========================================="

# 1. 检查 npmjs.org 登录状态
echo ""
echo "🔑 检查 npmjs.org 登录状态..."
if ! npm whoami --registry "$REGISTRY" > /dev/null 2>&1; then
  echo "❌ 未登录 npmjs.org，请先执行: npm login --registry $REGISTRY"
  exit 1
fi
WHOAMI=$(npm whoami --registry "$REGISTRY")
echo "✅ 已登录: $WHOAMI"

# 2. 确保工作区干净（可选警告）
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo ""
  echo "⚠️  工作区有未提交的变更，继续发布？(y/N)"
  read -r CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消"
    exit 0
  fi
fi

# 3. 运行测试
echo ""
echo "🧪 运行测试..."
npm test
echo "✅ 测试通过"

# 4. 更新版本号
BUMP="${1:-patch}"
echo ""
if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  # 指定了具体版本号
  npm version "$BUMP" --no-git-tag-version
else
  # patch / minor / major
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
  echo "已取消，版本号已更新为 $NEW_VERSION（未发布）"
  exit 0
fi

# 7. 正式发布
npm publish --registry "$REGISTRY" --access public
echo ""
echo "✅ 发布成功: payermax-developer-mcp-server@$NEW_VERSION"
echo "   https://www.npmjs.com/package/payermax-developer-mcp-server"
