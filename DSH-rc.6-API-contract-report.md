# DSH rc.6 API contract report

Extracted verbatim from the installed `@deepseek-ai` 0.1.0-rc.6 declaration files under `D:\tmp\npm-cache\_npx\1e7f6d9597241db0\node_modules\@deepseek-ai\`. All signatures below are copied exactly from `lib/types/**/*.d.ts` unless noted otherwise.

---

## 1. `dsh-client-ui-input-trigger` — slash/`@` pipeline

### 1a. Client `apply()` entry shape (how a Client Plugin registers a source)

From `lib/types/client/index.d.ts` (verbatim):

```ts
/** Required services: controller resolution reads the session scope tree; the menu copy is localized. */
export declare const inject: string[];
/**
 * Client plugin body: mount the service, then register MenuView into the
 * input overlay once its declarer is up.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
```

`ClientContext` is `Context` from `@deepseek-ai/cordis` (see §4). The client plugin is a Cordis plugin whose `apply(ctx)` mounts the service; the node half is a stub:

```ts
/** Host plugin body — no host-side behavior for the slash trigger plugin. */
export declare function apply(): void;
```

The package declares a service on the Cordis `Context` face:

```ts
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The outward face only; the concrete service stays inside this plugin. */
        inputTriggers: import('./contract.ts').InputTriggerServiceContract;
    }
}
```

### 1b. `ctx.inputTriggers` face and `sessionOf`

`registerSource` is the way a plugin that **provides** slash candidates registers a source. From `lib/types/client/contract.d.ts` (verbatim):

```ts
/** The `ctx.inputTriggers` service face. */
export interface InputTriggerServiceContract {
    registerSource(src: InputTriggerSource): () => void;
    sessionOf(actx: ClientContext): InputTriggerController;
}
```

`registerSource` returns the disposer ("effect disposer removing this source"). The concrete class is `InputTriggerService` (`lib/types/client/service.d.ts`), which implements this via a `Service`:

```ts
export declare class InputTriggerService extends Service implements InputTriggerServiceContract {
    static inject: string[];
    registerSource(src: InputTriggerSource): () => void;
    sessionOf(actx: ClientContext): InputTriggerController;
}
```

How a plugin that **consumes** candidates uses it: the conversation layer resolves the per-session controller via `sessionOf(actx)` (a session-scoped `ClientContext`), then drives `track` / `arbitrate` / `onSpace` / `adjudicate` / `pick`. A plugin that **provides** candidates calls `ctx.inputTriggers.registerSource(src)` inside its own `apply` for the lifetime of its own fiber (wrap in `ctx.effect`).

### 1c. Who receives the source — `InputTriggerSource`

From `lib/types/types.d.ts` (verbatim):

```ts
export declare ... 
export interface InputTriggerSource {
    readonly trigger: TriggerChar;
    readonly name: string;
    readonly order?: number;
    candidates(session: ClientSessionContext, req: CandidateRequest): Promise<readonly InputTriggerCandidate[]>;
    onPick(pick: InputTriggerPick): PickOutcome;
    matchSpace?(session: ClientSessionContext, token: string): PickOutcome;
    matchEnter?(session: ClientSessionContext, line: string, signal: AbortSignal): Promise<PickOutcome>;
    warm?(session: ClientSessionContext): void;
    lexicon?(session: ClientSessionContext): readonly string[] | undefined;
    subscribeLexicon?(session: ClientSessionContext, listener: () => void): () => void;
    readonly codec?: ReferenceCodec;
}
```

Supporting types (`lib/types/types.d.ts`):

```ts
export type TriggerChar = '/' | '@';
export type TriggerPosition = 'leading' | 'inline';
export type PickVia = 'menu' | 'space' | 'enter';
export interface ClientSessionContext { readonly sessionId: SessionId; }
export interface InputTriggerCandidate {
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly hint?: string;
}
export type PickOutcome = { readonly claim: CommandClaim; }
    | { readonly insert: ReferenceInsert; }
    | { readonly text: string; }
    | 'handled'
    | undefined;
