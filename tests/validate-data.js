const assert = require("node:assert/strict");
global.window = {};
require("../js/data/questions.js");
require("../js/core/grading.js");
const { stages, questions } = window.BUN_DATA;
assert.equal(stages.length, 10, "10ステージが定義されている");
assert.ok(questions.length >= 40, "各ステージに複数の問題がある");
const ids = new Set();
const byId = new Map(questions.map(q => [q.id, q]));
assert.equal(byId.size, questions.length, "問題IDが重複していない");
for (const q of questions) {
  assert.ok(q.id && q.prompt && q.skill && q.explanation && q.hint, "必須項目: " + q.id);
  assert.ok(stages.some(s => s.id === q.stage), "存在するステージ: " + q.id);
  assert.ok(["select","pair","relation","strip","classify","repair","reorder","compose"].includes(q.type), "問題形式: " + q.id);
  const partIds = new Set(q.parts.map(p => p.id));
  const has = id => partIds.has(id);
  if (q.type === "select" || q.type === "classify") assert.ok(has(q.answer), "選択問題の正答ID: " + q.id);
  if (q.type === "pair") assert.ok(has(q.answer.left) && has(q.answer.right), "主述関係のID: " + q.id);
  if (q.type === "relation") assert.ok(has(q.answer.from) && has(q.answer.to), "修飾関係のID: " + q.id);
  if (q.type === "strip") assert.ok(q.answer.every(has), "骨組みの正答ID: " + q.id);
  if (q.type === "repair") assert.ok(q.answer.every(has), "修正文の正答ID: " + q.id);
  if (q.type === "reorder") assert.ok(q.answer.every(has) && q.answer.length === q.parts.length, "並べ替えの正答ID: " + q.id);
  if (q.type !== "compose") {
    const result = window.BunGrading.evaluate(q, q.type === "repair" ? q.answer[0] : q.answer);
    assert.equal(result.correct, true, "登録済み正答が通る: " + q.id);
  }
}
assert.equal(window.BunGrading.evaluate(byId.get("s10-01"), "犬が走る。").correct, true, "短い自作文の条件");
assert.equal(window.BunGrading.evaluate(byId.get("s10-01"), "犬が歩く。").correct, false, "必須語句の不足を検出");
console.log("OK: " + stages.length + " stages, " + questions.length + " questions, answer schema verified.");
