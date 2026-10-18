/**
 * Centralized API configuration for Learning.AI frontend.
 * Ensures consistent URLs without double slashes or accidental quote characters
 * regardless of how VITE_API_BASE_URL is configured in Vercel.
 */

let rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

// Strip any literal surrounding quotes (e.g. if entered as "" in Vercel UI)
rawBase = rawBase.replace(/^["']+|["']+$/g, '').trim().replace(/\/+$/, '');

export const BASE_URL = rawBase;
export const API_BASE = rawBase ? `${rawBase}/api` : '/api';
export default API_BASE;