export interface CandidateRequest {
    readonly query: string;
    readonly position: TriggerPosition;
    readonly signal: AbortSignal;
}
export interface InputTriggerPick {
    readonly candidate: InputTriggerCandidate;
    readonly session: ClientSessionContext;
    readonly position: TriggerPosition;
    readonly via: PickVia;
    readonly span: TokenSpan;
}
```

`CommandClaim`/`ReferenceInsert`/`SubmitOutcome`/`ReferenceCodec` are also in `types.d.ts` (claim has `submit(args, actx): Promise<SubmitOutcome>`; insert has `source/ref/label/clipboardText`; codec has `clipboardText(ref)` and `serialize(ref, signal)`).

### 1d. `slash.menu` locale namespace declaration

Declared by `declare module '@deepseek-ai/dsh-client-ui-slots'` in `client/index.d.ts` (verbatim):

```ts
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'slash.menu': MenuKey;
    }
}
```

where `MenuKey` (`lib/types/client/locales.d.ts`) is `keyof typeof zh` and:

```ts
export declare const zh: {
    command: string;
    skill: string;
    subagent: string;
    loading: string;
    'suggestions.aria': string;
};
export declare const en: { /* same key set */ };
```

### 1e. `conversation.input.overlay` slot merge (this package owns the SlotMap merge)

From `lib/types/client/slots.d.ts` (verbatim):

```ts
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'conversation.input.overlay': {
            kind: 'list';
            scope: 'session';
        };
    }
}
export interface MenuViewInjected {
    menu: SnapshotStore<MenuState>;
    onPick: (source: string, index: number) => void;
    onDismiss: () => void;
}
```

> **How the plugin uses this:** to *add* a slash source, call `ctx.inputTriggers.registerSource(src)` inside a client `apply` and wrap the disposer in `ctx.effect`. `InputTriggerController` is per session and resolved via `ctx.inputTriggers.sessionOf(actx)`.

---

## 2. `dsh-client-ui-slots` — public Slot registration API

### 2a. The pure core: `SlotCore` (`lib/types/index.d.ts`)

The single registration method on the pure core (verbatim):

```ts
register<K extends keyof SlotMap & string, const EntryKey extends EntryKeyOf<K> = EntryKeyOf<K>, const D extends ChildrenDecl = Record<never, never>, H extends StoreDecl | undefined = undefined, M = never, N extends (keyof LocaleNamespaceMap & string) | undefined = undefined, C extends SlotComponent<never> = SlotComponent<never>>(
    options: BaseOptions<K, EntryKey, D, H, M, N> & { inject?: undefined; },
    component: C & SlotComponent<ComposedProps<K, NoInfer<EntryKey>, keyof NoInfer<D> & keyof SlotMap & string, HandleOf<NoInfer<H>>, object, NoInfer<M>, NoInfer<N>>> & RendersCheck<C, D>
): () => void;
```

Inject-bearing overload (registers a business face):

```ts
register<K extends keyof SlotMap & string, I extends object, const EntryKey extends EntryKeyOf<K> = EntryKeyOf<K>, const D extends ChildrenDecl = Record<never, never>, H extends StoreDecl | undefined = undefined, M = never, N extends ...>(options: BaseOptions<K, EntryKey, D, H, M, N> & {
    inject: (...args: InjectParams<K, H>) => I;
}, component: C & SlotComponent<ComposedProps<K, NoInfer<EntryKey>, keyof NoInfer<D> & keyof SlotMap & string, HandleOf<NoInfer<H>>, I, NoInfer<M>, NoInfer<N>>> & RendersCheck<C, D>): () => void;
```

The `BaseOptions` (from `index.d.ts`, verbatim):

```ts
type BaseOptions<K extends keyof SlotMap & string, EntryKey extends EntryKeyOf<K>, D extends ChildrenDecl, H, M = never, N = undefined> = {
    name: K;                       // Target slot key
    children?: D;                  // Child-slot declaration + render authorization + runtime spec
    store?: H;                     // shared handle or exclusive factory
    locale?: N;                    // dictionary namespace -> typed `t` seat
    registrant?: string;
} & KindOptions<K, EntryKey, M>;
```

The returned disposer "removes the registration and its declarations (idempotent)". One lifecycle axis: disposing also collapses every declared child slot and releases the store mount.

Payload kinds: `SlotKind = 'single' | 'list' | 'keyed' | 'chain'`; `SlotScope = 'root' | 'session-maybe' | 'session'`. `KindOptions` selects `key`/`id`/`order`/`select`/`priority` per kind.

### 2b. The runtime Service wrapper: `SlotRegistry` (`dsh-client-runtime/lib/types/client/slots.d.ts`)

This is the `ctx.slots` face. Its `register` "IS the core's register (both overloads reused verbatim)". The service adds fiber-scoped disposal, factory minting, registrant stamp, and store-instance lifecycle. Signature (verbatim):

```ts
export declare class SlotRegistry extends Service {
    readonly register: SlotCore['register'];
    inject(key: keyof SlotMap & string, callback: () => SlotInjectionEffect): () => void;
    install(renderer: SlotRenderer): void;
    installLocale(face: LocaleFace): void;
    renderSlot<K extends keyof SlotMap & string>(key: K, owner: OwnerOf<K>): ReturnType<SlotRenderer['renderRoot']>;
    pruneStoreScope(sessionId: string): void;
    entries(key: keyof SlotMap & string): readonly StoredEntry[];
    entriesOfSlot(key: keyof SlotMap & string): readonly StoredEntry[];
    snapshot(root?: string): LiveSlotNode[];
    onEntryError(...): () => void;
    spec<K extends keyof SlotMap & string>(key: K): SlotSpec<SlotMap[K]> | undefined;
    subscribe(key: keyof SlotMap & string, fn: () => void): () => void;
    getVersion(key: keyof SlotMap & string): number;
}
```

### 2c. How a session-scoped slot gets `sessionId`

Every session-scope slot component receives framework-standard props. From `dsh-client-runtime/lib/types/client/index.d.ts` (verbatim, the real members merged into the empty seat from ui-slots):

```ts
interface SessionStandardProps {
    useSession: SnapshotSelectorHook<ConversationSnapshot>;
    sessionId: SessionId;
    useProjection: UseProjection;
}
interface SessionMaybeStandardProps {
    useSession: MaybeSnapshotSelectorHook<ConversationSnapshot>;
    sessionId: SessionId | undefined;
    useProjection: UseProjection;
}
interface GlobalStandardProps {
    useSessions: SnapshotSelectorHook<SessionListState>;
    useWorkspaces: SnapshotSelectorHook<WorkspaceListState>;
}
```

So a session-scope slot entry never reads `sessionId` off `owner` — it comes in as the injected `sessionId` prop (and `ctx.sessions.scopeOf(ctx)` reads it off a context; `scopeOf` is also exported standalone). `SessionId` is a branded id from `@deepseek-ai/dsh-client-connection/client`.

### 2d. Store seat / disposer behavior

The store machinery lives in `lib/types/store.d.ts` and `dsh-client-runtime/lib/types/client/contract/store.d.ts`:

```ts
// dsh-client-ui-slots/lib/types/store.d.ts (verbatim segments)
export type SnapshotSelectorHook<T> = <S>(sel: (s: T) => S, eq?: (a: S, b: S) => boolean) => S;
export interface StoreHandle<T, A extends ActionsDecl<T>> {
    readonly spec: StoreSpec<T, A>;
    create(scopeKey?: string): StoreInstance<T, A>;
}
export type StoreDecl = StoreHandle<any, any> | StoreFactory;
// dsh-client-runtime .../contract/store.d.ts
export interface SnapshotStore<T> extends ObservableSnapshot<T> {
    update(mutator: (draft: T) => void): void;
    set(next: T): void;
}
export declare function defineStore<T, A extends ActionsDecl<T>>(decl: StoreSpec<T, A> & { actions: A & ActionsDecl<T>; }): EngineStoreHandle<T, A>;
```

> **How the plugin uses this:** register into a slot with `ctx.slots.register({ name, children?, store?, locale?, ...kindOptions }, component)`. Dispose by calling the returned function or by the fiber unloading. Session id is auto-injected via the standard kit.

---

## 3. `dsh-client-ui-conversation` — input / composer extension surface

### 3a. The public standard faces: `useInput` + `inputActions`

Declared in `lib/types/client/contract/slots.d.ts` via `declare module '@deepseek-ai/dsh-client-ui-slots'` (verbatim):

```ts
interface SessionStandardProps {
    useInput: SnapshotSelectorHook<InputState>;
    inputActions: InputActions;
}
interface SessionMaybeStandardProps {
    useInput: MaybeSnapshotSelectorHook<InputState>;
    inputActions: InputActions | undefined;
}
```

`InputActions` (`lib/types/client/input/contract.d.ts`, verbatim):

```ts
export interface InputActions {
    setDraft(text: string): void;
    addImages(ids: readonly DraftAttachmentId[]): boolean;
    removeImage(id: DraftAttachmentId): void;
    pruneImages(ids: readonly DraftAttachmentId[]): void;
    submit(): void;
}
```

### 3b. Reading the current draft

Read the live `InputState` through `useInput` (selector hook); the full state shape (`input/contract.d.ts`, verbatim):

```ts
export interface InputState {
    readonly draft: string;
    readonly imageIds: readonly DraftAttachmentId[];
    readonly draftRev: number;
    readonly phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting';
    readonly claim?: { readonly token: string; readonly hint?: string; };
    readonly occurrences: readonly Occurrence[];
    readonly paste?: PasteAttemptState;
    readonly queue: readonly QueuedMessage[];
}
```

### 3c. Setting/replacing the draft and submitting

- Set: `inputActions.setDraft(text)` (or `ctx.conversation.input.for(actx).setDraft(text)` — the `SessionInput` facade).
- Submit: `inputActions.submit()` (default mode) or `SessionInput.submit(mode?: InputSubmitMode)`.

The full `SessionInput` facade (`input/contract.d.ts`, verbatim):

```ts
export interface SessionInput extends InputTarget {
    setDraft(text: string): void;
    addImages(ids: readonly DraftAttachmentId[]): boolean;
    removeImage(id: DraftAttachmentId): void;
    pruneImages(ids: readonly DraftAttachmentId[]): void;
    submit(mode?: InputSubmitMode): void;
    notify(level: 'info' | 'error', text: string): void;
    readonly state: SnapshotStore<InputState>;
}
export interface SessionInputResolver {
    for(actx: ClientContext): SessionInput;
}
```

`InputSubmitMode = BusyEnterBehavior` (`contract/composer-submission.d.ts`).

> **How the plugin uses this:** inside a session-scope slot component, `const { useInput, inputActions } = props; const draft = useInput(s => s.draft)`. For richer control (submit with mode, notify, track/arbitrate), resolve the facade via `ctx.conversation.input.for(actx)` (session-scoped ctx) or call `ctx.conversation.send(text)` / `.cancel()`.

### 3d. Conversation service face `ctx.conversation`

From `lib/types/client/service.d.ts` (verbatim):

```ts
export interface IConversation {
    readonly input: SessionInputResolver;
    readonly blocks: ComposerBlocks;
    send(text: string): Promise<void>;
    updateQueue(itemId: QueueItemId, action: QueueAction): Promise<void>;
    cancel(): Promise<void>;
    loadOlder(): Promise<void>;
}
```

Also `ConversationController.sendSession(session, text, imageIds, mode)`, `createDraftImages(files)`, `draftImages(ids)`, etc.

### 3e. `conversation.input.dock` and `conversation.input.overlay` — exactly as registered

From `lib/types/client/contract/slots.d.ts` (dock) and `dsh-client-ui-input-trigger/lib/types/client/slots.d.ts` (overlay), verbatim:

```ts
// conversation/contract/slots.d.ts
'conversation.input.dock': { kind: 'list'; scope: 'session'; owner: InputZone; };
'conversation.composer.dock': { kind: 'list'; scope: 'session'; owner: InputZone; };
'conversation.input.left': { kind: 'list'; scope: 'session'; owner: InputZone; };
'conversation.input.right': { kind: 'list'; scope: 'session'; owner: InputZone; };
'conversation.composer': { kind: 'chain'; scope: 'session'; owner: ComposerChainProps; };
'conversation.composer.bar': { kind: 'single'; scope: 'session-maybe'; owner: ComposerBarOwnerProps; };
'conversation.input.plan': { kind: 'single'; scope: 'session'; owner: InputControlOwnerProps; };
'conversation.input.model': { kind: 'single'; scope: 'session'; owner: InputControlOwnerProps; };

