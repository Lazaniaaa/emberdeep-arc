// Compiles contracts/EmberdeepHall.sol with solc 0.8.28 (Solady from node_modules).
// `npm run hall:compile` writes contracts/out/EmberdeepHall.json (ABI and bytecode, used by the deploy page) and
// contracts/out/EmberdeepHall.standard-input.json (paste into the explorer's "Standard JSON input" verification).
// The tests import compileHall() so they always test the source, not a stale artifact.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const solc = require("solc");
const root = new URL("../", import.meta.url);
const SOURCE = "contracts/EmberdeepHall.sol";

/** Settings the deployed bytecode is built with. Changing them changes the bytecode, so verification must match. */
export const SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  evmVersion: "cancun",
  outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
};

function readImport(path) {
  const file = path.startsWith("solady/") ? `node_modules/solady/src/${path.slice("solady/".length)}` : path;
  return readFileSync(fileURLToPath(new URL(file, root)), "utf8");
}

/** Every source the contract pulls in, keyed as solc sees it. */
function collectSources() {
  const sources = {};
  const visit = path => {
    if (sources[path]) return;
    const content = readImport(path);
    sources[path] = { content };
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
    for (const [, spec] of content.matchAll(/import\s+(?:\{[^}]*\}\s+from\s+)?"([^"]+)"/g)) {
      visit(spec.startsWith("./") || spec.startsWith("../") ? new URL(spec, `file:///${dir}`).pathname.slice(1) : spec);
    }
  };
  visit(SOURCE);
  return sources;
}

export function compileHall() {
  const input = { language: "Solidity", sources: collectSources(), settings: SETTINGS };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter(e => e.severity === "error");
  if (errors.length) throw new Error(errors.map(e => e.formattedMessage).join("\n"));
  const contract = output.contracts[SOURCE].EmberdeepHall;
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
    compiler: solc.version(),
    input,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = compileHall();
  const dir = fileURLToPath(new URL("contracts/out/", root));
  mkdirSync(dir, { recursive: true });
  const { input, ...artifact } = out;
  writeFileSync(`${dir}EmberdeepHall.json`, `${JSON.stringify({ contractName: "EmberdeepHall", ...artifact }, null, 2)}\n`);
  // The explorer wants the full output selection it would use itself; the sources and settings are what matter.
  writeFileSync(`${dir}EmberdeepHall.standard-input.json`, `${JSON.stringify(input, null, 2)}\n`);
  console.log(`Compiled with solc ${out.compiler}: ${(out.deployedBytecode.length - 2) / 2} bytes deployed. Wrote contracts/out/.`);
}
