/**
 * Centralized API configuration for Learning.AI frontend.
 * Ensures consistent URLs without double slashes regardless of whether
 * VITE_API_BASE_URL has a trailing slash or is omitted (relative URLs).
 */

const rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const BASE_URL = rawBase;
export const API_BASE = rawBase ? `${rawBase}/api` : '/api';
export default API_BASE;
