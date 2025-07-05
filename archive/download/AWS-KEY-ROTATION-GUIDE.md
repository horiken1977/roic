# 🔑 AWS秘密鍵ローテーション手順

## 概要
GitGuardianアラートに対応するため、AWS秘密鍵を新しいものに置き換える手順です。

## 🚨 緊急対応完了状況
- ✅ **ファイル名参照削除**: 全ドキュメントから`AWS01.pem`を`[PRIVATE_KEY]`に置換済み
- ✅ **予防策強化**: .gitignore更新済み
- ⚠️ **AWS鍵ローテーション**: 以下の手順で実施が必要

## 🔧 AWS鍵ローテーション手順

### Step 1: 新しいキーペアの作成

1. **AWSコンソールにログイン**
   ```
   https://console.aws.amazon.com/
   ```

2. **EC2サービスに移動**
   - サービス → EC2 → キーペア

3. **新しいキーペア作成**
   ```
   名前: AWS02-roic-prod
   タイプ: RSA
   形式: .pem
   ```

4. **ダウンロード**
   - `AWS02-roic-prod.pem`をローカルに保存
   - 権限設定: `chmod 400 AWS02-roic-prod.pem`

### Step 2: EC2インスタンスの更新

#### 現在のサーバー情報
- **IP**: 54.199.201.201
- **OS**: Ubuntu 24.04.2 LTS
- **接続方法**: 現在は`ssh -i AWS01.pem ubuntu@54.199.201.201`

#### 新しい鍵での接続設定

1. **既存サーバーに接続**（現在の鍵使用）
   ```bash
   ssh -i AWS01.pem ubuntu@54.199.201.201
   ```

2. **新しい公開鍵を追加**
   ```bash
   # 新しい公開鍵をauthorized_keysに追加
   cat >> ~/.ssh/authorized_keys << 'EOF'
   # ここに新しい公開鍵（AWS02-roic-prod.pub）の内容をペースト
   EOF
   ```

3. **接続テスト**
   ```bash
   # 新しい鍵でのテスト接続（別ターミナルで実行）
   ssh -i AWS02-roic-prod.pem ubuntu@54.199.201.201
   ```

4. **古い鍵の無効化**
   ```bash
   # authorized_keysから古い公開鍵の行を削除
   nano ~/.ssh/authorized_keys
   ```

### Step 3: 開発環境の更新

1. **ローカル接続設定更新**
   ```bash
   # ~/.ssh/configに追加
   Host roic-prod
     HostName 54.199.201.201
     User ubuntu
     IdentityFile ~/.ssh/AWS02-roic-prod.pem
     IdentitiesOnly yes
   ```

2. **新しい接続方法**
   ```bash
   ssh roic-prod
   # または
   ssh -i ~/.ssh/AWS02-roic-prod.pem ubuntu@54.199.201.201
   ```

### Step 4: CI/CDパイプライン更新（Jenkins）

1. **Jenkinsfileの更新**
   ```bash
   # デプロイスクリプト内の鍵ファイル名を更新
   # AWS01.pem → AWS02-roic-prod.pem
   ```

2. **Jenkins秘密鍵の更新**
   - Jenkins管理画面で新しい秘密鍵を登録
   - 古い秘密鍵のCredentialを削除

### Step 5: ドキュメント更新

1. **接続情報の更新**
   ```bash
   # 今後のドキュメントでは以下の形式を使用
   ssh -i [PRIVATE_KEY] ubuntu@54.199.201.201
   ```

2. **セキュリティ注記の追加**
   - README.mdに完了報告を追記

## ✅ 完了チェックリスト

- [ ] **新しいキーペア作成** (AWS02-roic-prod)
- [ ] **EC2インスタンスの鍵更新** 
- [ ] **新しい鍵での接続テスト**
- [ ] **古い鍵の無効化**
- [ ] **ローカル環境の接続設定更新**
- [ ] **CI/CDパイプラインの更新**
- [ ] **ドキュメントの最終更新**
- [ ] **古いキーペア削除** (AWSコンソール)

## 🛡️ セキュリティ確認

### 完了後の確認事項
1. **新しい鍵での接続成功**
2. **古い鍵での接続失敗** (無効化確認)
3. **GitGuardianアラート解消**
4. **ドキュメントに秘密鍵情報なし**

### 推奨事項
- 🔄 **定期ローテーション**: 3-6ヶ月ごとの鍵更新
- 📊 **監視継続**: GitGuardianでの継続監視
- 🔒 **最小権限**: 必要最小限のアクセス権限

## 📞 緊急時連絡先

**実施責任者**: 開発チーム  
**実施予定日**: 2025年6月30日～7月1日  
**優先度**: 高（High Priority）

---
**注意**: この手順はセキュリティ向上のための予防的措置です。現在のシステムに実害はありません。