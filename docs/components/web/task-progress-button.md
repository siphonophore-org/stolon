# Task Progress Button

`shared.pollTaskProgress(btn, taskKey, label, onComplete)` turns a button into a live progress display for a Jellyfin scheduled task. `shared.runScheduledTask(btn, taskKey, label, onComplete)` starts the task first.

## Decision

| When | Use |
| :--- | :--- |
| A button that starts a scheduled task and then waits for it | `shared.runScheduledTask` |
| A task already started, such as by the server | `shared.pollTaskProgress` |
| A task the plugin runs itself | A [Poller](poller.md) and a [Progress Bar](progress-bar.md) |

## Usage

```html
<button is="emby-button" type="button" id="btnSync" class="raised stolon-button stolon-primary"><span>Sync</span></button>
```

```js
var handle = shared.pollTaskProgress(view.querySelector('#btnSync'), taskKey, 'Sync', function () { reloadStatus(); });
// on viewhide: handle.cancel();
```

```js
shared.runScheduledTask(view.querySelector('#btnSync'), taskKey, 'Sync', reloadStatus).then(function (handle) { running = handle; },
    function (err) { shared.setStatus('syncStatus', err.message, true); });
```

Classes: `stolon-btn-progress-host`, `stolon-btn-progress`.

## States and Modifiers

* The button is disabled and shows "Label N%" in its first `span`. It is enabled again when the task finishes.
* The helper adds `stolon-btn-progress-host` to the button and appends a [Progress Bar](progress-bar.md) fill, `stolon-progress-bar stolon-btn-progress`, that grows with the percent along the bottom edge. A `.stolon-btn-progress` element already in the button takes the same classes.
* A `small` button never draws the bar. A [Progress Ring](progress-ring.md) pie, `stolon-btn-progress-pie`, fills beside it instead.
* It uses the dashboard WebSocket (`ScheduledTasksInfoStart`) when the event bus is reachable, and polls `ApiClient.getScheduledTasks()` as a safety net, every second without the socket and every 5 seconds with it.
* `runScheduledTask` finds the task by its key in `ApiClient.getScheduledTasks()`, starts it with `ApiClient.startScheduledTask`, or a `POST` to `ScheduledTasks/Running/{id}` when the client has none, and resolves with the handle `pollTaskProgress` gives. It rejects, with the button untouched, when no task has the key or the start fails.
* It gives up after 30 minutes. The progress line is the on-accent color on a submit or destructive button, and the accent on a plain one.

## Gotchas

* The button needs a `span` for its label.
* `cancel` stops the polling, restores the label, and also runs `onComplete`.
* A plugin that still styles `.btn-progress` keeps working.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

| Class | What it looks like |
| :--- | :--- |
| `stolon-btn-progress-host` | Button that clips and anchors a progress bar along its bottom edge |
| `stolon-button.stolon-primary` | Progress fill on an accent or red button, in the text color of that fill so it stays visible |
| `stolon-button.stolon-small` | A small button never draws the bar, since it is too short, and shows a pie beside it instead |

<!-- reference:end -->

## Example

<iframe class="stolon-preview" src="../../../assets/previews/task-progress-button.html" title="Task Progress Button example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "task-progress-button.html"
```
