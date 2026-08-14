window.__ModuleLoader__.load({
  id: "dsh-input-plus",
  factory: (require) => {
    var cache = {};
    var factories = [
  (function (module, exports, require) {
  "use strict";
  /**
   * Shared Host/Client wire contract for dsh-input-plus.
   *
   * Deliberately tiny and "least-privilege": the browser half only ever sees
   * `sessionId + relative` identifiers and minimal display metadata. Host
   * absolute paths, file contents, and the user's draft never cross this
   * boundary (see research/dsh-input-plus-file-reference.md).
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ROUTE_RESOLVE = exports.ROUTE_CANDIDATES = exports.ROUTE_PREFIX = void 0;
  /**
   * Same-origin HTTP route prefix shared by the Host (webServer) and the
   * browser half (fetch). Single source of truth — never hard-code the prefix
   * anywhere else (mirrors whale-girl's verify-routes-sync practice).
   */
  exports.ROUTE_PREFIX = '/dsh-input-plus';
  exports.ROUTE_CANDIDATES = `${exports.ROUTE_PREFIX}/candidates`;
  exports.ROUTE_RESOLVE = `${exports.ROUTE_PREFIX}/resolve`;

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Client-side bridge to the Host's file index.
   *
   * For a static bundle plugin the browser half reaches the Host through
   * same-origin HTTP routes served by the host's `webServer` (the documented
   * pattern used by whale-girl). This module wraps that transport so the
   * `@` input source is decoupled from the transport and unit-testable.
   *
   * The wire only ever carries `relative` paths and kind — never absolute paths
   * or file contents (see research/dsh-input-plus-file-reference.md).
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.httpFileIndexReader = httpFileIndexReader;
  const contract_js_1 = require(0);
  const defaultGetter = async (url, signal) => {
      const res = await fetch(url, { signal });
      if (!res.ok)
          throw new Error(`HTTP ${res.status}`);
      return res.json();
  };
  /**
   * HTTP bridge using the shared same-origin route prefix. `base` is optional
   * and defaults to the page origin (self-origin relative URLs).
   */
  function httpFileIndexReader(getter = defaultGetter, base = '') {
      const url = (path) => `${base}${path}`;
      async function candidates(session, query, signal) {
          const qs = new URLSearchParams({ session, q: query });
          const env = (await getter(url(`${contract_js_1.ROUTE_CANDIDATES}?${qs}`), signal));
          if (!env || env.ok !== true)
              return [];
          return Array.isArray(env.candidates) ? env.candidates : [];
      }
      async function resolve(session, rel, signal) {
          const qs = new URLSearchParams({ session, rel });
          try {
              return (await getter(url(`${contract_js_1.ROUTE_RESOLVE}?${qs}`), signal));
          }
          catch {
              return { ok: false, error: 'CANCELLED', message: 'Reference resolution was cancelled.' };
          }
      }
      return { candidates, resolve };
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * File candidate icons for the official rc.6 input-trigger menu.
   *
   * The menu contract types `icon` as a string, while rc.6's MenuView forwards
   * that value as a React child. We use that existing render seam to provide
   * the same DSH vector icons used by the official UI; no Emoji or DOM menu
   * replacement is involved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createFileCandidateIcon = createFileCandidateIcon;
  exports.installFileIconStyles = installFileIconStyles;
  const STYLE_ID = 'dsh-input-plus-file-icons';
  const ICON_STYLE = `
    .dsh-input-plus-icon-folder { color: #f2a51a; }
    .dsh-input-plus-icon-code { color: #55aaf5; }
    .dsh-input-plus-icon-data { color: #a181f7; }
    .dsh-input-plus-icon-file { color: #8db5d9; }
    .dsh-input-plus-icon-archive { color: #d39a62; }
  `;
  let primitiveIcons;
  function loadPrimitiveIcons() {
      if (primitiveIcons !== undefined)
          return primitiveIcons ?? undefined;
      try {
          if (typeof require !== 'function') {
              primitiveIcons = null;
              return undefined;
          }
          primitiveIcons = require('@deepseek-ai/dsh-client-ui-primitives');
          return primitiveIcons;
      }
      catch {
          // Pure unit-test/runtime probes do not provide the browser's outer loader.
          primitiveIcons = null;
          return undefined;
      }
  }
  function iconKind(relative, isDirectory) {
      if (isDirectory)
          return 'folder';
      const dot = relative.lastIndexOf('.');
      const extension = dot < 0 ? '' : relative.slice(dot + 1).toLowerCase();
      if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(extension))
          return 'archive';
      if (['json', 'jsonl', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'csv', 'tsv', 'xml'].includes(extension))
          return 'data';
      if ([
          'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'java', 'kt', 'kts', 'go', 'rs',
          'py', 'rb', 'php', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'swift', 'vue',
          'svelte', 'css', 'scss', 'less', 'sql', 'sh', 'bash', 'zsh', 'ps1',
      ].includes(extension))
          return 'code';
      return 'file';
  }
  function iconRenderer(kind) {
      const icons = loadPrimitiveIcons();
      if (icons === undefined)
          return undefined;
      switch (kind) {
          case 'folder': return icons.IconFolderOpen16;
          case 'code': return icons.IconCodeOutline16;
          case 'data': return icons.IconDataOutline16;
          case 'archive': return icons.IconArchiveOutline20;
          case 'file': return icons.IconBrowseOutline16;
      }
  }
  /**
   * Return the icon child accepted by the rc.6 menu. The fallback is a plain
   * text square only for non-browser probes where DSH's icon module is absent.
   */
  function createFileCandidateIcon(relative, isDirectory) {
      const kind = iconKind(relative, isDirectory);
      const render = iconRenderer(kind);
      if (render === undefined)
          return '□';
      try {
          const node = render({
              size: 18,
              className: `dsh-input-plus-icon-${kind}`,
          });
          return (node ?? '□');
      }
      catch {
          return '□';
      }
  }
  /** Install only the color rules; the icon geometry comes from DSH primitives. */
  function installFileIconStyles() {
      if (typeof document === 'undefined')
          return () => undefined;
      if (document.getElementById(STYLE_ID) !== null)
          return () => undefined;
      const target = document.head ?? document.documentElement;
      if (target === null)
          return () => undefined;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = ICON_STYLE;
      target.append(style);
      return () => style.remove();
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Slash-trigger source for recalling previously submitted user prompts.
   *
   * This deliberately uses the official `/` trigger instead of a DOM keydown
   * listener. `/h` and `/history` are the only accepted command prefixes, so
   * ordinary DSH slash commands keep their own source groups and semantics.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.HISTORY_MENU_CSS = exports.HISTORY_LIMIT = exports.HISTORY_TRIGGER = exports.HISTORY_SOURCE_NAME = void 0;
  exports.createHistoryStore = createHistoryStore;
  exports.historyFilter = historyFilter;
  exports.historyCandidate = historyCandidate;
  exports.createHistoryInputSource = createHistoryInputSource;
  exports.installHistoryMenuStyles = installHistoryMenuStyles;
  exports.HISTORY_SOURCE_NAME = '输入历史';
  exports.HISTORY_TRIGGER = '/';
  exports.HISTORY_LIMIT = 50;
  const MAX_PREVIEW_LENGTH = 240;
  /** Create a small in-memory, per-Session history store. */
  function createHistoryStore(limit = exports.HISTORY_LIMIT) {
      const entries = new Map();
      return {
          record(sessionId, draft) {
              const text = draft.trim();
              if (text === '')
                  return;
              const previous = entries.get(sessionId) ?? [];
              if (previous[0] === text)
                  return;
              entries.set(sessionId, [text, ...previous].slice(0, limit));
          },
          seed(sessionId, drafts) {
              const previous = entries.get(sessionId) ?? [];
              const known = new Set(previous);
              const missing = [];
              for (const draft of drafts) {
                  const text = draft.trim();
                  if (text === '' || known.has(text))
                      continue;
                  known.add(text);
                  missing.push(text);
              }
              if (missing.length > 0) {
                  entries.set(sessionId, [...previous, ...missing.reverse()].slice(0, limit));
              }
          },
          list(sessionId) {
              return entries.get(sessionId) ?? [];
          },
      };
  }
  /** Return the text filter after `/h` or `/history`; null means not our source. */
  function historyFilter(query) {
      const value = query.trim();
      const lower = value.toLowerCase();
      if (lower === 'h')
          return '';
      if (lower === 'history')
          return '';
      if (lower.startsWith('h '))
          return value.slice(2).trim();
      if (lower.startsWith('history '))
          return value.slice('history '.length).trim();
      return null;
  }
  /** Build the two-line-capable visible label while keeping the full draft hidden in `hint`. */
  function historyCandidate(text) {
      const compact = text.replace(/\s+/g, ' ').trim();
      const name = compact.length > MAX_PREVIEW_LENGTH
          ? `${compact.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
          : compact;
      return {
          name,
          icon: '↺',
          hint: text,
      };
  }
  function createHistoryInputSource(store) {
      return {
          trigger: exports.HISTORY_TRIGGER,
          name: exports.HISTORY_SOURCE_NAME,
          order: 20,
          async candidates(session, req) {
              const filter = historyFilter(req.query);
              if (filter === null)
                  return [];
              const lower = filter.toLowerCase();
              return store
                  .list(session.sessionId)
                  .filter((text) => lower === '' || text.toLowerCase().includes(lower))
                  .map(historyCandidate);
          },
          onPick(pick) {
              return { text: pick.candidate.hint ?? pick.candidate.name };
          },
      };
  }
  const HISTORY_OPTION_PREFIX = 'dsh-slash-option-输入历史-';
  const HISTORY_STYLE_ID = 'dsh-input-plus-history-menu';
  /**
   * The official menu is intentionally compact and single-line for paths. Only
   * rows belonging to this source receive the wider, two-line history layout.
   */
  exports.HISTORY_MENU_CSS = `
  [role="listbox"]:has(button[id^="${HISTORY_OPTION_PREFIX}"]) {
    width: 100%;
    max-width: 100%;
  }
  [role="listbox"]:has(button[id^="${HISTORY_OPTION_PREFIX}"]) > div {
    width: 100%;
  }
  button[id^="${HISTORY_OPTION_PREFIX}"] {
    width: 100%;
    min-height: 54px;
    box-sizing: border-box;
    align-items: flex-start;
  }
  button[id^="${HISTORY_OPTION_PREFIX}"] > span:first-child {
    margin-top: 2px;
  }
  button[id^="${HISTORY_OPTION_PREFIX}"] > span:nth-child(2) {
    flex: 1;
    min-width: 0;
    max-width: none;
    overflow: hidden;
    white-space: normal;
    line-height: 20px;
    text-overflow: clip;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  `;
  /** Install and return a disposer for the source-scoped history menu rules. */
  function installHistoryMenuStyles() {
      if (typeof document === 'undefined')
          return () => undefined;
      if (document.getElementById(HISTORY_STYLE_ID) !== null)
          return () => undefined;
      const target = document.head ?? document.documentElement;
      if (target === null)
          return () => undefined;
      const style = document.createElement('style');
      style.id = HISTORY_STYLE_ID;
      style.textContent = exports.HISTORY_MENU_CSS;
      target.append(style);
      return () => style.remove();
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Record prompts at the official Session.prompt() acceptance boundary.
   *
   * Ordinary composer sends clear the input synchronously, while the Host
   * acceptance result arrives through Session.prompt(). Watching input phases
   * therefore misses normal text sends. This adapter keeps the original draft
   * beside the input wrapper and commits it only after prompt() returns ok.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.wireHistoryRecorder = wireHistoryRecorder;
  function shouldRecord(draft) {
      const text = draft.trim();
      // Slash commands are commands rather than reusable natural-language prompts.
      return text !== '' && !text.startsWith('/');
  }
  function isHistoryMessage(node) {
      return node.kind === 'user' || node.kind === 'steering';
  }
  function textOfMessage(node) {
      return node.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('');
  }
  function textOfPrompt(content) {
      return content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('');
  }
  function seedSessionHistory(history, sessionId, session) {
      const drafts = session.getSnapshot().nodes
          .filter(isHistoryMessage)
          .map(textOfMessage);
      history.seed(sessionId, drafts);
  }
  function wireSession(deps, sessionId) {
      const sessionContext = deps.sessions.scope(sessionId);
      if (sessionContext === undefined)
          return () => undefined;
      const session = deps.sessions.sessionOf(sessionContext);
      if (session === undefined)
          return () => undefined;
      seedSessionHistory(deps.history, sessionId, session);
      const input = deps.conversation.input.for(sessionContext);
      const originalSubmit = input.submit;
      const originalPrompt = session.prompt;
      let pending;
      const wrappedPrompt = async (...args) => {
          try {
              const result = await originalPrompt.apply(session, args);
              if (result.ok) {
                  const draft = pending ?? textOfPrompt(args[0]);
                  if (shouldRecord(draft))
                      deps.history.record(sessionId, draft);
              }
              return result;
          }
          finally {
              pending = undefined;
          }
      };
      const wrappedSubmit = (mode) => {
          const draft = input.state.getSnapshot().draft;
          pending = shouldRecord(draft) ? draft.trim() : undefined;
          originalSubmit.call(input, mode);
      };
      input.submit = wrappedSubmit;
      session.prompt = wrappedPrompt;
      return () => {
          if (input.submit === wrappedSubmit)
              input.submit = originalSubmit;
          if (session.prompt === wrappedPrompt)
              session.prompt = originalPrompt;
      };
  }
  /** Keep the recorder attached to the current Session only. */
  function wireHistoryRecorder(deps) {
      let disposeSession = () => undefined;
      let attachedSessionId;
      const attachCurrentSession = () => {
          const sessionId = deps.sessions.list.getSnapshot().current;
          if (sessionId === attachedSessionId)
              return;
          disposeSession();
          attachedSessionId = sessionId;
          if (sessionId !== undefined)
              disposeSession = wireSession(deps, sessionId);
      };
      const unsubscribe = deps.sessions.list.subscribe(attachCurrentSession);
      attachCurrentSession();
      return () => {
          unsubscribe();
          disposeSession();
          attachedSessionId = undefined;
      };
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Pure client-side candidate matching/ranking for `@` references.
   *
   * Extracted so the exact match semantics (prefer exact-prefix, then substring,
   * then per-segment prefix) are unit-testable without a browser or host.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.rankFileCandidates = rankFileCandidates;
  /** Rank candidates for a `@query`; recent and Git-changed files win ties. */
  function rankFileCandidates(candidates, query, limit = 50, recent = new Set()) {
      const q = query.toLowerCase();
      return candidates
          .map((c) => {
          const lower = c.relative.toLowerCase();
          const score = candidateMatchScore(lower, q);
          if (score < 0)
              return null;
          return { c, score };
      })
          .filter((x) => x !== null)
          .sort((a, b) => {
          if (a.score !== b.score)
              return a.score - b.score;
          const aRecent = recent.has(a.c.relative);
          const bRecent = recent.has(b.c.relative);
          if (aRecent !== bRecent)
              return aRecent ? -1 : 1;
          const aModified = a.c.modified === true;
          const bModified = b.c.modified === true;
          if (aModified !== bModified)
              return aModified ? -1 : 1;
          const aRel = a.c.relative;
          const bRel = b.c.relative;
          const aDot = aRel.startsWith('.');
          const bDot = bRel.startsWith('.');
          if (aDot !== bDot)
              return aDot ? 1 : -1;
          const aDepth = aRel.split('/').length;
          const bDepth = bRel.split('/').length;
          if (aDepth !== bDepth)
              return aDepth - bDepth;
          return aRel.localeCompare(bRel);
      })
          .map((x) => x.c)
          .slice(0, limit);
  }
  /** Match the visible candidate name before considering its parent path. */
  function candidateMatchScore(relative, query) {
      if (query === '')
          return 0;
      const segments = relative.split('/');
      const name = segments[segments.length - 1] ?? relative;
      if (!query.includes('/')) {
          if (name === query)
              return 0;
          if (name.startsWith(query))
              return 1;
          if (name.includes(query))
              return 2;
          if (segments.some((segment) => segment.startsWith(query)))
              return 3;
          if (relative.includes(query))
              return 4;
          return -1;
      }
      const querySegments = query.split('/').filter((segment) => segment !== '');
      for (let start = 0; start + querySegments.length <= segments.length; start += 1) {
          let matches = true;
          for (let offset = 0; offset < querySegments.length; offset += 1) {
              const segment = segments[start + offset];
              const querySegment = querySegments[offset];
              if (segment === undefined || querySegment === undefined || !segment.startsWith(querySegment)) {
                  matches = false;
                  break;
              }
          }
          if (matches)
              return start === 0 ? 1 : 2;
      }
      return -1;
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * The `@` file/directory reference input-trigger source.
   *
   * Registers with the official `ctx.inputTriggers.registerSource` pipeline. The
   * official candidate menu handles caret/token detection, keyboard arbitration,
   * and the final text write-back; this source only supplies candidates and the
   * picked plain-text reference path (the frozen "plain-text reference path"
   * decision — no placeholder/occurrence, see the input-trigger contract).
   *
   * The Host owns candidate indexing and path validation; selected references
   * remain plain text. The browser never requests or receives file contents or
   * absolute paths.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.rankFileCandidates = void 0;
  exports.toMenuCandidate = toMenuCandidate;
  exports.createFileInputSource = createFileInputSource;
  const file_icons_js_1 = require(2);
  const find_js_1 = require(5);
  var find_js_2 = require(5);
  Object.defineProperty(exports, "rankFileCandidates", { enumerable: true, get: function () { return find_js_2.rankFileCandidates; } });
  function toMenuCandidate(c) {
      const separator = c.relative.lastIndexOf('/');
      const name = separator < 0 ? c.relative : c.relative.slice(separator + 1);
      const parent = separator < 0 ? '.' : c.relative.slice(0, separator);
      return {
          name,
          description: parent,
          icon: (0, file_icons_js_1.createFileCandidateIcon)(c.relative, c.kind === 'dir'),
          // The official menu does not render hint, so it is a stable identity
          // channel for onPick after the visible name becomes basename-only.
          hint: c.relative,
      };
  }
  function createFileInputSource(deps) {
      const recentBySession = new Map();
      const recentSet = (sessionId) => new Set(recentBySession.get(sessionId) ?? []);
      const remember = (sessionId, relative) => {
          const previous = recentBySession.get(sessionId) ?? [];
          const next = [relative, ...previous.filter((item) => item !== relative)].slice(0, 20);
          recentBySession.set(sessionId, next);
      };
      return {
          trigger: '@',
          name: 'File reference',
          order: 10,
          async candidates(session, req) {
              const raw = await deps.reader.candidates(session.sessionId, req.query, req.signal);
              const ranked = deps.filter === undefined
                  ? (0, find_js_1.rankFileCandidates)(raw, req.query, 50, recentSet(session.sessionId))
                  : deps.filter(raw, req.query);
              return ranked.map(toMenuCandidate);
          },
          onPick(pick) {
              // Plain-text reference path: the pipeline replaces the token span with
              // this literal text. No send-time content injection is registered.
              const rel = pick.candidate.hint ?? pick.candidate.name;
              remember(pick.session.sessionId, rel);
              return { text: `@${rel} ` };
          },
      };
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Minimal React runtime adapter for the static client bundle.
   *
   * DSH already loads React for its official conversation package. The client
   * bundle's outer ModuleLoader supplies that package resolver to this factory,
   * so the plugin can render additive slot entries without bundling React again.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.element = element;
  function loadReact() {
      try {
          if (typeof require === 'function')
              return require('react');
      }
      catch {
          // Unit tests and non-React host probes can load the pure modules safely.
      }
      return undefined;
  }
  const react = loadReact();
  function element(type, props, ...children) {
      return react?.createElement(type, props, ...children) ?? null;
  }

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * Additive input status row rendered below the official composer.
   *
   * This file intentionally uses the React runtime supplied by DSH's module
   * loader without importing a second client bundle dependency. The slot itself
   * remains a normal rc.6 React slot component; the local element shape keeps
   * the static client bundler dependency-free.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InputStatus = InputStatus;
  exports.formatInputStatus = formatInputStatus;
  const react_runtime_js_1 = require(7);
  /** Render a compact, non-interactive status summary in the composer footer. */
  function InputStatus(rawProps) {
      const props = rawProps;
      const text = formatInputStatus(props);
      if (text === '')
          return null;
      return (0, react_runtime_js_1.element)('div', {
          className: 'dsh-input-plus-status',
          role: 'status',
          'aria-live': 'polite',
      }, text);
  }
  /** Build the visible status text separately so its state rules stay testable. */
  function formatInputStatus(props) {
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

  }),
  (function (module, exports, require) {
  "use strict";
  /**
   * dsh-input-plus browser half.
   *
   * The plugin stays on rc.6's additive extension surfaces: the official `@`
   * input-trigger source and the composer status dock. It does not replace the
   * textarea and does not install a document-level keyboard listener.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.inject = exports.name = void 0;
  exports.probeCapabilities = probeCapabilities;
  exports.apply = apply;
  const bridge_js_1 = require(1);
  const file_icons_js_1 = require(2);
  const history_source_js_1 = require(3);
  const history_recorder_js_1 = require(4);
  const input_source_js_1 = require(6);
  const input_status_js_1 = require(8);
  exports.name = 'dsh-input-plus';
  exports.inject = [
      'inputTriggers',
      'slots',
      'conversation',
      'sessions',
  ];
  function probeCapabilities(ctx) {
      const inputTriggers = ctx.get('inputTriggers');
      const slots = ctx.get('slots');
      const conversation = ctx.get('conversation');
      const sessions = ctx.get('sessions');
      const inputStatus = Boolean(slots);
      const history = conversation !== undefined && sessions !== undefined;
      return { atSource: Boolean(inputTriggers), inputStatus, history };
  }
  function apply(ctx) {
      const probe = probeCapabilities(ctx);
      if (probe.atSource) {
          const inputTriggers = ctx.get('inputTriggers');
          const source = (0, input_source_js_1.createFileInputSource)({ reader: (0, bridge_js_1.httpFileIndexReader)() });
          ctx.effect(() => inputTriggers.registerSource(source));
          ctx.effect(file_icons_js_1.installFileIconStyles);
          console.info('[dsh-input-plus] @ file source registered with recent/Git ranking.');
          if (probe.history) {
              const conversation = ctx.get('conversation');
              const sessions = ctx.get('sessions');
              const history = (0, history_source_js_1.createHistoryStore)();
              const historySource = (0, history_source_js_1.createHistoryInputSource)(history);
              ctx.effect(() => inputTriggers.registerSource(historySource));
              ctx.effect(history_source_js_1.installHistoryMenuStyles);
              ctx.effect(() => (0, history_recorder_js_1.wireHistoryRecorder)({ conversation, sessions, history }));
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
          registrant: exports.name,
          id: 'input-status',
          order: 10,
      }, input_status_js_1.InputStatus));
      console.info('[dsh-input-plus] composer status dock registered.');
  }

  })
    ];
    function __r(id) {
      if (typeof id !== 'number') return require(id);
      if (cache[id]) return cache[id].exports;
      var module = { exports: {} };
      cache[id] = module;
      factories[id](module, module.exports, __r);
      return module.exports;
    }
    return __r(9);
  }
});
