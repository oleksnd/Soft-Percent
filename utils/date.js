// date.js — small date helpers for daily key (local time)
import { TIME_CONSTANTS } from './constants.js';

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isSameDay(a, b) {
  return todayKey(new Date(a)) === todayKey(new Date(b));
}

export function startOfDayTimestamp(d = new Date()) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return t.getTime();
}

export function nextLocalMidnight(d = new Date()) {
  const t = new Date(
    d.getFullYear(), 
    d.getMonth(), 
    d.getDate() + 1, 
    TIME_CONSTANTS.DAILY_RESET_HOUR, 
    TIME_CONSTANTS.DAILY_RESET_MINUTE, 
    0, 
    0
  );
  return t.getTime();
}

export function isNewLocalDay(lastTs) {
  if (!lastTs) return true;
  try {
    const last = new Date(lastTs);
    return todayKey(last) !== todayKey(new Date());
  } catch (e) {
    return true;
  }
}

