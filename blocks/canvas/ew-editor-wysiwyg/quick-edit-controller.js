import { updateDocument, updateState, getEditor } from '../editor-utils/editor-utils.js';
import { handleImageReplace } from './utils/image.js';
import {
  handleCursorMove,
  handleUndoRedo,
  handleIframeSelectionChange,
} from './utils/handlers.js';

// Messages that mutate the shared collab doc. These are applied programmatically
// (view.dispatch), which bypasses the ProseMirror `editable()` gate used by
// document mode — so read-only users must be blocked here. The WYSIWYG iframe is
// untrusted, so this host-side check is the authoritative permission boundary.
const MUTATING_MESSAGES = new Set(['node-update', 'image-replace', 'history']);

export function createControllerOnMessage(ctx) {
  return function onMessage(e) {
    const { type } = e.data;
    if (MUTATING_MESSAGES.has(type) && !ctx.canWrite) return;
    if (type === 'cursor-move') {
      handleCursorMove(e.data, ctx);
    } else if (type === 'reload') {
      updateDocument(ctx);
    } else if (type === 'image-replace') {
      handleImageReplace(e.data, ctx);
    } else if (type === 'get-editor') {
      getEditor(e.data, ctx);
    } else if (type === 'node-update') {
      updateState(e.data, ctx);
    } else if (type === 'history') {
      handleUndoRedo(e.data, ctx);
    } else if (type === 'selection-change') {
      handleIframeSelectionChange(e.data, ctx);
    }
  };
}