// input-trigger/client/slots.d.ts
'conversation.input.overlay': { kind: 'list'; scope: 'session'; };
```

`InputZone` (verbatim):

```ts
export interface InputZone {
    readonly session: ConversationSnapshot;
    readonly input: InputState;
}
```

### 3f. Keyboard / keydown extension seam

The composer-bar entry receives a package-internal keyboard face through its inject, `ComposerKeyboard` (`input/contract.d.ts`, verbatim):

```ts
export interface ComposerKeyboard {
    readonly snapshot: InputState;
    setDraft(text: string, editRange?: EditRange): void;
    submit(mode: InputSubmitMode): void;
    steerQueue(): void;
    undo(): void;
    redo(): void;
    pasteBegin(text: string, selection: EditSelection, components?: readonly PasteComponent[], generation?: number): void;
    invalidatePaste(): void;
    track(draft: string, caret: number): void;
    arbitrate(key: ArbitrateKey, composing: boolean): ArbitrateOutcome;
    space(): boolean;
    dismissPopup(): void;
}
```

This is explicitly **not** a public cross-plugin seam: "package-internal, never across a plugin boundary." The public extension surface is the slots (dock/left/right/overlay) + `useInput`/`inputActions` standard kit. There is no separate documented public "keydown hook" — key handling is owned by InputBar and the input machine; a plugin adds chrome via slots, not by intercepting keys.

---

## 4. `dsh-client-runtime` — the Client runtime

### 4a. `ClientContext`

From `lib/types/client/index.d.ts` (verbatim):

```ts
/** Client-side Cordis context after declaration merging. */
export type ClientContext = Context;
```

So a Client plugin's `ctx` is a Cordis `Context`. Client plugins declare required services with `inject` and mount in `apply(ctx)`:

```ts
export declare const inject: string[];
export declare function apply(ctx: Context): void;
```

### 4b. Services available on `ctx` (from `client/index.d.ts` `declare module '@deepseek-ai/cordis'`)

```ts
interface Context {
    slots: import('./slots.ts').SlotRegistry;
    conversationEvents: ...ConversationEventRegistry;
    conversationViews: ...ConversationViewRegistry;
    sessions: import('./contract/sessions.ts').ISessions;
    workspaces: import('./contract/workspaces.ts').IWorkspaces;
}
interface Events {
    'slots/changed'(key: string): void;
    'connection/reset'(): void;
}
```

### 4c. Session scope / sessionId

From `contract/sessions.d.ts` — `ISessions` includes (verbatim):

```ts
scope(id: SessionId): AgentContext | undefined;
scopeOf(ctx: Context): SessionId | undefined;
sessionOf(ctx: Context): SessionFace | undefined;
binding(id: SessionId): SessionBinding | undefined;
provide(descriptor: SessionProvideDescriptor): () => void;
```

`SessionFace = ISession & ObservableSnapshot<ConversationSnapshot>`; `SessionId` is a branded id. Session-scoped UI instead uses the framework-injected `sessionId`/`useSession` props (§2c).

### 4d. Client → Host callback (private channel)

The private channel is **not** `ctx.*`; it is the closure symbol `host` (or `harness` on the Host). See §7 for full detail. On the Client, `host.call(method, args)` routes through the package runner's `invoke(pluginId, pluginRunId, method, args)` to the Host handler registered with `harness.handle`. There is a parallel public channel: the `remote.<namespace>` Typert Remote services (e.g. `settings`, `sessions`, `connection`) on `ctx.remote`/`IApiClient`.

### 4e. `session` service

`ISession` (`contract/session.d.ts`, verbatim — key methods):

```ts
export interface ISession {
    readonly sessionId: SessionId;
    readonly projections: ProjectionsFace;
    prompt(content: PromptContentPart[], mode: 'queue' | 'steer'): Promise<RpcResult<{ accepted: true; }>>;
    readAttachment(attachmentId: AttachmentIdType): Promise<RpcResult<{ attachment: ImageAttachmentRef; data: Uint8Array; }>>;
    updateQueue(itemId: MessageId, action: QueueAction): Promise<RpcResult<{ accepted: true; }>>;
    cancel(): Promise<RpcResult<{ accepted: true; }>>;
    rename(title: string): Promise<RpcResult<{ title: string; seq: number; }>>;
    loadOlder(): Promise<void>;
    command(line: string): Promise<RemoteResult<{ matched: boolean; }>>;
}
```

Resolve it with `ctx.sessions.sessionOf(ctx)` (requires a session-scoped ctx) or `ctx.sessions.binding(id).session`.

### 4f. `settings` (settings-scope)

`contract/settings-scope.d.ts` (verbatim):

```ts
export interface SettingsScope<T> {
    getSnapshot(): SettingsScopeSnapshot<T>;
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<void>;
    unset(field: string): Promise<void>;
}
export interface SettingsScopeSpec<T> {
    namespace: string;
    decode?: (section: unknown) => T | undefined;
}
export interface SettingsScopeSnapshot<T> {
    status: 'loading' | 'ready' | 'unavailable';
    value: T | undefined;
    base: unknown;
    user: unknown;
    revision: number | undefined;
    writable: boolean;
    mode: 'host' | 'memory';
}
```

The concrete binder/service that mounts these is in `dsh-client-ui-settings` (`SettingsScopeBinder` on `ctx.settingsScope`, method `bind<T>(spec): SettingsScope<T>`).

### 4g. How a client plugin declares `inject`

From `dsh-client-ui-input-trigger` (verbatim): `export declare const inject: string[];`. (Concrete arrays are not in the .d.ts values; the shipped packages use e.g. `['slots', 'conversation', ...]`.)

---

## 5. `dsh-client-modules` — Client Modules manifest model

### 5a. `dsh.client` + `exports["./client"]`

From the input-trigger `package.json` (the canonical pattern, verbatim):

```json
"exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    ...
},
"dsh": {
    "client": {
        "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-locale"],
        "platform": "web"
    }
}
```

The Node half scans enabled Loader entries for `dsh.client` packages, resolves each `exports["./client"]`, hashes the built bundle into the boot graph, and serves it at `/plugins/<id>/client.js?rev=<rev>`.

### 5b. The manifest type — `BootManifest` / `DshWindow`

From `dsh-client-modules/lib/types/client/manifest.d.ts` (verbatim):

```ts
export interface BootManifest {
    rev: string;
    modules: BootModuleRow[];
    plugins: BootPluginRow[];
}
export interface WebBootEntry {
    id: string;          // entry name == package name
    url: string;         // '/plugins/<id>/client.js?rev=<rev>'
    rev: string;
    inject?: string[];
    immediately?: boolean;
}
export interface WebBootGraph {
    rev: string;
    entries: WebBootEntry[];
}
export interface DshWindow {
    __DSH_BOOT__?: unknown;
    __ModuleLoader__?: { load(handoff: ClientPluginHandoff): void; };
    __DSH_MODULES__?: ClientModuleSystem;
}
export interface ClientPluginHandoff {
    id: string;
    factory: (require: (spec: string) => unknown) => Record<string, unknown>;
}
```

### 5c. Assembly unit / inject

The client module system (`ClientModuleSystem implements ClientModuleLoader`) is a lazy CJS table. A client package is an assembly unit whose activation order is fiber-inject waiting — the `dsh.client.inject` edges become Loader `inject` edges, so a browser half that declares `ctx.conversation`/`ctx.inputTriggers` etc. waits until those services are up. `ctx.modules` is the provided module loader (`manifest.d.ts`):

```ts
declare module '@deepseek-ai/cordis' { interface Context { modules: ClientModuleLoader; } }
```

> **How the plugin uses this:** mark the package `"dsh": { "client": { "inject": [...], "platform": "web" } }` and add `exports["./client"]`; the host bundles and serves it, and cordis waits on the injected services before activating the browser half.

---

## 6. Host-side contract

### 6a. The profile/bundle model (`dsh.app-boot/lib/types/profile.d.ts`, verbatim)

```ts
export declare const PROFILE_PATCH_FILENAME = "cordis.patch.yml";

