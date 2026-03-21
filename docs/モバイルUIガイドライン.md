# Antigravity向け設計ガイドライン - スマホ向けWebアプリUI/UX

このドキュメントは、AntigravityのAIがスマホ向けWebアプリを設計・実装するときの判断基準です。

目的は1つです。

- スマホで開いたときに、入力しやすい
- 誤タップしにくい
- 迷いにくい
- キーボード表示時にも壊れにくい
- iPhone / Androidの両方で破綻しにくい

以下は「推奨」ではなく、原則として守るべき設計ルールです。
例外を作る場合は、理由をコードコメントまたは実装メモに残してください。

---

## 0. 最優先原則

Antigravityは、スマホ表示において以下を優先すること。

1. 見た目の美しさより、操作の確実性を優先する
2. 情報量より、誤操作の少なさを優先する
3. PC版の縮小ではなく、モバイル専用レイアウトとして再設計する
4. 1画面に詰め込みすぎない
5. フォーム、保存、戻る、閉じる、次へ などの主要操作を、親指で届きやすい位置に置く

---

## 1. フォーカス時の勝手なズームを防ぐ

### MUST

- `input`
- `textarea`
- `select`
- `button`

これらのフォーム関連要素は、スマホ表示時に **font-size: 16px以上** を基本とする。

### 理由

iOS Safariでは、フォーム要素の文字サイズが小さいと、フォーカス時に自動ズームが起きやすい。
特に **15px以下** は避ける。

### 実装基準

- ルートの基準文字サイズは原則 `16px`
- フォーム要素は原則 `16px`
- 小さく見せたい場合は、文字サイズを下げずに `padding` や `font-weight` や余白で調整する

### AVOID

- `maximum-scale=1`
- `user-scalable=no`

これらでズーム自体を無効化して問題を隠さないこと。アクセシビリティを壊す。

### 例

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
html {
  font-size: 16px;
}

input,
textarea,
select,
button {
  font-size: 16px;
}
```

---

## 2. タップ領域は見た目より大きく取る

### MUST

タップ可能要素は、原則 **48 x 48px以上** の操作領域を確保する。

### 参考基準

- Android / Material系: **48dp以上**
- Apple系: **44 x 44pt以上**
- WCAG 2.2 AAの最低ライン: **24 x 24 CSS px以上** または十分な間隔

### 実装判断

Antigravityは以下の優先順位で判断すること。

1. まず **48 x 48相当** を目標にする
2. どうしても小さくする場合でも **24 x 24未満にはしない**
3. 小さい要素同士は **最低8px以上** 離す

### AVOID

- 16pxや20pxのアイコンを、そのまま押下領域にする
- リンクやアイコンを横に密集させる
- テキストリンクだけで重要操作を担わせる

### 例

```css
.icon-button {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
}

.action-group {
  display: flex;
  gap: 8px;
}
```

---

## 3. 文字は「読める最小値」ではなく「疲れない大きさ」で設計する

### MUST

- 本文: **16px以上**
- 補助テキスト: **14px以上** を基本
- 極小注釈でも **12px未満は原則禁止**
- 行間: **1.4 - 1.6** を基本

### 実装基準

- 1行が長くなりすぎないようにする
- ボタン文字は、細すぎるウェイトを避ける
- ラベルと入力欄の距離は近すぎず遠すぎず、関連が一目で分かるようにする

### AVOID

- 情報量を増やすために 12px前後を乱用する
- グレーの薄い文字で説明文を出す
- プレースホルダーだけで入力内容を説明する

---

## 4. フォームは1列にし、入力のしやすさを最優先する

### MUST

- スマホでは原則 **1カラム**
- ラベルは入力欄の上に置く
- 必須 / 任意はラベル近くに明示する
- エラー文は該当欄の直下に出す
- プレースホルダーは補助用途に限定し、ラベルの代用にしない

### SHOULD

- 入力欄の高さは **44 - 52px程度** を標準にする
- 連続入力がある場合、`autocomplete` を適切に設定する
- 数字入力には `inputmode="numeric"` や `decimal` を使う
- メール、電話、URL には適切な `type` を使う
- 次へ / 完了 のキーボードラベル改善に `enterkeyhint` を使う

### 例

```html
<label for="phone">電話番号</label>
<input
  id="phone"
  name="phone"
  type="tel"
  inputmode="tel"
  autocomplete="tel"
  enterkeyhint="next"
