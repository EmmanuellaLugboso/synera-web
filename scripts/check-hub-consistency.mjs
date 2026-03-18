import fs from 'node:fs';

const hubPages = [
  'app/hubs/fitness/page.js',
  'app/hubs/nutrition/page.js',
  'app/hubs/mind-sleep/page.js',
  'app/hubs/lifestyle/page.js',
  'app/hubs/profile/page.js',
];

const cssFiles = [
  'app/hubs/fitness/fitness.css',
  'app/hubs/nutrition/nutrition.css',
  'app/hubs/mind-sleep/mind-sleep.css',
  'app/hubs/profile/profile.css',
  'app/hubs/hub.css',
  'app/components/hub/hub-shell.css',
];

let failed = false;

for (const file of hubPages) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('components/hub/HubShell')) {
    failed = true;
    process.stderr.write(`[hub-consistency] ${file} must import HubShell.\n`);
  }
}

for (const file of cssFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (/^\s*body\s*\{[\s\S]*?background\s*:/m.test(src)) {
    failed = true;
    process.stderr.write(`[hub-consistency] ${file} overrides body background; move to HubShell.\n`);
  }
}

if (failed) {
  process.exit(1);
}

