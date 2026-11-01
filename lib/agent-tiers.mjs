// lib/agent-tiers.mjs - what the agent may do, sorted by risk (docs/MCP.md "Safety tiers").
//
//   READ       free.
//   LOW        low-risk and reversible: run directly by the in-app assistant and full mode, with Undo.
//   SENSITIVE  never run directly by the in-app assistant: it becomes a proposal the person approves
//              on screen. Full mode runs them only with a dry run and its confirm token.
//
// One table, read by mcp/server.mjs (which tools a connection lists and runs), lib/assistant.mjs
// (the in-app assistant's allow-list) and server/actions/index.mjs (a second check in the actions
// layer itself). lib/claude-runner.mjs MCP_PROPOSE_TOOL is a separate hand-written lock on purpose:
// a name has to be added in both places.
//
// Not in any tier, so no connection can ever call them: reading secrets, keys, tokens, the signing key
// or recovery material; arbitrary file reads or writes; running programs; changing the update feed.
// The remote gateway (mcp/remote-server.mjs) sees none of the tools listed here.

/** New read tools. Deliberately not QUERIES: those are what the remote gateway may read, and it must not widen. */
export const READ_TOOLS = Object.freeze([
  'get_garden', 'get_profile', 'get_game', 'get_memories', 'get_settings', 'get_money', 'get_travel',
  'get_stories', 'list_friends', 'get_app_status',
]);

/** The ops the in-app assistant may run directly (tool name -> op name). */
export const LOW_RISK_OPS = Object.freeze({
  garden: 'garden.play', set_profile: 'profile.set', set_wardrobe: 'wardrobe.change', pet: 'pet.care',
  set_home_layout: 'home.set_layout', reset_home_layout: 'home.reset_layout', set_home_widget: 'home.set_widget_prefs',
  set_home_focus: 'home.set_focus', save_daynote: 'daynote.save',
});
/** Low-risk tools that are not ops: mcp/agent-tools.mjs runs them. */
export const LOW_RISK_EXTRA_TOOLS = Object.freeze(['set_setting', 'undo_change', 'tax_change', 'open_what_if']);
export const LOW_RISK_TOOLS = Object.freeze([...Object.keys(LOW_RISK_OPS), ...LOW_RISK_EXTRA_TOOLS]);
export const LOW_RISK_OP_NAMES = new Set([...Object.values(LOW_RISK_OPS), 'setting.set']);

/** Sensitive ops (server/actions/ops-sensitive.mjs): always `danger`, so full mode needs dry run + confirm. */
export const SENSITIVE_OPS = Object.freeze({
  friends_act: 'friends.act', friends_share: 'friends.share', together_act: 'together.act', groups_act: 'groups.act', devices_act: 'devices.act',
  relay_act: 'relay.act', connection_act: 'connection.act', money_change: 'money.change', expense_change: 'expense.change', tax_document_change: 'tax.change',
  install_update: 'update.install',
});
export const SENSITIVE_OP_NAMES = new Set(Object.values(SENSITIVE_OPS));

/** Everything added for "the agent does everything": hidden from the remote gateway, tools and proposals alike. */
export const AGENT_ONLY_OPS = new Set(['garden.play', 'profile.set', 'wardrobe.change', 'pet.care', 'setting.set', ...SENSITIVE_OP_NAMES]);

/** Which tier an op belongs to, for describe_operations. Other ops are proposals for the in-app assistant. */
export function opTier(name) {
  if (LOW_RISK_OP_NAMES.has(name)) return 'low-risk';
  if (SENSITIVE_OP_NAMES.has(name)) return 'sensitive';
  return 'change';
}
