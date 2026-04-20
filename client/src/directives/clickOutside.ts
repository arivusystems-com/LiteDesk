import type { ObjectDirective } from 'vue';

type ClickOutsideCallback = (event: Event) => void;

interface ClickOutsideElement extends HTMLElement {
  __clickOutsideCallback__?: ClickOutsideCallback | null;
  __clickOutsideListener__?: ((event: Event) => void) | null;
}

const clickOutside: ObjectDirective<ClickOutsideElement, ClickOutsideCallback> = {
  mounted(el, binding) {
    el.__clickOutsideCallback__ = typeof binding.value === 'function' ? binding.value : null;
    el.__clickOutsideListener__ = (event: Event) => {
      const target = event.target as Node | null;
      if (target && (el === target || el.contains(target))) return;
      el.__clickOutsideCallback__?.(event);
    };

    if (typeof document !== 'undefined' && el.__clickOutsideListener__) {
      document.addEventListener('pointerdown', el.__clickOutsideListener__, true);
    }
  },
  updated(el, binding) {
    el.__clickOutsideCallback__ = typeof binding.value === 'function' ? binding.value : null;
  },
  unmounted(el) {
    if (typeof document !== 'undefined' && el.__clickOutsideListener__) {
      document.removeEventListener('pointerdown', el.__clickOutsideListener__, true);
    }
    el.__clickOutsideCallback__ = null;
    el.__clickOutsideListener__ = null;
  }
};

export default clickOutside;
