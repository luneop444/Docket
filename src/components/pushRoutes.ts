/** Routes that don't slide in as a pushed page: the tabs, the launch redirect, and onboarding,
 * whose steps move their own content under a fixed header (stepMotion). */
export const NO_PUSH = new Set(['(tabs)', 'index', 'welcome', 'account', 'company', 'edit-rules']);