>
```

### AVOID

- 横並び2列のフォーム
- カスタムUIで標準キーボード体験を壊すこと
- 長いプルダウンを多用すること

---

## 5. キーボード表示時に画面が壊れないようにする

### MUST

- フォーカス中の入力欄がキーボードに隠れないようにする
- 送信ボタンや保存ボタンがキーボードに隠れないようにする
- 全画面レイアウトで `100vh` 固定を安易に使わず、**`100dvh` を優先** する

### 実装基準

- モーダル内フォームは特に、キーボード表示時の高さ変化を検証する
- 固定フッターは `safe-area` を考慮する
- フォーカスされた要素を `scrollIntoView` などで見える位置へ寄せる設計を検討する

### 例

```css
.app-screen {
  min-height: 100dvh;
}

.sticky-footer {
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
```

### AVOID

- 画面下固定ボタンがキーボードの裏に潜ること
- iPhoneのホームインジケータやノッチに重要UIが重なること

---

## 6. 主要操作は親指が届く位置に置く

### MUST

スマホで頻繁に使う主操作は、画面上部より **下部寄り** を優先する。
特に以下は下部配置を優先する。

- 保存
- 送信
- 次へ
- 追加
- 開始
- 決定

### SHOULD

- 下部固定CTAは高さ **56 - 64px程度** を基準にする
- 下部ナビゲーションは **3 - 5項目程度** に抑える
- 戻る操作が複数ある場合は、意味の違いを明確に分ける

### AVOID

- 重要操作を右上の小さなアイコンだけにする
- 破壊的操作を、通常操作のすぐ隣に置く
- 上下に別々の保存ボタンを乱立させる

---

## 7. 色・コントラスト・状態変化を曖昧にしない

### MUST

- 通常テキストのコントラスト比は **4.5:1以上**
- 大きい文字は **3:1以上**
- 選択中 / 無効 / エラー / フォーカス状態を、色だけに依存せず見分けられるようにする

### 実装基準

- エラーは色 + 文言 + アイコン or 枠線変化で伝える
- フォーカスリングを消さない
- `disabled` は単に薄くするだけではなく、押せない理由が分かるなら補足する

### AVOID

- 薄いグレー文字を多用する
- エラーを赤色だけで表現する
- `outline: none;` を代替なしで使う

---

## 8. 動きは最小限。演出より理解を優先する

### MUST

- 動きは「状態変化の説明」に使う
- 装飾アニメーションを乱用しない
- `prefers-reduced-motion` を尊重する

### SHOULD

- 一般的なUI遷移は **150ms - 250ms程度** を基本にする
- 拡大縮小や視差スクロールのような大きな動きは慎重に使う
- ローディングは、待たせるなら進行状況を見せる

### 例

```css
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto;
    animation: none !important;
    transition: none !important;
  }
}
```

### AVOID

- 無意味なフェード連発
- パララックス
- 入力たびに大きく揺れる演出
- 画面遷移のたびに長いアニメーション

---

## 9. ノッチ・ホームバー・端末差分を前提にする

### MUST

- 端末の安全領域 `safe-area-inset-*` を考慮する
- 画面端ぴったりに重要ボタンを置かない
- iPhone系の下部ホームバーと重ならないようにする

### SHOULD

- 横余白は **16px以上** を基本にする
- カードやリストの左右余白も、最低 **12 - 16px** 程度確保する
- 固定ヘッダー / 固定フッターは safe area 加算を前提にする

### 例

```css
.page {
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

---

## 10. モバイルは「軽さ」もUXだとみなす

### MUST

- 初回表示で主要情報がすぐ見えること
- 入力開始までにもたつかないこと
- 画像や装飾でスクロールや入力を重くしないこと

### SHOULD

- 画面ごとに主目的を1つに絞る
- 長い一覧は段階読み込みや検索を併用する
- 画像は表示サイズに合った解像度を使い、伸ばしてぼかさない
- skeletonやspinnerは短時間だけ使い、長い待機には説明を添える

### AVOID

- PC版と同じ量の情報をそのまま並べる
- 何でもモーダル化する
- 毎回巨大なJSを読み込む
- タップ直後の反応が見えないまま数秒待たせる

---

# 実装チェックリスト

Antigravityは、スマホ向け画面を作るたびに最低限以下を確認すること。

## レイアウト

- [ ] スマホ幅 360px 前後でも崩れない
- [ ] 横スクロールが出ない
- [ ] 重要UIがノッチやホームバーに重ならない
- [ ] 下部固定UIが safe area を考慮している
- [ ] `100vh` 起因のはみ出しがない

## 文字

- [ ] 本文 16px以上
- [ ] フォーム文字 16px以上
- [ ] 補助文が薄すぎない
- [ ] 行間が詰まりすぎていない

## タップ操作

- [ ] ボタンやアイコンの押下領域が 48 x 48 相当ある
- [ ] 小さい操作要素同士の間隔が 8px以上ある
- [ ] 重要操作が片手で押しやすい位置にある

## フォーム

- [ ] ラベルがある
- [ ] placeholderだけに依存していない
- [ ] 適切な `type` / `inputmode` / `autocomplete` が付いている
- [ ] フォーカス時に勝手なズームが起きにくい
- [ ] キーボード表示時も送信操作に到達できる

## 状態表現

- [ ] エラーが分かる
- [ ] 選択中が分かる
- [ ] 無効状態が分かる
- [ ] フォーカスリングを消していない

## 動き

- [ ] 不要なアニメーションがない
- [ ] `prefers-reduced-motion` を尊重している

---

# Antigravityへの禁止事項

以下は、明確な理由がない限り採用しないこと。

1. フォーム文字 15px以下
2. 重要ボタンを 40px未満で作ること
3. プレースホルダーをラベル代わりにすること
4. `maximum-scale=1` や `user-scalable=no` で問題を隠すこと
5. `outline: none` を代替なしで使うこと
6. 右上の小アイコンだけに主要操作を押し込むこと
7. `100vh` 前提の全画面固定でキーボード崩れを放置すること
8. PC版の2カラムや3カラムをスマホにそのまま持ち込むこと
9. エラー理由を出さないこと
10. タップ直後の反応がないUIを放置すること

---

# デフォルト実装トークン

迷ったら以下を初期値として使うこと。

```css
:root {
  --font-body: 16px;
  --font-small: 14px;
  --line-height-body: 1.5;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;

  --tap-min: 48px;
  --input-height: 48px;
  --button-height: 48px;
  --bottom-cta-height: 56px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

---

# 最低限のCSSベース例

```css
html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

button,
input,
select,
textarea {
  font: inherit;
  font-size: 16px;
}

button,
[role="button"],
a.button,
input[type="button"],
input[type="submit"] {
  min-height: 48px;
}

input,
select,
textarea {
  min-height: 48px;
  padding: 12px 14px;
}

main {
  min-height: 100dvh;
  padding:
    max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```

---

# 画面レビュー時の質問

Antigravityは、スマホ画面を提案するたびに自問すること。

1. この画面は片手で主要操作が完了できるか
2. 入力中にレイアウトが壊れないか
3. 誤タップしやすい場所はないか
4. 状態の違いが一目で分かるか
5. 情報を減らした方が速く理解できないか
6. PC版の都合をそのまま押し付けていないか
7. フォームフォーカス時にiPhoneで不快なズームが起きないか
8. 重要な操作が「見えている」だけでなく「押しやすい」か

---

# 参考にした主要基準

- Apple Developer 日本語ガイド: タップターゲット 44 x 44pt以上、文字 11pt以上
- Android / Material系: 最小タッチターゲット 48dp
- WCAG 2.2: ターゲットサイズ 24 x 24 CSS px以上 または十分な間隔
- MDN / web.dev: モバイルフォーム、ラベル、コントラスト、reduced motion、safe area、dynamic viewport
- web.dev: iOS Safari のフォームズーム回避としてフォーム要素 16px以上を推奨

このファイルの目的は、理想論を書くことではない。
スマホで実際に使いやすいUIを、毎回ぶれずに作るための実装基準を固定すること。
