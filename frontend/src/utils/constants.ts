/**
 * Card stack spacing constant
 * Defines the vertical offset (in pixels) between cards in a stacked display
 */
export const CARD_STACK_OFFSET = 20;

// Global feature flag for multiplayer support.
export const has_multiplayer = false;

// Local toggle for a deterministic easy practice deal.
// Effective only in dev builds; production always forces real shuffle.
const debug_spread_flag = true;
const is_dev_build = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env
  ?.DEV === true;
export const use_debug_spread = is_dev_build && debug_spread_flag;
