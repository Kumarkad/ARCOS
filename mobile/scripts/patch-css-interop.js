const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'render-component.js'
);

if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  if (content.includes('console.log(`CssInterop upgrade warning')) {
    content = content.replace(
      /function printUpgradeWarning\(warning, originalProps\) \{[\s\S]*?function stringify\(object\) \{[\s\S]*?return newValue;\s*\}, 2\);\s*\}/,
      `function printUpgradeWarning(warning, originalProps) {
    try {
        console.warn(\`CssInterop upgrade warning: \${warning}\`);
    } catch {
        // ignore
    }
}
function stringify(object) {
    return "[Props]";
}`
    );
    fs.writeFileSync(target, content, 'utf8');
    console.log('[patch] Patched react-native-css-interop successfully');
  } else {
    console.log('[patch] react-native-css-interop already patched or up-to-date');
  }
}
