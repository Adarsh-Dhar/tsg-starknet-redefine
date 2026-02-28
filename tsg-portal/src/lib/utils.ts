// Detect if running in Chrome Extension popup
export const isExtensionPopup = () => {
  return typeof window !== "undefined" && window.location.protocol === "chrome-extension:";
};
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