export interface DshBundleManifest { patch: string; }
export interface DshProfileManifest { bundles?: string[]; }
export interface DshManifestSection {
    bundle?: DshBundleManifest;
    profile?: DshProfileManifest;
}
export interface ProfileManifest {
    name?: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    dsh?: DshManifestSection;
}
export interface ProfileLayer {
    packageName: string;
    packageDir: string;
    patchPath: string;
    patches: PatchOptions[];
}
export interface Profile {
    name: string;
    dir: string;
    layers: ProfileLayer[];
    patchPath: string;
    patches: PatchOptions[];
}
```

`@deepseek-ai/dsh-base` is "shared dsh core as a profile bundle" whose substance is `cordis.patch.yml` declared via `dsh.bundle.patch`; `dsh-web-app`/`dsh-headless` are surface bundles that ride over it.

### 6b. `cordis.patch.yml` shape

The patch file is a YAML array of `PatchOptions` from `cordis-plugin-include` (verbatim):

```ts
export interface PatchOptions {
    id?: string;
    insert?: EntryOptions[];
    name?: string;
    config?: any;
    group?: boolean | null;
    disabled?: boolean | null;
    inject?: any;
    intercept?: any;
    isolate?: any;
    [key: string]: any;
}
```

Core YAML rows use the Cordis entry-list dialect (`entryListSchema`, `!!js` expressions allowed), e.g. `- id: some.plugin` / `- insert:` (nested entry lists) / `config:` etc. Composite layer order: each bundle's patch in `dsh.profile.bundles` order → profile's `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlays → flag patches.

