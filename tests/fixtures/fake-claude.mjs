#!/usr/bin/env node
// A stand-in for the `claude` CLI, for tests. Behaviour is chosen by the
// FAKE_CLAUDE_MODE environment variable; it always records its argv and stdin
// to FAKE_CLAUDE_LOG (one JSON line per run) when that is set.
import { appendFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const mode = process.env.FAKE_CLAUDE_MODE || 'ok';
const delay = Number(process.env.FAKE_CLAUDE_DELAY_MS || 0);
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { stdin += d; });
process.stdin.on('end', async () => {
  const t0 = Date.now();
  if (process.env.FAKE_CLAUDE_LOG) appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ argv, stdin, t0, pid: process.pid }) + '\n');
  if (delay) await new Promise(r => setTimeout(r, delay));
  if (process.env.FAKE_CLAUDE_LOG) appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ end: Date.now(), pid: process.pid }) + '\n');
  const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  const fmt = argv[argv.indexOf('--output-format') + 1];
  const result = (o) => out({ type: 'result', subtype: 'success', is_error: false, num_turns: 1, ...o });
  switch (mode) {
    case 'ok':
      if (fmt === 'stream-json') {
        out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [] });
        result({ result: 'OK from stream' });
      } else if (argv.includes('--json-schema')) {
        result({ result: '{"ok":true}', structured_output: { ok: true, n: 3 } });
      } else {
        result({ result: /exactly: OK/.test(stdin) ? 'OK' : `echo:${stdin.length}` });
      }
      break;
    case 'not-signed-in':
      result({ is_error: true, subtype: 'error', result: 'Not logged in. Please run /login' });
      process.exitCode = 1;
      break;
    case 'usage-limit':
      result({ is_error: true, subtype: 'error', api_error_status: 429, result: 'Claude AI usage limit reached' });
      process.exitCode = 1;
      break;
    case 'error-echo':
      // A failed run whose error text repeats the prompt (it must never reach a log).
      result({ is_error: true, subtype: 'error', result: `failed while reading: ${stdin.slice(0, 200)}` });
      process.exitCode = 1;
      break;
    case 'garbage':
      process.stdout.write('this is not json\n');
      break;
    case 'crash':
      process.stderr.write('Error: something exploded\n');
      process.exitCode = 3;
      break;
    case 'hang':
      await new Promise(r => setTimeout(r, 60000));
      break;
    case 'connector-needs-auth':
      out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: 'claude.ai Bank', status: 'needs-auth' }] });
      await new Promise(r => setTimeout(r, 5000));   // the runner must stop us early
      result({ result: 'should not get here' });
      break;
    case 'connector-missing':
      out({ type: 'system', subtype: 'init', tools: [], mcp_servers: [{ name: 'claude.ai Gmail', status: 'connected' }] });
      await new Promise(r => setTimeout(r, 5000));
      result({ result: 'should not get here' });
      break;
    case 'connector-ok': {
      const tools = ['mcp__claude_ai_Bank__list_transaction_accounts', 'mcp__claude_ai_Bank__get_account_transactions'];
      out({ type: 'system', subtype: 'init', tools, mcp_servers: [{ name: 'claude.ai Bank', status: 'connected' }] });
      out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: tools[0], input: {} }] } });
      out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: [{ type: 'text', text: '{"accounts":[{"accountId":"a1"}]}' }] }] } });
      result({ result: '[]' });
      break;
    }
    case 'policy': {
      out({ type: 'system', subtype: 'init', tools: ['mcp__claude_ai_Bank__list_transaction_accounts'], mcp_servers: [{ name: 'claude.ai Bank', status: 'connected' }] });
      out({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'mcp__claude_ai_Gmail__create_draft', input: {} }] } });
      await new Promise(r => setTimeout(r, 5000));
      result({ result: 'should not get here' });
      break;
    }
    default:
      process.stderr.write('unknown FAKE_CLAUDE_MODE ' + mode);
      process.exitCode = 9;
  }
});
