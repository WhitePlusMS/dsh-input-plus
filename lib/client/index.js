/**
 * dsh-input-plus browser half.
 *
 * The plugin stays on rc.6's additive extension surfaces: the official `@`
 * input-trigger source and the composer status dock. It does not replace the
 * textarea and does not install a document-level keyboard listener.
 */
import { httpFileIndexReader } from './bridge.js';
import { installFileIconStyles } from './file-icons.js';
import { createHistoryInputSource, createHistoryStore, installHistoryMenuStyles, } from './history-source.js';
import { wireHistoryRecorder } from './history-recorder.js';
import { createFileInputSource } from './input-source.js';
import { InputStatus } from './input-status.js';
export const name = 'dsh-input-plus';
export const inject = [
    'inputTriggers',
    'slots',
    'conversation',
    'sessions',
];
export function probeCapabilities(ctx) {
    const inputTriggers = ctx.get('inputTriggers');
    const slots = ctx.get('slots');
    const conversation = ctx.get('conversation');
    const sessions = ctx.get('sessions');
    const inputStatus = Boolean(slots);
    const history = conversation !== undefined && sessions !== undefined;
    return { atSource: Boolean(inputTriggers), inputStatus, history };
}
export function apply(ctx) {
    const probe = probeCapabilities(ctx);
    if (probe.atSource) {
        const inputTriggers = ctx.get('inputTriggers');
        const source = createFileInputSource({ reader: httpFileIndexReader() });
        ctx.effect(() => inputTriggers.registerSource(source));
        ctx.effect(installFileIconStyles);
        console.info('[dsh-input-plus] @ file source registered with recent/Git ranking.');
        if (probe.history) {
            const conversation = ctx.get('conversation');
            const sessions = ctx.get('sessions');
            const history = createHistoryStore();
            const historySource = createHistoryInputSource(history);
            ctx.effect(() => inputTriggers.registerSource(historySource));
            ctx.effect(installHistoryMenuStyles);
            ctx.effect(() => wireHistoryRecorder({ conversation, sessions, history }));
            console.info('[dsh-input-plus] /h and /history input history source registered.');
        }
        else {
            console.warn('[dsh-input-plus] capability degraded: /h history source unavailable.');
        }
    }
    else {
        console.warn('[dsh-input-plus] capability degraded: @ file source unavailable.');
    }
    if (probe.inputStatus) {
        wireInputStatus(ctx);
    }
    else {
        console.warn('[dsh-input-plus] capability degraded: composer status dock unavailable.');
    }
}
function wireInputStatus(ctx) {
    const slots = ctx.get('slots');
    slots.inject('conversation.composer.dock', () => slots.register({
        name: 'conversation.composer.dock',
        registrant: name,
        id: 'input-status',
        order: 10,
    }, InputStatus));
    console.info('[dsh-input-plus] composer status dock registered.');
}
