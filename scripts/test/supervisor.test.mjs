import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { supervise } from "../lib/supervisor.mjs";

function child() {
  const instance = new EventEmitter();
  instance.exitCode = null;
  instance.signalCode = null;
  instance.signals = [];
  instance.kill = (signal) => instance.signals.push(signal);
  instance.close = (code, signal = null) => {
    instance.exitCode = code;
    instance.signalCode = signal;
    instance.emit("close", code, signal);
  };
  return instance;
}

test("failed child terminates peers and preserves failure exit status", () => {
  const one = child();
  const two = child();
  const results = [];
  supervise([one, two], { onStop: (code) => results.push(code) });
  one.close(2);
  assert.deepEqual(two.signals, ["SIGTERM"]);
  assert.deepEqual(results, []);
  two.close(null, "SIGTERM");
  assert.deepEqual(results, [2]);
});

test("Ctrl-C is idempotent and waits for every service", () => {
  const one = child();
  const two = child();
  const results = [];
  const supervisor = supervise([one, two], { onStop: (code) => results.push(code) });
  supervisor.stop();
  supervisor.stop();
  assert.deepEqual(one.signals, ["SIGTERM"]);
  one.close(0);
  assert.deepEqual(results, []);
  two.close(0);
  assert.deepEqual(results, [0]);
});

test("spawn failure stops surviving services", () => {
  const one = child();
  const two = child();
  const results = [];
  supervise([one, two], { onStop: (code) => results.push(code) });
  one.emit("error", new Error("executable unavailable"));
  one.close(-1);
  two.close(0);
  assert.deepEqual(results, [1]);
});

test("unresponsive service gets SIGKILL after shutdown grace period", () => {
  const one = child();
  let timeout;
  let cleared = false;
  const supervisor = supervise([one], {
    onStop: () => {},
    setTimer: (callback) => {
      timeout = callback;
      return {};
    },
    clearTimer: () => {
      cleared = true;
    },
  });
  supervisor.stop();
  timeout();
  assert.deepEqual(one.signals, ["SIGTERM", "SIGKILL"]);
  one.close(null, "SIGKILL");
  assert.equal(cleared, true);
});
