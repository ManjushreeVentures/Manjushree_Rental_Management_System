import { execSync } from 'child_process';

try {
  const result = execSync('node --check c:\\Users\\manoj.c\\Desktop\\Rental\\backend\\src\\controllers\\invoice.controller.js', { encoding: 'utf8' });
  console.log("Syntax is OK.");
} catch (e) {
  console.log("Syntax Error:\n" + e.stderr);
}