### 6c. CLI: `dsh plugin --profile`, `--dump-config`

From `@deepseek-ai/dsh/README.md` (verbatim):

```
| `dsh --profile <name>` | Boot the named profile under `$DSH_HOME/profiles/<name>`. |
| `dsh --profile headless "job"` | Run one fresh persisted session, print the final answer, and exit. |
| `dsh web` | Alias of `--profile web`. |
| `dsh plugin --profile <name> <pnpm args>` | Manage a profile's plugins by forwarding to pnpm in the profile directory. |
```

> Note: `dsh plugin --profile <p> add <pkg>` is **pnpm forwarding** — the launcher forwards `<pnpm args>` to `pnpm` inside the profile directory. So `dsh plugin --profile <p> add <pkg>` runs `pnpm add <pkg>` in `$DSH_HOME/profiles/<p>`; to be a bundle layer you must also add it to `dsh.profile.bundles` in the profile's `package.json`.

`--dump-config` / `--dump-default-config` (README verbatim): "Use `--dump-default-config` and `--dump-config` to inspect the composed tree without booting it." `--dump-default-config` skips the user layer (`loadProfile(..., { userLayer: false })`). The dump is rendered via `renderConfigDump` (app-boot §`index.d.ts`) using `applyEntryPatches`, so the dump is exactly what boots.

