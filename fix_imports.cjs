const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}
const files = walk('./src');
const regex = /(import\s+.*?from\s+[\"'])(.*?)(@[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[a-zA-Z0-9.]+)?)([\"'])/g;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (regex.test(content)) {
        const newContent = content.replace(regex, '$1$2$4');
        fs.writeFileSync(f, newContent);
        console.log('Updated', f);
    }
});
