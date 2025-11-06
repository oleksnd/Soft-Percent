/**
 * skill.js — plain JS replacement for TypeScript skill model
 * @typedef {Object} Skill
 * @property {string} id
 * @property {string} name
 * @property {string} [emoji]
 * @property {string} [category]
 * @property {number} createdAt
 * @property {number|null} [firstCheckAt]
 * @property {number} totalChecks
 */

export function makeSkill(name, opts = {}) {
  return {
    id: (opts.id || (Math.random().toString(36).slice(2, 10))),
    name: String(name),
    emoji: opts.emoji || '⭐',
    category: opts.category || 'Other',
    createdAt: Date.now(),
    firstCheckAt: null,
    totalChecks: 0
  };
}

export default { makeSkill };
