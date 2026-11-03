const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const source = path.resolve(__dirname, '..', 'build-knowledge-base.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'src', 'data'), { recursive: true });
  const script = path.join(root, 'scripts', 'build-knowledge-base.cjs');
  fs.copyFileSync(source, script);
  const legacy = path.join(root, 'src', 'feed-data.js');
  const primary = path.join(root, 'src', 'data', 'feed.js');
  fs.writeFileSync(legacy, '// Existing legacy data\n');
  fs.writeFileSync(primary, '// Primary application data\n');
  return { root, script, legacy, primary };
}

test('build serializes arbitrary summary text as valid JavaScript and keeps primary data untouched', async (t) => {
  const { root, script, legacy, primary } = fixture(t);
  const cache = path.join(root, 'cache', 'mp3');
  fs.mkdirSync(cache, { recursive: true });
  const takeaway = 'He said "quoted words" and used C:\\notes\\draft.';
  fs.writeFileSync(path.join(cache, 'darwin - 解析稿.md'), '## 【开场】[00:05]\n正文。\n');
  fs.writeFileSync(path.join(cache, 'darwin - 知识库.md'), `## 一句话总结\n${takeaway}\n`);
  fs.writeFileSync(path.join(cache, 'darwin - 转写信息.json'), '{"duration":120}');

  const result = spawnSync(process.execPath, [script, '--build'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const generated = fs.readFileSync(legacy, 'utf8');
  const data = await import(`data:text/javascript;base64,${Buffer.from(generated).toString('base64')}`);
  assert.equal(data.FEED_ITEMS[0].ai.takeaway, takeaway);
  assert.equal(data.FEED_ITEMS[0].time, '02:00');
  assert.equal(data.FEED_ITEMS[0].videoUrl, data.LOCAL_DEMO_VIDEOS[0]);
  assert.equal(fs.readFileSync(primary, 'utf8'), '// Primary application data\n');
});

for (const hasEmptyCache of [false, true]) {
  test(`build rejects ${hasEmptyCache ? 'empty' : 'missing'} cache without overwriting data`, (t) => {
    const { root, script, legacy } = fixture(t);
    if (hasEmptyCache) fs.mkdirSync(path.join(root, 'cache', 'mp3'), { recursive: true });
    const result = spawnSync(process.execPath, [script, '--build'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /保留现有/);
    assert.equal(fs.readFileSync(legacy, 'utf8'), '// Existing legacy data\n');
  });
}

test('help references the executable cjs script and identifies the legacy output', () => {
  const result = spawnSync(process.execPath, [source, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /build-knowledge-base\.cjs/);
  assert.doesNotMatch(result.stdout, /build-knowledge-base\.js/);
  assert.match(result.stdout, /src\/data\/feed\.js/);
});