### 6d. `agent/pre-step` event (Host)

From `@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts` (verbatim):

```ts
'agent/pre-step'(this: Scoped<Agent>, payload: {
    agent: Agent;
    messages: UserMessage[];
    turn: number;
    step: number;
    signal: AbortSignal;
}, next: () => Promise<PreStepDecision>): Promise<PreStepDecision>;
```

`@mode waterfall` — a listener either calls `next()` (preserving current messages) or returns its own `PreStepDecision` (`{ kind: 'reject' }` or `{ kind: 'enter'; messages: UserMessage[] }`). Scope-filtered via `dsh-scope`: agent-scoped listeners (registered on `agent.ctx`) receive only that agent.

**How a Host plugin registers one:** register the listener on an agent-scoped context (e.g. `agent.ctx.on('agent/pre-step', listener)`), or via `ctx.agents`-style helpers. Prestep companion plugins (`dsh-tmux-context`, `dsh-time-context`) say `apply(ctx, config)` "Register a prepended pre-step listener for the lifetime of `ctx`". The `Agent` handle is available at `ctx.agents.get(id)` / `Agent.ctx.agent`, and events are dispatched with the agent's scope carrier. Also `ctx.agent` is an own property on `Agent.ctx` (`dsh-agent` `declare module '@deepseek-ai/cordis' { interface Context { agents: AgentRegistry; agent?: Agent; } }`).

