import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

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

test("e2e smoke: login -> signup -> onboarding finish -> dashboard -> hubs pages render", { timeout: 120_000 }, async () => {
  const child = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_E2E_TEST_MODE: "1",
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
    assert.match(signupHtml, /data-testid="e2e-open-onboarding"/);

    const finishHtml = await (await fetch(`${base}/onboarding/finish`)).text();
    assert.match(finishHtml, /data-testid="onboarding-finish-page"/);

    const dashboardHtml = await (await fetch(`${base}/dashboard`)).text();
    assert.match(dashboardHtml, /data-testid="dashboard-page"/);

    const hubsHtml = await (await fetch(`${base}/hubs`)).text();
    assert.match(hubsHtml, /data-testid="hubs-page"/);
  } finally {
    child.kill("SIGINT");
    await wait(600);
    if (!child.killed) child.kill("SIGKILL");
  }
});
