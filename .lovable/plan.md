

## Fix: Tutorial Overlay Not Showing in Create Routine Modal

### Problem
The `TutorialOverlay` is rendered inside `CreateRoutineModal`, which always mounts (the modal visibility is controlled by `AnimatePresence` internally). This means the tutorial checks `localStorage` on page load — before the user ever opens the modal — and either silently shows behind the scenes or marks itself as done.

### Solution
Make the `TutorialOverlay` only mount when the create modal is actually open (`showCreateModal === true`), so the localStorage check and display happen at the right time.

### Changes

**`src/components/CreateRoutineModal.tsx`**
- Wrap `<TutorialOverlay />` in a conditional: only render when `showCreateModal` is true and `editingRoutineId` is null (so it only shows for new routine creation, not editing).

```tsx
{showCreateModal && !editingRoutineId && <TutorialOverlay />}
```

This single change ensures the tutorial mounts (and checks localStorage) only when the user actually opens the "Create Routine" modal for the first time.

