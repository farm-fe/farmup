import fs from 'node:fs';
import { foo } from './hello';

// console.log({ fs });

console.log('test farmup');

function foo1() {
    console.log(123);
}

foo1();

console.log({ readFile: fs.readFile }, { foo });
