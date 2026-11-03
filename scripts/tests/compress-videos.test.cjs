const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const skip = !fs.existsSync(bash) && 'Bash is unavailable';
const asBashPath = (value) => value.replace(/\\/g, '/');

function fixture(t, scriptName) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'video-compress-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const script = path.join(root, scriptName);
  fs.copyFileSync(path.resolve(__dirname, '..', '..', scriptName), script);
  const input = path.join(root, 'public', 'videos');
  fs.mkdirSync(input, { recursive: true });
  return { root, script, input, output: path.join(input, 'mobile') };
}

function run(script, functions, args = []) {
  return spawnSync(bash, ['-c', `${functions}\nscript="$1"; shift; source "$script" "$@"`, 'compress-test', asBashPath(script), ...args.map(asBashPath)], {
    encoding: 'utf8',
  });
}

const fakeTools = 'ffprobe() { printf "1080\\n"; }; ffmpeg() { return 23; };';

for (const scriptName of ['compress-videos.sh', 'compress-videos-mobile.sh']) {
  test(`${scriptName}: missing tools fail before processing`, { skip }, (t) => {
    const { script } = fixture(t, scriptName);
    const result = run(script, 'command() { if [ "$1" = "-v" ] && [ "$2" = "ffmpeg" ]; then return 1; fi; builtin command "$@"; }');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ffmpeg/);
  });

  test(`${scriptName}: empty inputs return a failure`, { skip }, (t) => {
    const { script } = fixture(t, scriptName);
    const result = run(script, fakeTools);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /MP4/);
  });

  test(`${scriptName}: a failed encoder returns a failure and preserves the input`, { skip }, (t) => {
    const { script, input, output } = fixture(t, scriptName);
    fs.writeFileSync(path.join(input, 'sample.mp4'), 'Original video');
    const result = run(script, 'ffprobe() { printf "1080\\n"; }; ffmpeg() { printf "Partial output" > "${@: -1}"; return 23; };');
    assert.notEqual(result.status, 0);
    assert.equal(fs.readFileSync(path.join(input, 'sample.mp4'), 'utf8'), 'Original video');
    assert.deepEqual(fs.readdirSync(output), []);
  });

  test(`${scriptName}: existing outputs are skipped without overwriting`, { skip }, (t) => {
    const { script, input, output } = fixture(t, scriptName);
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(input, 'sample.mp4'), 'Original video');
    fs.writeFileSync(path.join(output, 'sample.mp4'), 'Existing output');
    const result = run(script, fakeTools);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(output, 'sample.mp4'), 'utf8'), 'Existing output');
  });

  test(`${scriptName}: default paths resolve from the script and accept spaces`, { skip }, (t) => {
    const { script, input, output } = fixture(t, scriptName);
    fs.writeFileSync(path.join(input, 'sample with spaces.mp4'), 'Original video');
    const result = run(script, 'ffprobe() { printf "1080\\n"; }; ffmpeg() { printf "Fake encoded data" > "${@: -1}"; };');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(output, 'sample with spaces.mp4'), 'utf8'), 'Fake encoded data');
    assert.equal(fs.readFileSync(path.join(input, 'sample with spaces.mp4'), 'utf8'), 'Original video');
  });
}
