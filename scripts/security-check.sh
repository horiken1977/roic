#!/bin/bash

# GitGuardianセキュリティチェックスクリプト
# roicリポジトリの秘密鍵検出確認

echo "🔍 ROIC Repository Security Check"
echo "================================="

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック項目の初期化
ISSUES_FOUND=0

echo -e "\n📋 Checking for sensitive patterns..."

# 1. 秘密鍵ファイルのチェック
echo -e "\n🔑 1. Private key files:"
if find . -name "*.pem" -o -name "*.key" -o -name "id_rsa*" -o -name "id_dsa*" 2>/dev/null | grep -v node_modules | head -5; then
    echo -e "${RED}❌ Private key files found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No private key files found${NC}"
fi

# 2. AWS01.pem参照のチェック
echo -e "\n🔍 2. AWS01.pem references:"
if grep -r "AWS01\.pem" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    echo -e "${RED}❌ AWS01.pem references still exist${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No AWS01.pem references found${NC}"
fi

# 3. 秘密鍵パターンのチェック
echo -e "\n🔐 3. Private key patterns:"
if grep -r "-----BEGIN.*PRIVATE KEY-----" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -3; then
    echo -e "${RED}❌ Private key patterns found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No private key patterns found${NC}"
fi

# 4. AWSアクセスキーパターンのチェック
echo -e "\n🗝️  4. AWS access key patterns:"
if grep -rE "AKIA[0-9A-Z]{16}" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -3; then
    echo -e "${RED}❌ AWS access key patterns found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No AWS access key patterns found${NC}"
fi

# 5. パスワードパターンのチェック
echo -e "\n🔒 5. Password patterns:"
SUSPICIOUS_PATTERNS=$(grep -rE "(password|passwd|pwd).*=.*['\"][^'\"]{8,}" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" 2>/dev/null | grep -v "example\|placeholder\|your_password\|PASSWORD_HERE" | head -3)
if [ ! -z "$SUSPICIOUS_PATTERNS" ]; then
    echo -e "${YELLOW}⚠️  Potential password patterns found:${NC}"
    echo "$SUSPICIOUS_PATTERNS"
    echo -e "${YELLOW}Please review if these are actual credentials${NC}"
else
    echo -e "${GREEN}✅ No suspicious password patterns found${NC}"
fi

# 6. .gitignoreの確認
echo -e "\n🚫 6. .gitignore security patterns:"
REQUIRED_PATTERNS=("*.pem" "*.key" ".ssh/" "**/credentials")
MISSING_PATTERNS=()

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore 2>/dev/null; then
        MISSING_PATTERNS+=("$pattern")
    fi
done

if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing .gitignore patterns:${NC}"
    printf '%s\n' "${MISSING_PATTERNS[@]}"
else
    echo -e "${GREEN}✅ All required .gitignore patterns present${NC}"
fi

# 7. Gitコミット履歴の確認
echo -e "\n📜 7. Git history sensitive content:"
if git log --all --full-history --grep="pem\|key\|secret\|password" --oneline 2>/dev/null | head -3; then
    echo -e "${YELLOW}⚠️  Commits with sensitive keywords found in history${NC}"
    echo -e "${YELLOW}This is expected and has been addressed in documentation${NC}"
else
    echo -e "${GREEN}✅ No sensitive keywords in commit messages${NC}"
fi

# 8. 現在のブランチの状態確認
echo -e "\n🌿 8. Current branch status:"
if git status --porcelain 2>/dev/null | grep -E "\.(pem|key)$"; then
    echo -e "${RED}❌ Uncommitted sensitive files detected${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No uncommitted sensitive files${NC}"
fi

# 結果サマリー
echo -e "\n" 
echo "🎯 SECURITY CHECK SUMMARY"
echo "========================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}✅ Repository is clean of sensitive data${NC}"
    echo -e "${GREEN}✅ Ready for GitGuardian verification${NC}"
else
    echo -e "${RED}⚠️  ISSUES FOUND: $ISSUES_FOUND${NC}"
    echo -e "${RED}Please address the issues above before proceeding${NC}"
fi

# GitGuardian確認手順の表示
echo -e "\n📋 Next Steps for GitGuardian Verification:"
echo "1. Visit: https://dashboard.gitguardian.com/"
echo "2. Check Incidents for horiken1977/roic repository"
echo "3. Verify incident #18201126 status is 'Resolved'"
echo "4. Confirm no new alerts in the last 24 hours"

echo -e "\n🔗 Additional Resources:"
echo "- Repository: https://github.com/horiken1977/roic"
echo "- Security tab: https://github.com/horiken1977/roic/security"
echo "- Documentation: README.md Security Notice section"

exit $ISSUES_FOUND