### 6e. Host-side settings schema registration

`@deepseek-ai/dsh-settings/lib/types/index.d.ts` — the Host `ctx.settings` service (`SettingsProvider`). To register a namespace schema (verbatim):

```ts
export declare function settingsNamespace(value: string): SettingsNamespace;

export interface SettingsRegisterOptions<T> {
    base?: Partial<T>;
    applies?: SettingsApplies;
    validate?: (value: T) => void;
}

export interface SettingsScope<T> {
    get(): T;
    watch(callback: (next: T, prev: T) => void | Promise<void>): () => void;
    update(patch: object): Promise<void>;
    replace(section: object): Promise<void>;
}

register<T>(ns: SettingsNamespace, schema: z<T>, options?: SettingsRegisterOptions<T>): SettingsScope<T>;
```

`SettingsNamespace = Branded<'SettingsNamespace'>`. The pattern used by shipped Host plugins (e.g. `dsh-agent-loop`, `dsh-agent-default-model`):

```ts
export declare const AGENT_LOOP_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
export declare const AGENT_LOOP_SETTINGS_SCHEMA: z<AgentLoopSettings>;
// inside apply(ctx): ctx.settings.register(AGENT_LOOP_SETTINGS_NAMESPACE, AGENT_LOOP_SETTINGS_SCHEMA, { base: ... })
```

There is also a convenience `installSettingsSection<T>(ctx, ns, schema, entry, hooks)` for the common "register my composition entry as `base`" pattern. No official generator/helper beyond `settingsNamespace(...)` — you brand the name and supply a schemastery schema yourself.

> **How the plugin uses this (Host):** `const scope = ctx.settings.register(settingsNamespace('my-plugin'), z.object({...}).passthrough(), { base })`, then read `scope.get()`, observe with `scope.watch()`, and write with `scope.update(...)`; call `ctx.settings.describe({ redactSecrets: true })` to expose to config UIs. Note: remote visibility still requires an allowlist — the hosted API proxy only serves explicitly exposed namespaces (per `dsh-host-apiproxy`).

---

## 7. Host ↔ Client private RPC bridge

### 7a. Host registers a Client-callable method: `harness.handle`

The Host half evaluates in a `node:vm` sandbox whose symbol surface includes `harness` (`@deepseek-ai/dsh-cordis-host-runner/lib/types/sandbox.d.ts`, `HOST_BUILTIN_INSPECTION`, verbatim):

