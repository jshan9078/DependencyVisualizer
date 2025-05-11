// app.ts
import { add, subtract } from "./utils/mathUtils";
import { capitalize, reverse } from "./utils/stringUtils";

const resultAdd = add(5, 3);
const resultSubtract = subtract(10, 4);
const resultCapitalize = capitalize("hello");
const resultReverse = reverse("world");

console.log(`Addition Result: ${resultAdd}`);
console.log(`Subtraction Result: ${resultSubtract}`);
console.log(`Capitalized String: ${resultCapitalize}`);
console.log(`Reversed String: ${resultReverse}`);
