/**
 * user.js — plain JS replacement for TypeScript user model
 * @typedef {Object} User
 * @property {string} id
 * @property {string} [name]
 * @property {'local'|'oauth'} mode
 * @property {number} [createdAt]
 */

export function makeUser(id, name = '', mode = 'local') {
  return { id, name: name || undefined, mode, createdAt: Date.now() };
}

export default { makeUser };
