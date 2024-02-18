# Testing Interactive WASM execution

Goal: Wait for interactive input from the user and then proceed with the WASM execution.

Async/await doesn't work as expected in host functions imported by the WASM module running in the browser WASM runtime. The browser WASM runtime is synchronous only for now. To get around this limitation, we use web workers to get a separate thread where we can do a blocking wait without affecting the UI.

## Steps

1. The wasm module running in the worker thread calls a host function.
2. The host function also runs in the worker thread. It uses `postMessage` to ask the main thread to do the interaction with the user.
3. The host function running in the worker thread then does a blocking wait with `Atomics.wait`.
4. The main thread handles the user interaction.
5. The main thread puts the result of the user interaction in a `SharedArrayBuffer`.
6. The main thread then calls `Atomics.notify` to wake up the worker thread.
7. The worker thread reads the result of the user interaction from the `SharedArrayBuffer`.
8. The host function running in the worker thread returns with the result.

## Limitations

Only works in secure contexts that have the right CORS headers to isolate the origin.

```javascript
res.set('Cross-Origin-Opener-Policy', 'same-origin');
res.set('Cross-Origin-Embedder-Policy', 'require-corp');
```
