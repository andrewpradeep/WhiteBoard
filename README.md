# WhiteBoard

Live app: [CreamBoard](https://creamboard.netlify.app/)

## Project Summary

CreamBoard is a browser-based collaborative-style whiteboard application built to demonstrate product-focused frontend engineering. The app supports multiple workspaces, multiple boards per workspace, freehand drawing, shapes, arrows, text editing, element selection, erasing, resizing, local persistence, and export to PDF or PNG.

The project highlights the ability to turn an interactive product idea into a polished, recruiter-friendly web app with thoughtful UX, structured state management, and practical browser APIs.

## Tech Stack

- React, TypeScript, and Vite for a fast, typed frontend application.
- Redux Toolkit and React Redux for predictable state-machine style updates across tools, boards, workspaces, and canvas interactions.
- HTML Canvas API for drawing, hit testing, resizing, selection, erasing, and export rendering.
- IndexedDB for client-side persistence of workspaces, boards, and whiteboard elements.
- jsPDF for PDF export, plus Canvas image generation for PNG export.
- ESLint and TypeScript for code quality and maintainability.

## Skills Demonstrated

- Frontend architecture with reusable components, custom hooks, and typed domain contracts.
- Complex UI state management for drawing modes, selection, dragging, resizing, text editing, and exports.
- Browser API integration using Canvas, IndexedDB, keyboard events, pointer events, and file downloads.
- Product-oriented UX design for workspace management, board switching, toolbars, modals, dropdowns, and export flows.
- Performance-conscious persistence with durable local storage and limits for board and element data.
- Iterative feature development across a deprecated `v1` and active `v2` codebase.

This repository is split into versioned app folders:

- `v1`: deprecated snapshot of the original whiteboard.
- `v2`: active whiteboard app with multi-board support, state-machine style updates, repaired text editing, and grid-free PDF export.

Run the active `v2` app from the repository root:

```sh
npm install --legacy-peer-deps
npm run dev
```
