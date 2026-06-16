export const PROMPTS = {
  CLASSIFY_TAGS: `あなたはブックマーク整理アシスタントです。以下のJSONはタグ未分類のブックマーク一覧です。
各ブックマークに最適なタグ（最大3つ）を提案してください。
タグは既存のタグ一覧から選ぶか、新規に作成してください。
出力は以下のJSON形式のみ返してください。

{
  "suggestions": [
    { "id": "<bookmark_id>", "tags": ["tag1", "tag2"] }
  ]
}

その後、以下のエンドポイントにPOSTして適用できます:
curl -X POST http://localhost:9876/api/bookmarks/suggest-tags \\
  -H 'Content-Type: application/json' \\
  -d '{"suggestions": [...]}'`,

  NORMALIZE_TITLES: `あなたはブックマーク整理アシスタントです。以下のJSONのブックマーク一覧について、タイトルを短くわかりやすく正規化してください。
ルール:
- サイト名や「- YouTube」などの接尾辞を除去
- 不要な装飾文字を除去
- 内容を簡潔に表現（30文字以内を目安）
- 元のタイトルが空の場合はURLから適切なタイトルを生成

出力は以下のJSON形式のみ返してください。

{
  "titles": [
    { "id": "<bookmark_id>", "title": "正規化後のタイトル" }
  ]
}

その後、以下のエンドポイントにPOSTして適用できます:
curl -X POST http://localhost:9876/api/bookmarks/title-suggestions \\
  -H 'Content-Type: application/json' \\
  -d '{"titles": [...]}'`,

  MERGE_DUPLICATES: `あなたはブックマーク整理アシスタントです。以下のJSONは重複ブックマークのグループです。
各グループについて、どのブックマークを保持し、どれを統合すべきか提案してください。
選択基準: タイトルの充実度、タグの多さ、訪問数の多さ、更新日の新しさ。

出力は以下のJSON形式のみ返してください。

{
  "merges": [
    { "targetId": "<保持するbookmark_id>", "sourceIds": ["<統合するbookmark_id>", ...] }
  ]
}

その後、以下のエンドポイントにPOSTして適用できます:
curl -X POST http://localhost:9876/api/bookmarks/merge \\
  -H 'Content-Type: application/json' \\
  -d '{"targetId": "...", "sourceIds": [...]}'`,

  ANALYZE_COLLECTION: `あなたはブックマーク整理アシスタントです。以下のJSONは全ブックマークの統計情報です。
このコレクションの状態を分析し、改善のための具体的なアクションを3つ以内で提案してください。

出力は以下のJSON形式のみ返してください。

{
  "analysis": "分析テキスト",
  "actions": [
    { "action": "アクション内容", "reason": "理由" }
  ]
}`,
}
