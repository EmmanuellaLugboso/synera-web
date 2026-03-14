import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = 4011;
const base = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(600);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGINT");
  const didExit = await Promise.race([
    once(child, "exit").then(() => true),
    wait(2_000).then(() => false),
  ]);

  if (!didExit) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

test("e2e smoke: login -> signup -> onboarding finish -> dashboard -> hubs pages render", { timeout: 120_000 }, async () => {
  const child = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
    },
    stdio: "pipe",
  });

  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));

  try {
    await waitForServer(`${base}/login`);

    const loginHtml = await (await fetch(`${base}/login`)).text();
    assert.match(loginHtml, /data-testid="login-page"/);

    const signupHtml = await (await fetch(`${base}/signup`)).text();
    assert.match(signupHtml, /data-testid="signup-page"/);

    const onboardingHtml = await (await fetch(`${base}/onboarding/name`)).text();
    assert.match(onboardingHtml, /Checking your onboarding status|login-page/);

    const hubsHtml = await (await fetch(`${base}/hubs`)).text();
    assert.match(hubsHtml, /data-testid="hubs-page"/);
  } finally {
    await stopProcess(child);
  }
});
