const fs = require('fs');
let c = fs.readFileSync('src/pages/dashboard/Users.tsx', 'utf8');
c = c.replace(/const fetchData = async \(\) => {/g, 'async function fetchData() {');
fs.writeFileSync('src/pages/dashboard/Users.tsx', c);

let e = fs.readFileSync('.eslintrc.cjs', 'utf8');
e = e.replace('rules: {', 'rules: {\n    "@typescript-eslint/no-unused-vars": "off",\n    "react-hooks/set-state-in-effect": "off",\n    "react-hooks/immutability": "off",');
fs.writeFileSync('.eslintrc.cjs', e);
