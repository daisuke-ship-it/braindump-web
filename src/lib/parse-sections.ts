/**
 * Markdownを見出し単位でパースし、選択可能なセクションに分割する。
 * ## がエージェント区切り、### が個別アイテム。
 * ### がなければ ## の本文をそのまま1アイテムとして扱う。
 */

export type SelectableItem = {
  id: string;
  agent: string; // ## の見出し
  title: string; // ### の見出し、なければ agent と同じ
  content: string; // 本文
};

export function parseSections(markdown: string): SelectableItem[] {
  const lines = markdown.split("\n");
  const items: SelectableItem[] = [];
  let currentAgent = "";
  let currentTitle = "";
  let currentContent: string[] = [];
  let itemIndex = 0;

  function flush() {
    const body = currentContent.join("\n").trim();
    if (currentAgent && body) {
      items.push({
        id: `item-${itemIndex++}`,
        agent: currentAgent,
        title: currentTitle || currentAgent,
        content: body,
      });
    }
    currentContent = [];
    currentTitle = "";
  }

  for (const line of lines) {
    // # は記事タイトル — スキップ
    if (/^# [^#]/.test(line)) continue;

    // ## = エージェント区切り
    if (/^## /.test(line)) {
      flush();
      currentAgent = line.replace(/^## /, "").trim();
      currentTitle = "";
      continue;
    }

    // ### = 個別アイテム
    if (/^### /.test(line)) {
      flush();
      currentTitle = line.replace(/^### /, "").trim();
      continue;
    }

    currentContent.push(line);
  }
  flush();

  return items;
}
