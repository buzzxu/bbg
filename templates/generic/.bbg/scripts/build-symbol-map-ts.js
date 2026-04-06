#!/usr/bin/env node

/**
 * build-symbol-map-ts.js - TypeScript/JavaScript symbol extractor.
 *
 * Uses the TypeScript Compiler API (available in any TS project) to parse
 * source files and extract exported classes, functions, interfaces, types,
 * and enums with their dependencies.
 *
 * Usage: node .bbg/scripts/build-symbol-map-ts.js [--root <dir>] [--tsconfig <path>]
 *
 * Output: .bbg/context/symbol-map.json (unified format)
 *
 * Zero extra dependencies - requires only the `typescript` package already
 * present in TypeScript projects.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.argv.includes("--root")
  ? process.argv[process.argv.indexOf("--root") + 1]
  : process.cwd();

const TSCONFIG = process.argv.includes("--tsconfig")
  ? process.argv[process.argv.indexOf("--tsconfig") + 1]
  : join(ROOT, "tsconfig.json");

const OUTPUT_DIR = join(ROOT, ".bbg", "context");
const OUTPUT_FILE = join(OUTPUT_DIR, "symbol-map.json");

async function main() {
  let ts;
  try {
    ts = await import("typescript");
    if (ts.default) ts = ts.default;
  } catch {
    console.error("TypeScript not found. Install typescript in your project.");
    process.exit(1);
  }

  const configFile = ts.readConfigFile(TSCONFIG, (path) => readFileSync(path, "utf-8"));
  if (configFile.error) {
    console.error(
      `Cannot read ${TSCONFIG}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`,
    );
    process.exit(1);
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const symbols = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const filePath = relative(ROOT, sourceFile.fileName);
    if (filePath.startsWith("node_modules")) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exports = checker.getExportsOfModule(moduleSymbol);
    for (const exp of exports) {
      const declarations = exp.getDeclarations();
      if (!declarations || declarations.length === 0) continue;
      const decl = declarations[0];
      const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());

      const kind = getSymbolKind(ts, decl);
      const modifiers = getModifiers(ts, decl);
      const dependencies = extractDependencies(ts, decl);

      symbols.push({
        name: exp.getName(),
        kind,
        file: filePath,
        line: line + 1,
        exported: true,
        modifiers,
        dependencies,
        dependents: [],
        signature: kind === "function" ? getSignature(ts, decl, checker) : null,
      });
    }
  }

  const nameToIndex = new Map();
  symbols.forEach((symbol, index) => nameToIndex.set(symbol.name, index));
  for (const symbol of symbols) {
    for (const dep of symbol.dependencies) {
      const idx = nameToIndex.get(dep);
      if (idx !== undefined && !symbols[idx].dependents.includes(symbol.name)) {
        symbols[idx].dependents.push(symbol.name);
      }
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    language: "typescript",
    extractor: "build-symbol-map-ts.js",
    symbols,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Symbol map: ${symbols.length} symbols extracted -> ${OUTPUT_FILE}`);
}

function getSymbolKind(ts, decl) {
  if (ts.isClassDeclaration(decl)) return "class";
  if (ts.isFunctionDeclaration(decl)) return "function";
  if (ts.isInterfaceDeclaration(decl)) return "interface";
  if (ts.isTypeAliasDeclaration(decl)) return "type";
  if (ts.isEnumDeclaration(decl)) return "enum";
  if (ts.isVariableDeclaration(decl)) return "variable";
  return "unknown";
}

function getModifiers(ts, decl) {
  const modifiers = ts.canHaveModifiers(decl) ? ts.getModifiers(decl) : undefined;
  if (!modifiers) return [];

  return modifiers
    .map((mod) => {
      if (mod.kind === ts.SyntaxKind.ExportKeyword) return "export";
      if (mod.kind === ts.SyntaxKind.DefaultKeyword) return "default";
      if (mod.kind === ts.SyntaxKind.AsyncKeyword) return "async";
      if (mod.kind === ts.SyntaxKind.AbstractKeyword) return "abstract";
      return null;
    })
    .filter((value) => value !== null);
}

function extractDependencies(ts, decl) {
  const deps = new Set();
  function visit(node) {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      deps.add(node.typeName.text);
    }
    if (ts.isIdentifier(node) && node.parent && ts.isHeritageClause(node.parent.parent)) {
      deps.add(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(decl);
  return [...deps];
}

function getSignature(ts, decl, checker) {
  if (!ts.isFunctionDeclaration(decl) || !decl.name) return null;
  const symbol = checker.getSymbolAtLocation(decl.name);
  if (!symbol) return null;
  const type = checker.getTypeOfSymbolAtLocation(symbol, decl);
  const signatures = type.getCallSignatures();
  if (signatures.length === 0) return null;
  return checker.signatureToString(signatures[0]);
}

main().catch((error) => {
  console.error(`Error extracting symbols: ${error.message}`);
  process.exit(1);
});
