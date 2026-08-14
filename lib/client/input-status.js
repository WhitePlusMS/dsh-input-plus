/**
 * Additive input status row rendered below the official composer.
 *
 * This file intentionally uses the React runtime supplied by DSH's module
 * loader without importing a second client bundle dependency. The slot itself
 * remains a normal rc.6 React slot component; the local element shape keeps
 * the static client bundler dependency-free.
 */
import { element } from './react-runtime.js';
/** Render a compact, non-interactive status summary in the composer footer. */
export function InputStatus(rawProps) {
    const props = rawProps;
    const text = formatInputStatus(props);
    if (text === '')
        return null;
    return element('div', {
        className: 'dsh-input-plus-status',
        role: 'status',
        'aria-live': 'polite',
    }, text);
}
/** Build the visible status text separately so its state rules stay testable. */
export function formatInputStatus(props) {
    const parts = [];
    const references = countReferences(props.input.draft) + props.input.occurrences.length;
    if (references > 0)
        parts.push(`引用 ${references}`);
    if (props.input.imageIds.length > 0)
        parts.push(`附件 ${props.input.imageIds.length}`);
    if (props.session.queue.length > 0)
        parts.push(`排队 ${props.session.queue.length}`);
    if (props.session.running)
        parts.push('运行中');
    if (props.input.phase !== 'plain')
        parts.push('输入处理中');
    if (props.session.removed)
        parts.push('会话已关闭');
    return parts.join(' · ');
}
function countReferences(draft) {
    const re = /(?:^|[\s(])@([^\s@()]+)/g;
    let count = 0;
    while (re.exec(draft) !== null)
        count += 1;
    return count;
}
