/** Run dependent development services as one unit; a failed child stops its peers. */
export function supervise(children, { onStop, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let stopping = false;
  let remaining = children.length;
  let exitCode = 0;
  let timer;

  function finish() {
    if (remaining !== 0) return;
    if (timer) clearTimer(timer);
    onStop(exitCode);
  }

  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    }
    if (remaining > 0) {
      timer = setTimer(() => {
        for (const child of children) {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }
      }, 5_000);
      timer.unref?.();
    }
    finish();
  }

  for (const child of children) {
    child.once("error", () => stop(1));
    child.once("close", (code) => {
      remaining -= 1;
      // Even a clean, unexpected exit leaves an incomplete dev environment.
      if (!stopping) stop(code !== null && code > 0 ? code : 1);
      else finish();
    });
  }
  if (children.length === 0) onStop(0);
  return { stop };
}