```ts
{
    readonly name: "harness";
    readonly description: "Host helpers for Package-private Client RPC and model-visible dynamic Tools.";
    readonly signatures: readonly [
        "harness.handle(method: string, handler: (args: JsonValue) => JsonValue | Promise<JsonValue>): () => void",
        "harness.defineTool(definition: ToolDefinition): ToolDefinition",
        "harness.registerTool(ctx: Context, tool: ToolDefinition): () => void"
    ];
}
```

So a Host plugin body registers a callable method with:

```ts
harness.handle('myMethod', (args) => { return { ok: true }; }); // returns disposer
```

The guard normalizes it (`dsh-cordis-host-runner/lib/types/guard.d.ts`, verbatim):

```ts
export declare function normalizeHandler(method: unknown, fn: unknown): {
    method: string;
    handler: (args: unknown) => Promise<unknown>;
};
```

The handler's result is host-materialized through a cross-realm JSON clone (args arrive wire-decoded JSON; result must be JSON). The active run's registered handler names are reachable via the snapshot (`DynamicCordisRunnerService.snapshot` → `activeRun.handlers: string[]`).

### 7b. Client calls a Host method: `host.call`

The Client half evaluates in a closure whose parameter surface includes `host` (routed to the package's Host half). From `@deepseek-ai/dsh-cordis-client-runner/lib/types/client/evaluator.d.ts` (verbatim):

```ts
export interface DynamicCordisClosureEnv {
    /** Route `host.call` to this package's host half over the wire. */
    invoke(method: string, args: unknown): Promise<unknown>;
    noteError(message: string): void;
}
```

And `runtime.d.ts`:

```ts
export interface DynamicCordisRunnerEnv {
    ctx: Context;
    loader: Loader;
    modules: ClientModuleSystem;
    slots: SlotRegistry;
    invoke(pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, method: string, args: unknown): Promise<unknown>;
}
```

So within a Client plugin `apply(ctx)`, you call `await host.call('myMethod', args)` — the `host` symbol is a closure parameter (not a `ctx` property). It is routed via the package runner's `invoke` to the Host service `DynamicCordisRunnerService.invoke(pluginId, pluginRunId, method, args)` (`@deepseek-ai/dsh-cordis-host-runner`), which dispatches to the handler registered by `harness.handle`. The Host side signature (verbatim):

```ts
invoke(pluginId: CordisDynamicPluginId, pluginRunId: CordisDynamicPluginRunId, method: string, args: JsonValue): Promise<DynamicCordisInvokeResult>;
```

`JsonValue = import('@deepseek-ai/dsh-session/types')`. **Only lossless JSON may cross.** The direction is strictly Client→Host.

### 7c. The `@pluginId` / source-file reference

A Client package referencing Host data (e.g. a settings namespace read, a filesystem query) does so through `host.call('methodName', args)`; the matching Host half registers the handler with `harness.handle('methodName', (args) => ...)`. The method names are free-form strings agreed between the two halves — there is no generated typings bridge; the plugin author must define both sides.

> **Distinct public channel (not to be confused):** static client packages also get generated Typert `Remote` namespaces (e.g. `ctx.remote.settings`, `sessions`, `connection`) via `@deepseek-ai/dsh-api-remotes` / `dsh-api-gateway` — those are the ordinary product RPC services, separate from the Package-private `host.call`/`harness.handle` bridge used by dynamic plugins.

### 7d. Items that DON'T exist / must be inferred

- **No official "settings schema helper" for dynamic plugin Host halves.** Shipped Host plugins brand the name with `settingsNamespace(...)` and write a schemastery schema manually, then register on `ctx.settings.register(ns, schema, ...)`. There is no code generator — but the `@` source-file plugin is a static plugin, so it can import `@deepseek-ai/dsh-settings` directly (a static plugin is not restricted to the sandbox symbol surface).
- **`harness` / `host` are closure symbols, not `ctx` properties.** They are not `declare module`-merged, so TypeScript does not know them; in a static-typed plugin you bring your own types matching the signatures above. Dynamic-plugin source strings use them as bare identifiers inside the evaluated closure.
- **`host.call` is only for Package-private Client→Host RPC.** It is not a general agent/session gateway; for session/agent actions use `ISession` methods or `remote.<namespace>`.
- **`conversation.input.overlay` SlotMap merge home is split** from its slot ownership (ui-conversation owns the anchor/children), but registration just targets the exact name.
- **No public keydown hook** beyond the package-internal `ComposerKeyboard` — chrome goes through slots.
