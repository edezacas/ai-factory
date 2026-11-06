---
name: angular-conventions
description: Mandatory Angular conventions. Activate ALWAYS before writing, modifying, or reviewing any Angular code (.ts, .html, .scss) — components, services, modules, guards, pipes, interceptors, or forms. Also activate on any mention of NgModule, inject(), signal, takeUntilDestroyed, SharedModule, or any Angular stack element.
metadata:
  author: edezacas
  version: "0.1"
---

## Standalone Components (REQUIRED)

Components are standalone by default. Do NOT set `standalone: true`.

```typescript
@Component({
  selector: 'app-user',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserComponent {}
```

## Input/Output Functions (REQUIRED)

```typescript
// ✅ ALWAYS: Function-based
readonly user = input.required<User>();
readonly disabled = input(false);
readonly selected = output<User>();
readonly checked = model(false);  // Two-way binding

// ❌ NEVER: Decorators
@Input() user: User;
@Output() selected = new EventEmitter<User>();
```

## Signals for State (REQUIRED)

Use `signal()` for state, never `BehaviorSubject` in components.

```typescript
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);

// Update
this.count.set(5);
this.count.update(prev => prev + 1);

// Side effects
effect(() => localStorage.setItem('count', this.count().toString()));
```

---

## NO Lifecycle Hooks (REQUIRED)

Signals replace lifecycle hooks. Do NOT use `ngOnInit`, `ngOnChanges`, `ngOnDestroy`.

```typescript
// ❌ NEVER: Lifecycle hooks
ngOnInit() {
  this.loadUser();
}

ngOnChanges(changes: SimpleChanges) {
  if (changes['userId']) {
    this.loadUser();
  }
}

// ✅ ALWAYS: Signals + effect
readonly userId = input.required<string>();
readonly user = signal<User | null>(null);

private userEffect = effect(() => {
  // Runs automatically when userId() changes
  this.loadUser(this.userId());
});

// ✅ For derived data, use computed
readonly displayName = computed(() => this.user()?.name ?? 'Guest');
```

### When to Use What

| Need | Use |
|------|-----|
| React to input changes | `effect()` watching the input signal |
| Derived/computed state | `computed()` |
| Side effects (API calls, localStorage) | `effect()` |
| A subscription that outlives one run | `takeUntilDestroyed()` on the component `DestroyRef` |
| Cleanup inside one effect run | the `onCleanup` callback the effect gives you |

```typescript
// Cleanup example
private readonly destroyRef = inject(DestroyRef);

constructor() {
  const subscription = someObservable$.subscribe();
  this.destroyRef.onDestroy(() => subscription.unsubscribe());
}
```

## Dependency Injection

Always `inject()`, never constructor injection.

```typescript
// ✅
private clientService = inject(ClientService);

// ❌
constructor(private clientService: ClientService) {}
```


## Subscriptions

A subscription belongs to the component, not to one run of a function: always end it with `takeUntilDestroyed()`, never `ngOnDestroy` + `Subject`.

```typescript
private destroyRef = inject(DestroyRef);

this.myService.getData()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(data => this.data.set(data));
```

Only when the subscription *is* the effect run do you clean it up with the effect's own `onCleanup`, because that subscription ends with the run:

```typescript
private streamEffect = effect((onCleanup) => {
  const sub = this.myService.watch(this.userId()).subscribe(u => this.user.set(u));
  onCleanup(() => sub.unsubscribe());
});
```

## Control Flow

Use `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`, `*ngSwitch`.

- `@for` must always have a `track` on a unique property (e.g. `track item.id`); use `$index` only for static lists.
- Use `@empty` inside `@for` for the zero-items case.
- Prefer `as` in `@if` to avoid re-evaluating expensive expressions.

## Resources

- https://angular.dev/guide/signals
- https://angular.dev/guide/templates/control-flow
- https://angular.dev/guide/zoneless
