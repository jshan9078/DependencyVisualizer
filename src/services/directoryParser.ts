import { Octokit } from "octokit";
import { v4 as uuidv4 } from "uuid";
import * as babelParser from "@babel/parser";
import { analyzeCode, FunctionCall } from "@/utils/functionParsing";

// New type definition for directory structure
type ProjectComponent = {
  name: string;
  path: string; // Path of the file or directory
  type: "file" | "dir"; // Type of the item: "file" or "dir"
  raw_text?: string; // The raw text content for files
  ast?: any; //abstract syntax tree
  imports?: string[]; //uuids of other files
  contents?: ProjectComponent[]; // An array of contents (subdirectories or files) for directories
  id: string; //id of file
};

function extractProgramType(fileName: string): string {
  // Extract the file extension
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  return fileExtension ?? "";
}

const blacklistedFiles = new Set([
  "package.json",
  "package-lock.json",
  "README.md",
  "LICENSE",
  "vite.config.ts",
  "vite.config.js",
  "tsconfig.json",
  "webpack.config.js",
  "yarn.lock",
  ".gitignore",
  ".eslintrc.cjs",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  "config.json",
  "tsconfig.app.json",
  "index.html",
  "vite-env.d.ts",
  "prompt",
  "jest.config.js",
  "babel.config.js",
  "jest.config.ts",
  "jest.config.json",
  "jest.setup.ts",
  "jest.setup.js",
  "jest.setup.json",
  "jest.setup.babel.js",
  "jest.setup.babel.ts",
  "jest.setup.babel.json",
  "tsconfig.node.json",
  "postcss.config.js",
  "tailwind.config.js",
  "tailwind.config.ts",
  "eslint.config.js",
]);

const blacklistedDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".bolt",
]);

