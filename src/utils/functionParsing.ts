import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

export interface FunctionCall {
  name: string;
  caller: string | null;
  location: {
    line: number;
    column: number;
  };
  resolved: "local" | "imported" | "unknown";
  source?: string;
}

const builtIns = new Set([
  "console",
  "Math",
  "JSON",
  "Date",
  "Promise",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "window",
  "document",
  "globalThis",
  "Array",
  "Object",
  "Number",
  "String",
  "Boolean",
  "Symbol",
  "BigInt",
  "isNaN",
  "eval",
  "alert",
  "prompt",
  "fetch",
  "XMLHttpRequest",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "Headers",
  "Request",
  "Response",
  "WebSocket",
  "Worker",
  "MessageChannel",
  "MessagePort",
  "MessageEvent",
  "Notification",
  "dispatch",
  "useContext",
  "createContext",
  "createRoot",
  "document.getElementById",
  "useReducer",
  "parseFloat",
  "num.toString",
  "num.toExponential",
  "isFinite",
  "value.includes",
]);

function isBuiltIn(name: string): boolean {
  return builtIns.has(name);
}

export function analyzeCode(code: string): FunctionCall[] {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  const localFunctions = new Set<string>();
  const importedFunctions = new Map<string, string>();
  const functionCalls: FunctionCall[] = [];
  const seenCalls = new Set<string>(); // caller->callee to de-duplicate

  // First pass: gather defined and imported functions
  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.node.id?.name) {
        localFunctions.add(path.node.id.name);
      }
    },
    VariableDeclarator(path) {
      if (
        t.isIdentifier(path.node.id) &&
        (t.isArrowFunctionExpression(path.node.init) ||
          t.isFunctionExpression(path.node.init))
      ) {
        localFunctions.add(path.node.id.name);
      }
    },
    ImportDeclaration(path) {
      for (const specifier of path.node.specifiers) {
        if (
          t.isImportSpecifier(specifier) ||
          t.isImportDefaultSpecifier(specifier)
        ) {
          importedFunctions.set(specifier.local.name, path.node.source.value);
        }
      }
    },
  });

  // Traverse a function body with a known caller
  function traverseFunctionBody(fnPath: NodePath<t.Function>, caller: string) {
    fnPath.traverse({
      CallExpression(callPath) {
        const node = callPath.node;
        let name = "";

        if (t.isIdentifier(node.callee)) {
          name = node.callee.name;
        } else if (
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object) &&
          t.isIdentifier(node.callee.property)
        ) {
          name = `${node.callee.object.name}.${node.callee.property.name}`;
        }

        if (!name || isBuiltIn(name)) return;

        const key = `${caller}->${name}`;
        if (seenCalls.has(key)) return;
        seenCalls.add(key);

        const resolved: FunctionCall["resolved"] = localFunctions.has(name)
          ? "local"
          : importedFunctions.has(name)
          ? "imported"
          : "unknown";

        functionCalls.push({
          name,
          caller,
          location: {
            line: node.loc?.start.line ?? -1,
            column: node.loc?.start.column ?? -1,
          },
          resolved,
          source:
            resolved === "imported" ? importedFunctions.get(name) : undefined,
        });
      },
    });
  }

  // Second pass: traverse function bodies
  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name ?? "<anonymous>";
      traverseFunctionBody(path, name);
    },
    VariableDeclarator(path) {
      if (
        t.isIdentifier(path.node.id) &&
        (t.isFunctionExpression(path.node.init) ||
          t.isArrowFunctionExpression(path.node.init))
      ) {
        const name = path.node.id.name;
        const fnNode = path.get("init");
        if (fnNode && fnNode.isFunction()) {
          traverseFunctionBody(fnNode, name);
        }
      }
    },
    // We now IGNORE Program-level calls (caller === null)
  });

  return functionCalls;
}
