import { createContext, type RefObject } from 'react';

/**
 * What glass on a screen bends when it isn't over a scrolling page: the photo behind the
 * scanner. Liquid glass (the pills and the result sheet) takes its picture from this element.
 */
export const BackdropCtx = createContext<RefObject<HTMLElement | null> | null>(null);
