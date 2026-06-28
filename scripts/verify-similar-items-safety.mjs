import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const sourcePath = join(process.cwd(), "lib/classification/similar-items.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const commonJsModule = { exports: {} };
const fn = new Function("module", "exports", compiled.outputText);
fn(commonJsModule, commonJsModule.exports);

const { getSimilarItemMatch } = commonJsModule.exports;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSimilar(left, right, message) {
  const result = getSimilarItemMatch(left, right);
  assert(result.isSimilar, `${message}: expected similar, got ${JSON.stringify(result)}`);
  return result;
}

function assertNotSimilar(left, right, message) {
  const result = getSimilarItemMatch(left, right);
  assert(!result.isSimilar, `${message}: expected not similar, got ${JSON.stringify(result)}`);
  return result;
}

const vrvVsFanCoil = assertNotSimilar(
  "VRV outdoor unit cooling block 16kW",
  "Fan Coil unit 16kW",
  "VRV outdoor unit must not be similar to Fan Coil",
);
const exactFanCoil = assertSimilar(
  "Fan Coil 2.5kW",
  "fan-coil 2.5 kW",
  "Same fan coil text should be similar",
);
const differentCapacity = assertNotSimilar(
  "Fan Coil 2.5kW",
  "Fan Coil 5.0kW",
  "Different fan coil capacities should not auto-merge",
);
const weakSharedWords = assertNotSimilar(
  "Cooling unit block",
  "Fan unit block",
  "Weak shared words should not create a similar item candidate",
);

console.log(
  JSON.stringify(
    {
      differentCapacity,
      exactFanCoil,
      vrvVsFanCoil,
      weakSharedWords,
    },
    null,
    2,
  ),
);
