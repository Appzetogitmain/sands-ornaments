const fs = require('fs');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace lazy imports
    content = content.replace(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\((['"].+?['"])\)\);/g, 'import $1 from $2;');

    // 2. Remove Suspense and LazySection wrappers
    content = content.replace(/<Suspense[^>]*>/g, '');
    content = content.replace(/<\/Suspense>/g, '');
    content = content.replace(/<LazySection[^>]*>/g, '');
    content = content.replace(/<\/LazySection>/g, '');

    // 3. Remove SectionShell wrappers (Home.jsx specific)
    content = content.replace(/<SectionShell>/g, '');
    content = content.replace(/<\/SectionShell>/g, '');
    // Remove SectionShell definition
    content = content.replace(/const SectionFallback = \(\) => \([\s\S]*?\);/, '');
    content = content.replace(/const SectionShell = \(\{ children \}\) => \([\s\S]*?\);/, '');

    // 4. Clean up imports
    content = content.replace(/,\s*lazy\b/g, '');
    content = content.replace(/,\s*Suspense\b/g, '');
    content = content.replace(/import LazySection.*\n/g, '');

    fs.writeFileSync(filePath, content);
}

processFile('frontend/src/modules/user/pages/ShopForMen.jsx');
processFile('frontend/src/modules/user/pages/ShopForWomen.jsx');
processFile('frontend/src/modules/user/pages/Home.jsx');

console.log('Lazy loading removed from sections.');
