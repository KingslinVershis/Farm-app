// Navigation Progress Event Bus for synchronized page transitions
export const NAV_START_EVENT = 'app:nav-start';
export const NAV_PROGRESS_EVENT = 'app:nav-progress';
export const NAV_FINISH_EVENT = 'app:nav-finish';

export interface NavStartDetail {
  origin?: { x: string; y: string };
  url?: string;
}

export function emitNavStart(detail?: NavStartDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_START_EVENT, { detail }));
  }
}

export function emitNavProgress(progress: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_PROGRESS_EVENT, { detail: { progress } }));
  }
}

export function emitNavFinish() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NAV_FINISH_EVENT));
  }
}
