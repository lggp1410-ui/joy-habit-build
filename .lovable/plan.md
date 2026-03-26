

## Final Polish & Tutorial System

This plan covers all 13 items. Due to the scope, implementation will be split into logical groups.

### 1. Timer Header Fix (RoutineDetail.tsx)
Line 28: `endM = (startM + totalMinutes) % 60` is wrong when totalMinutes has fractional values (tasks with seconds). Fix: use `Math.floor(totalMinutes)` for the end time calculation. Also the `totalMinutes` sum from tasks with sub-minute durations produces decimals.

```
const totalMinutesRaw = routine.tasks.reduce((sum, t) => sum + (t.duration || 1), 0);
const totalMinutes = Math.round(totalMinutesRaw);
const endH = Math.floor((startH * 60 + startM + totalMinutes) / 60) % 24;
const endM = (startM + totalMinutes) % 60;
```

### 2. Gallery Cleanup (IconPicker.tsx + useAirtableIcons.ts)
- In `useAirtableIcons.ts`: filter icons with empty/invalid URLs before returning
- In `IconPicker.tsx`: add `onError` handler on `<img>` tags to hide broken images (set display:none or filter out)
- Clean `recentIcons` in store: already filters non-http URLs

### 3. Drag & Drop Reorder (RoutineDetail.tsx + routineStore.ts)
- Add `GripVertical` (lucide) icon before each task's icon circle
- Implement touch-based drag reorder using `onTouchStart/Move/End` on the grip handle
- Add `reorderTasks(routineId: string, taskIds: string[])` action to store
- Visual feedback: translate the dragged item, swap positions on move

### 4. Localized Icon Search (IconPicker.tsx)
The Airtable filenames are in Portuguese. For other languages, add a keyword translation map in the edge function that maps Portuguese filenames to translated keywords. Simpler approach: search against both the `filename` and the translated `category name`, and add a small translation map for common icon terms in `IconPicker.tsx` that maps search terms from other languages to Portuguese equivalents.

### 5. Visual Spacing (RoutineDetail.tsx)
- Increase gap between task items: add `space-y-3` or `mb-3` between task rows
- Increase padding on the rest-time divider from `py-2` to `py-3`

### 6. Explore Preview (ExploreScreen.tsx)
- Add state `previewRoutine` to track which suggested routine is being previewed
- Clicking a routine card sets `previewRoutine` instead of immediately adopting
- Show a bottom-sheet modal listing the tasks (icon + name + duration) with "Adopt" and "Close" buttons

### 7. Sound Feedback Fix
The file `Pássaros.mp3` exists in `public/sounds/`. The issue is likely URL encoding of the special character `á`. Fix:
- Rename the file to `Passaros.mp3` (no accents) in public/sounds
- Update references in `completionSound.ts` and `SettingsScreen.tsx`
- Alternatively, encode the path properly: `/sounds/P%C3%A1ssaros.mp3`
- Sound preview on selection already works in `handleSoundSelect` -- just fix the path

### 8. Interactive Tutorial (New: TutorialOverlay.tsx)
- Create `TutorialOverlay.tsx` with 5 steps, each highlighting a UI element:
  - Step 1: (+) FAB button -- "Tap here to create a new routine"
  - Step 2: Creating routines -- "Add tasks with icons, timer, and names"
  - Step 3: List icon (top-right) -- "View all your routines here"
  - Step 4: Grip handle (=) -- "Drag to reorder your tasks"
  - Step 5: Start button -- "Press to start the timer"
- Each step: pastel pink tooltip bubble with arrow pointing to element
- Buttons: "Skip" (closes) and "Got it!" (next step)
- Store `planlizz-tutorial-done` in localStorage
- Show automatically on first visit (after login/guest)
- Render in `HomeScreen.tsx` or `Index.tsx`

### 9. "View Tutorial" in Settings (SettingsScreen.tsx)
- Add a `HelpCircle` icon item in the preferences section
- On click: remove `planlizz-tutorial-done` from localStorage, navigate to home tab, trigger tutorial
- Add i18n key: `settings.viewTutorial`

### 10. Icons Not Loading After Reopening (useAirtableIcons.ts)
Airtable attachment URLs are temporary (expire after ~2 hours). The 24h cache stores expired URLs. Fix:
- Reduce cache TTL to 1 hour
- On cache hit, still do background refresh (already does this)
- Add `onError` on all icon `<img>` tags to trigger re-fetch or hide
- In the PWA workbox config, add runtime caching for Airtable CDN URLs

### 11. PWA Offline Support (vite.config.ts + main.tsx)
- Already has `VitePWA` configured with workbox
- Add runtime caching for Airtable CDN: `urlPattern: /^https:\/\/.*airtable.*\/.*$/i` with `CacheFirst` + expiration
- Fix `main.tsx`: remove manual `/sw.js` registration (conflicts with VitePWA auto-registration)
- Add iframe/preview guard per PWA guidelines:
  ```
  const isInIframe = window.self !== window.top;
  const isPreviewHost = window.location.hostname.includes('id-preview--');
  if (isPreviewHost || isInIframe) { unregister SWs }
  ```
- Add `devOptions: { enabled: false }` to VitePWA config

### 12. Bug-Free Assurance
- All fixes above address known bugs
- Timer calculation fix (item 1)
- Sound path fix (item 7)
- Icon loading fix (items 2, 10)
- SW registration fix (item 11)

### 13. Google Login
Login code already uses `lovable.auth.signInWithOAuth('google', ...)` correctly. The PWA config has `navigateFallbackDenylist: [/^\/~oauth/]`. This should work. No changes needed unless testing reveals issues.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/TutorialOverlay.tsx` | New -- tutorial tooltip component |
| `src/components/RoutineDetail.tsx` | Fix timer calc, add drag handles, spacing |
| `src/components/IconPicker.tsx` | Broken icon filtering, localized search |
| `src/hooks/useAirtableIcons.ts` | Reduce cache TTL, filter invalid URLs |
| `src/components/screens/ExploreScreen.tsx` | Add preview modal |
| `src/components/screens/SettingsScreen.tsx` | Add "View Tutorial", fix sound path |
| `src/components/screens/HomeScreen.tsx` | Integrate TutorialOverlay |
| `src/stores/routineStore.ts` | Add reorderTasks action |
| `src/utils/completionSound.ts` | Fix Pássaros path |
| `src/main.tsx` | Fix SW registration with iframe guard |
| `vite.config.ts` | Add runtime caching, devOptions |
| `src/i18n/locales/pt-BR.json` | Add tutorial + help keys |
| `src/i18n/locales/en.json` | Add tutorial + help keys |
| `src/i18n/locales/fr.json` | Add tutorial + help keys |
| `src/i18n/locales/ja.json` | Add tutorial + help keys |
| `src/i18n/locales/ko.json` | Add tutorial + help keys |

