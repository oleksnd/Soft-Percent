/**
 * Storage schema (JS version with JSDoc types)
 * This file replaces the TypeScript types so the project can run without a build step.
 */

/**
 * @typedef {'local'|'oauth'} Mode
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} [name]
 * @property {Mode} mode
 * @property {number} [createdAt]
 */

/**
 * @typedef {'Learning'|'Training'|'Creativity'|'Other'} Category
 */

/**
 * @typedef {Object} Skill
 * @property {string} id
 * @property {string} name
 * @property {string} [emoji]
 * @property {Category} [category]
 * @property {number} createdAt
 * @property {number|null} [firstCheckAt]
 * @property {number} totalChecks
 * @property {number} cumulativeGrowth // percent, e.g. 1.23
 * @property {number|null} [lastCheckAt]
 * @property {number} [checksTodayCount]
 * @property {number} [rearmAt]
 */

/**
 * @typedef {Object} DailyLog
 * @property {Object.<string, number>} byDate
 */

/**
 * @typedef {Object} StorageShape
 * @property {User} [user]
 * @property {Skill[]} [skills]
 * @property {{version:number, welcome?:boolean}} [meta]
 */

// Export nothing runtime-critical; typedefs assist editors that read JSDoc.
export default {};