// Function to fetch file contents given a file URL (download_url)
async function fetchFileContent(downloadUrl: string) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file content from: ${downloadUrl}`);
  }
  const result = await response.text();
  return result;
}

let functionCalls: FunctionCall[] = [];

// Recursive function to process each directory and file in the repo
async function scanDirectoryContents(
  path: string,
  user: string,
  repo: string,
  octokit: any,
  setCurrentlyParsing: any
): Promise<ProjectComponent[]> {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: user,
      repo: repo,
      path: path,
    }
  );

  // Ensure response.data is treated as an array
  const items: ProjectComponent[] = [];
  const contents = Array.isArray(response.data)
    ? response.data
    : [response.data];

  for (const item of contents) {
    if (blacklistedFiles.has(item.name) || blacklistedDirs.has(item.name)) {
      continue; // Skip this file or directory
    }

    if (item.type === "file") {
      setCurrentlyParsing(item.name);

      let rawText = undefined;
      let ast = null;
      if (
        extractProgramType(item.name) == "js" ||
        extractProgramType(item.name) == "jsx" ||
        extractProgramType(item.name) == "ts" ||
        extractProgramType(item.name) == "tsx"
      ) {
        rawText = await fetchFileContent(item.download_url!);
        ast = babelParser.parse(rawText, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        }).program.body;

        const funcCalls: FunctionCall[] = analyzeCode(rawText);
        functionCalls = [...functionCalls, ...funcCalls];
      }
      items.push({
        name: item.name,
        ast,
        path: item.path,
        type: "file",
        raw_text: rawText,
        id: uuidv4(),
      });
    } else if (item.type === "dir") {
      // For directories, scan recursively and include the contents
      const subdirectoryContents = await scanDirectoryContents(
        item.path,
        user,
        repo,
        octokit,
        setCurrentlyParsing
      );
      items.push({
        name: item.name,
        path: item.path,
        type: "dir",
        contents: subdirectoryContents, // Add subdirectories and files as contents
        id: uuidv4(),
      });
    }
  }
  return items;
}

export async function parseGithubRepo(
  repoUrl: string,
  setCurrentlyParsing: any
): Promise<[ProjectComponent[], FunctionCall[]]> {
  const { user, repo, path } = extractGitHubDetails(repoUrl);
  const octokit = new Octokit({
    auth: import.meta.env.VITE_GITHUB_TOKEN,
  });

  // Start scanning the repository from the root path
  const allFilesAndDirectories = await scanDirectoryContents(
    path,
    user,
    repo,
    octokit,
    setCurrentlyParsing
  );

  const parsedImports = processImports(allFilesAndDirectories);
  setCurrentlyParsing("Parsing Complete");
  const copyOfFunctionCalls = functionCalls;
  functionCalls = [];
  return [parsedImports, copyOfFunctionCalls];
}

// Add new function to validate GitHub URLs
export function isValidGithubUrl(url: string): boolean {
  const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(.*?)(\/)?$/;
  return regex.test(url);
}

function extractGitHubDetails(url: string) {
  const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(.*?)(\/)?$/;
  const match = url.match(regex);

  if (match) {
    const user = match[1];
    const repo = match[2];
    const path = match[3] || ""; // If path is empty, default to an empty string

    return { user, repo, path };
  } else {
    throw new Error("Invalid GitHub URL format");
  }
}

function resolveImportPath(
  importPath: string,
  currentFilePath: string
): string {
  // Remove any leading './' or '../'
  const normalizedImportPath = importPath.replace(/^\.\//, "");

  // Get the directory of the current file
  const currentDir = currentFilePath.split("/").slice(0, -1).join("/");
  if (importPath.startsWith("../")) {
    // Handle parent directory references
    const levels = importPath.match(/\.\.\//g)?.length || 0;
    const remainingPath = importPath.replace(/\.\.\//g, "");
    const newPath = currentDir
      .split("/")
      .slice(0, -levels)
      .concat(remainingPath)
      .join("/");
    return newPath;
  }
  // Join the current directory with the import path
  return currentDir
    ? `${currentDir}/${normalizedImportPath}`
    : normalizedImportPath;
}

function findFileByPath(
  components: ProjectComponent[],
  targetPath: string
): ProjectComponent | null {
  for (const component of components) {
    // Check if this is the file we're looking for
    if (component.type === "file") {
      // Remove file extension for comparison
      const targetPathNoExt = targetPath.replace(/\.(js|jsx|ts|tsx)$/, "");
      const componentPathNoExt = component.path.replace(
        /\.(js|jsx|ts|tsx)$/,
        ""
      );

      if (componentPathNoExt === targetPathNoExt) {
        return component;
      }
    }

    // If it's a directory, search its contents recursively
    if (component.type === "dir" && component.contents) {
      const found = findFileByPath(component.contents, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function processImports(allFiles: ProjectComponent[]): ProjectComponent[] {
  // Helper function to process a single file's AST
  function processFileAst(file: ProjectComponent) {
    if (!file.ast) return;

    // Initialize imports array if it doesn't exist
    if (!file.imports) {
      file.imports = [];
    }

    // Iterate through AST nodes
    for (const node of file.ast) {
      if (node.type === "ImportDeclaration" && node.source?.value) {
        const importPath = node.source.value;

        // Skip external package imports
        if (!importPath.startsWith(".")) continue;

        // Resolve the full path of the import
        const resolvedPath = resolveImportPath(importPath, file.path);

        // Find the corresponding file in our project structure
        const importedFile = findFileByPath(allFiles, resolvedPath);

        // If we found the file, add its ID to the imports array
        if (importedFile) {
          file.imports.push(importedFile.path);
        }
      }
    }
  }

  // Process each file in the project structure
  function processComponent(component: ProjectComponent) {
    if (component.type === "file") {
      processFileAst(component);
    } else if (component.type === "dir" && component.contents) {
      component.contents.forEach(processComponent);
    }
  }

  // Create a deep copy to avoid mutating the original
  const processedFiles = JSON.parse(JSON.stringify(allFiles));
  processedFiles.forEach(processComponent);
  return processedFiles;
}
