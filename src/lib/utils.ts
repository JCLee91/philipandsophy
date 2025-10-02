import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RefObject } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const scrollToBottom = (selectorOrRef?: string | RefObject<HTMLElement>, delay = 100) => {
  setTimeout(() => {
    let element: HTMLElement | null = null;

    if (!selectorOrRef) {
      element = document.querySelector('main');
    } else if (typeof selectorOrRef === 'string') {
      element = document.querySelector(selectorOrRef);
    } else {
      element = selectorOrRef.current;
    }

    if (element) element.scrollTop = element.scrollHeight;
  }, delay);
};

export const sortByDate = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
