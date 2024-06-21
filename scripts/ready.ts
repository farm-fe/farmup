import { execa } from 'execa';

console.log('Cspell');
await execa('npx', ['cspell', './', '--gitignore']);

console.log('biome lint');
await execa('npx', ['biome', 'lint', './packages']);
