import { Node, Edge } from "@xyflow/react";

export interface FileNode extends Node {
  data: {
    label: string;
    filePath: string;
    imports: string[];
    handle?: FileSystemFileHandle;
  };
}

export interface FileEdge extends Edge {
  data?: {
    type: "import" | "export";
  };
}

export type ProjectComponent = {
  name: string;
  path: string; // Path of the file or directory
  type: "file" | "dir"; // Type of the item: "file" or "dir"
  raw_text?: string; // The raw text content for files
  ast?: any; //abstract syntax tree
  imports?: string[]; //paths of imported files
  contents?: ProjectComponent[]; // An array of contents (subdirectories or files) for directories
  id: string; //id of file
};
