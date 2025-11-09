/**
 * Application-wide constants
 * Single source of truth for magic numbers and configuration values
 */

/**
 * Growth calculation configuration
 * These values define the exponential growth model for skill progression
 */
export const GROWTH_CONFIG = {
  /** Minimum daily growth rate (0.1% base growth) */
  BASE_RATE: 0.001,
  
  /** Additional growth bonus when user has 7-day momentum (0.3% bonus) */
  MOMENTUM_BONUS: 0.003,
  
  /** Maximum daily growth rate cap to prevent runaway growth (0.4% max) */
  MAX_RATE: 0.004,
  
  /** Minimum growth rate floor to ensure progress never stops */
  MIN_RATE: 0.001,
  
  /** Second check penalty: reduces growth to 50% to discourage gaming the system */
  SECOND_CHECK_MULTIPLIER: 0.5,
};

/**
 * Skill level calculation formulas
 */
export const LEVEL_CONFIG = {
  /** Skill level formula coefficient: level = floor(0.1 * sqrt(totalPoints)) */
  SKILL_LEVEL_COEFFICIENT: 0.1,
  
  /** Personality level formula coefficient: level = floor(0.0447 * sqrt(totalPoints)) */
  PERSONALITY_LEVEL_COEFFICIENT: 0.0447,
  
  /** Level titles by level threshold */
  PERSONALITY_TITLES: {
    0: 'Enthusiast',
    10: 'Adept',
    20: 'Virtuoso',
    30: 'Expert',
    40: 'Master',
  },
};

/**
 * Time-based constants
 */
export const TIME_CONSTANTS = {
  /** Cooldown period between skill checks (4 hours in milliseconds) */
  REARM_DURATION_MS: 4 * 60 * 60 * 1000,
  
  /** Number of days to look back for momentum calculation */
  MOMENTUM_LOOKBACK_DAYS: 7,
  
  /** Number of days to calculate activity score */
  ACTIVITY_LOOKBACK_DAYS: 30,
  
  /** Hour of day for daily reset (00:05 local time) */
  DAILY_RESET_HOUR: 0,
  DAILY_RESET_MINUTE: 5,
  
  /** Milliseconds in a day */
  MS_PER_DAY: 24 * 60 * 60 * 1000,
};

/**
 * Daily limits and constraints
 */
export const DAILY_LIMITS = {
  /** Maximum credited skill checks per local day */
  MAX_CHECKS_PER_DAY: 2,
  
  /** Maximum skill name length */
  MAX_SKILL_NAME_LENGTH: 80,
};

/**
 * Storage configuration and limits
 */
export const STORAGE_LIMITS = {
  /** Safe size limit for chrome.storage.sync items (86% of 8192 byte limit) */
  SYNC_ITEM_SAFE_SIZE: 7000,
  
  /** Total chrome.storage.sync quota (bytes) */
  SYNC_TOTAL_QUOTA: 102400,
  
  /** Maximum write operations per minute for sync storage */
  SYNC_WRITE_RATE_LIMIT: 120,
};

/**
 * Storage key prefixes
 */
export const STORAGE_KEYS = {
  META: 'sp_meta',
  USER: 'user',
  SKILLS: 'skills',
  
  /** Day log key prefix: daylog_${skillId} */
  DAYLOG_PREFIX: 'daylog_',
};

/**
 * Achievement thresholds
 */
export const ACHIEVEMENT_CONFIG = {
  /** Minimum skills completed in one day to trigger "Hit Day" achievement */
  HIT_DAY_THRESHOLD: 5,
  
  /** Consecutive days for streak achievement */
  STREAK_THRESHOLD: 3,
  
  /** Minimum gap in days to trigger comeback achievement */
  COMEBACK_GAP_DAYS: 7,
};

/**
 * Precision constants for calculations
 */
export const PRECISION = {
  /** Decimal places to round cumulative growth to prevent float drift */
  CUMULATIVE_GROWTH_DECIMALS: 6,
  
  /** Multiplier for rounding: Math.round(value * 1e6) / 1e6 */
  CUMULATIVE_GROWTH_MULTIPLIER: 1e6,
  
  /** Decimal places for GP display */
  GP_DISPLAY_DECIMALS: 2,
};
