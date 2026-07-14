// a right-margin gutter of colored initials bubbles for
// doc-mode comments, aligned vertically to each comment's anchor. This is a UX
// exploration for showing "who commented where" without covering the text. It
// lives in one self-contained module so it can be deleted wholesale if we keep
// the plain always-on highlights instead.

import { decodeAnchor } from '../../../shared/comments/helpers/anchor.js';
import { authorPresentation } from '../../ew-comments/iframe-bridge.js';

const GUTTER_CLASS = 'ew-comment-gutter';

function ensureGutter(container) {
  let el = container.querySelector(`.${GUTTER_CLASS}`);
  if (!el) {
    el = document.createElement('div');
    el.className = GUTTER_CLASS;
    el.setAttribute('aria-hidden', 'true');
    container.appendChild(el);
  }
  return el;
}

export function createCommentGutter({ getView, getContainer, controller }) {
  if (!controller?.subscribe) return () => {};

  let raf = 0;
  const isVisible = () => controller.panelOpen || controller.showHighlights;

  const render = () => {
    raf = 0;
    const view = getView?.();
    const container = getContainer?.();
    if (!view || view.isDestroyed || !container) return;
    const gutter = ensureGutter(container);
    gutter.textContent = '';
    if (!isVisible()) return;
    const ids = controller.getAttachedThreadIds?.();
    if (!ids?.size) return;
    const base = container.getBoundingClientRect();
    ids.forEach((id) => {
      const comment = controller.getComment(id);
      if (!comment) return;
      const range = decodeAnchor({ anchor: comment, state: view.state });
      if (!range) return;
      let coords;
      try {
        coords = view.coordsAtPos(range.from);
      } catch {
        return;
      }
      const { color, initials } = authorPresentation(comment.author);
      const bubble = document.createElement('button');
      bubble.type = 'button';
      const active = id === controller.selectedThreadId;
      bubble.className = `ew-comment-gutter-bubble${active ? ' is-active' : ''}`;
      bubble.textContent = initials;
      bubble.dataset.commentThread = id;
      bubble.style.setProperty('--ew-comment-author-color', color);
      bubble.style.top = `${(coords.top - base.top) + container.scrollTop}px`;
      bubble.addEventListener('click', (e) => {
        e.preventDefault();
        controller.setSelectedThread(id);
      });
      gutter.appendChild(bubble);
    });
  };

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(render);
  };

  const RERENDER_REASONS = new Set([
    'init', 'counts', 'docChange', 'panelOpen', 'showHighlights', 'selectedThreadId',
  ]);
  const off = controller.subscribe(({ reason }) => {
    if (RERENDER_REASONS.has(reason)) schedule();
  });

  const container = getContainer?.();
  window.addEventListener('resize', schedule);
  container?.addEventListener('scroll', schedule, { passive: true });

  return () => {
    off?.();
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', schedule);
    container?.removeEventListener('scroll', schedule);
    getContainer?.()?.querySelector(`.${GUTTER_CLASS}`)?.remove();
  };
}
