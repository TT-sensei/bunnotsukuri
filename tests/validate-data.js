const assert = require("node:assert/strict");
global.window = {};
require("../js/data/questions.js");
require("../js/core/grading.js");
require("../js/core/session.js");
const { stages, questions } = window.BUN_DATA;
assert.equal(stages.length, 10, "10ステージが定義されている");
assert.ok(questions.length >= 80, "練習問題が80問以上ある");
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
  if (q.type === "reorder") {
    assert.ok(q.answer.every(has) && q.answer.length === q.parts.length, "並べ替えの正答ID: " + q.id);
    for (const pattern of q.answerPatterns || []) {
      assert.equal(pattern.length, q.parts.length, "別解の語句数: " + q.id);
      assert.equal(new Set(pattern).size, q.parts.length, "別解で語句が重複していない: " + q.id);
      assert.ok(pattern.every(has), "別解の正答ID: " + q.id);
      assert.equal(window.BunGrading.evaluate(q, pattern).correct, true, "別解が正解になる: " + q.id);
    }
  }
  if (q.type !== "compose") {
    const result = window.BunGrading.evaluate(q, q.type === "repair" ? q.answer[0] : q.answer);
    assert.equal(result.correct, true, "登録済み正答が通る: " + q.id);
  }
}
assert.equal(window.BunGrading.evaluate(byId.get("s10-01"), "犬が走る。").correct, true, "短い自作文の条件");
assert.equal(window.BunGrading.evaluate(byId.get("s10-01"), "犬が歩く。").correct, false, "必須語句の不足を検出");

const stageOne = questions.filter(q => q.stage === 1);
const session = window.BunSession.build(stageOne, 5, () => 0.42);
assert.equal(session.length, 5, "指定した数の問題を選ぶ");
assert.equal(new Set(session.map(q => q.id)).size, session.length, "1回の学習で同じ問題をくり返さない");
const difficultyRank = { basic: 0, standard: 1, challenge: 2 };
assert.ok(session.every((q, i) => i === 0 || difficultyRank[session[i - 1].difficulty] <= difficultyRank[q.difficulty]), "やさしい問題から少しずつむずかしくなる");
assert.equal(window.BunSession.build(stageOne, 100).length, stageOne.length, "問題数より多く指定しても全問題数をこえない");
const stageTen = questions.filter(q => q.stage === 10);
const shortWritingSession = window.BunSession.build(stageTen, 5, () => 0.42);
assert.equal(shortWritingSession.filter(q => q.difficulty === "basic").length, 1, "基本問題が少ないステージでも、ある基本問題から始める");
assert.equal(shortWritingSession.filter(q => q.difficulty === "challenge").length, 1, "短い学習ではチャレンジ問題を詰め込みすぎない");
const reorderQuestions = questions.filter(q => q.type === "reorder");
assert.ok(reorderQuestions.some(q => q.answerPatterns && q.answerPatterns.length), "複数の正しい並べ方がある問題を含む");
const reorderWithAlternative = reorderQuestions.find(q => q.answerPatterns && q.answerPatterns.length);
assert.ok(window.BunGrading.evaluate(reorderWithAlternative, reorderWithAlternative.answerPatterns[0]).correct, "並べ替えの別解を正解として受け入れる");

console.log("OK: " + stages.length + " stages, " + questions.length + " questions, answer patterns and session flow verified.");
