# File Dependency Graph Visualizer

This project is a React application that visualizes file dependencies in a project directory using react-flow. It allows you to:

1. View file dependencies as a graph
2. Add new dependent files by clicking on existing nodes
3. Visualize import/export relationships between files

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

## Usage

1. The application will display your project's files as nodes in a graph
2. Click on any node to select it
3. When a node is selected, a button will appear at the bottom of the screen
4. Click the button to add a new file that depends on the selected file
5. The new file will be automatically connected to the selected file with an import relationship

## Technologies Used

- React
- TypeScript
- @xyflow/react (React Flow)
- Vite
- Tailwind CSS
- Radix UI

## Project Structure

- `src/App.tsx`: Main application component
- `src/types.ts`: TypeScript interfaces for nodes and edges
- `src/utils/fileParser.ts`: Utility functions for parsing project files
- `src/index.css`: Global styles and React Flow customization
