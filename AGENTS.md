Cosense の UserScript で、OpenAI API の GPT-5 を使ったエージェントシステムです。

# UserScript

- UserScript はブラウザ上で実行される JavaScript です。ブラウザの標準的な API がそのまま動きます
- 最終的に１つの JavaScript ファイルに収める必要があります。npm は利用できません
- API Key はソースコードの一番上に直接変数定義してください
- UI は DOM ツリーに直接追加してください

# 仕様

- script.js 1 ファイルにすべてのコードを収める
- 画面の左側に drawer でチャット画面を置く
- ページの情報を window.scrapbox.Page.lines から取得して、それを読んで答える
- リンク先のページを取得する tool を持ち、必要に応じてリンク先を読み取る
- OpenAI API の Responses API で、ブラウザから GPT-5 を利用
- npm は使わない

# 注意事項

- タスクを終えたら必ず typecheck, lint, test, lint を実行してください
