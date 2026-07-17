1. Move the map control buttons to the event bus — and do it all in one go

Right now the zoom in, zoom out, reset camera, and center‑on‑champion buttons are wired up directly in a file called gameUIBindings.js. We’re going to switch them to use the app’s central event bus (a message system that lets different parts of the app talk without knowing about each other). Because we’ll delete gameUIBindings.js at the same time, this must happen atomically — meaning all these changes land together in the same commit so nothing breaks in between.

What you need to do:

    Register four new actions on the event bus:
    The actions are named zoomIn, zoomOut, resetCamera, and centerChampion.
    Each action handler will do the following:

        Call getSceneContext() to grab the current game scene.

        Add a null guard — if the scene doesn’t exist (e.g., we’re not in a game yet), just bail out safely.

        Use the existing helper functions:

            For zoom in/out: call zoomCamera.

            For reset: call resetCamera.

            For center champion: call centerCameraOnHex.

        After adjusting the camera, call refreshZoomDisplay to update any zoom level UI.

        Delete the old hardcoded 1.0 math that was used in the old bindings — the handler should rely on the proper methods instead of raw constants.

    Update the HTML buttons to talk to the bus:
    In index.html, find the four buttons (zoom in, zoom out, reset view, center champion) and add the matching data-action attributes. For example:
    data-action="zoomIn" on the zoom‑in button.
    This lets the bus listener pick them up automatically.

    Delete the old bindings file and its import — at the same time:

        Delete the entire file gameUIBindings.js. This removes the old manual button bindings, the keyboard shortcuts (the c, r, +, - keydown listener), and the dead #logMount chevron that’s no longer used.

        In beginGame.js, go to line 30 (or wherever gameUIBindings.js is imported/invoked) and remove that import or call.

        Double‑check: search the whole project for any other file that imports gameUIBindings.js. If you find none (which should be the case), you’re safe.

2. Relocate the endTurn and inspect registrations

    Copy the registration lines that wire up endTurn and inspect from gameUIBindings.js into bootstrapUI.js.

    Place them inside the bootstrapping function (or module scope) where other UI action handlers are set up, so they run at the right time.

3. Fix the victory button and remove a dead HTML element

    In index.html, locate the victory button and change its behaviour to use the bus: give it the attribute data-action="restartToSetup".

    In bootstrapUI.js, register the restartToSetup action. The handler should simply do location.reload() — this reloads the page and effectively restarts the whole setup flow.

    While you’re in index.html, delete the #tooltip div. It’s no longer used anywhere (this cleanup goes together with an earlier step labelled “6.5.5”).

4. Purge leftover global variables from window

Over time, some global properties were attached to window that are now dead weight. We’ll remove them, but only after verifying nothing references them anymore.

What you need to do:

    In entrypoint.js, find and delete the lines that set window.restartToSetup and window.__SUPERNAL__.
    Before deleting, use grep (or your editor’s search) to confirm zero consumers — nothing in the entire codebase reads them.

    Note that window.commitCombat and window.closeReward were already removed in earlier steps (7a and 7c). You don’t need to touch them again.

    Similarly, the window aliases for the heptagram and mapView have already been taken care of in steps 6.5.5 and 6.5.6.

    Do not delete window.__beginGame and window.__gameState — they are still in use and must stay.

5. Stop event listeners from piling up (add a “wired” guard)

If a function that attaches event listeners gets called more than once (e.g., every time a game begins), you can accidentally stack duplicate listeners and cause weird behaviour. We’ll add a simple guard to prevent this.

What you need to do:

    Open bindHeader.js. At the very top of the module (outside any function), add a flag: let wired = false;.

    Inside the bindHeaderEvents function, add this check right at the start:
    text

    if (wired) return;
    wired = true;

    Now if bindHeaderEvents is called a second time, it immediately exits without doing anything — no duplicate listeners.

    Finally, look through the rest of the code for any other binding functions that could be called once per game begin. Apply the same pattern to those: a module‑level flag that prevents a second setup.