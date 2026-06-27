# Geometric Model Workflow

This document explains the application-side workflow that connects user input to the geometric model and converts the model response into whiteboard shapes. It intentionally skips the chat window UI and Playwright debug setup.

## High-Level Flow

The model is treated as a shape-planning engine. The app converts the current board into a compact geometric DSL, sends that DSL plus the user's command to the model, then validates and applies only the new shapes.

```mermaid
flowchart TD
    A[User command] --> B[Read active board objects]
    B --> C[Convert board to DSL]
    C --> D[Build model prompt]
    D --> E[Run local model inference]
    E --> F[Parse model response]
    F --> G[Extract only new shape delta]
    G --> H[Dispatch generated shapes]
    H --> I[Board state updates]
```

## Input To Prompt

The input side starts with two pieces of information:

- The current board object list.
- The user's command, for example: `create a square below the circle`.

The board is serialized by `boardToDsl()` into compact tokens:

```text
sq(80,120,60) cr(120,260,42)
```

The model prompt is then built as:

```text
state: sq(80,120,60) cr(120,260,42) cmd: create a square below the circle
```

```mermaid
flowchart LR
    A[Board objects] --> B[boardObjectToDslToken]
    B --> C[boardToDsl]
    D[User command] --> E[Prompt builder]
    C --> E
    E --> F["state: ... cmd: ..."]
```

## DSL Shape Mapping

The DSL keeps the model contract small. The app maps supported board shapes to model-friendly token kinds.

```mermaid
flowchart TD
    A[Board object] --> B{Shape type}
    B -->|Rectangle or square| C["sq(x,y,size) or rect(x,y,size)"]
    B -->|Circle| D["cr(x,y,size)"]
    B -->|Triangle| E["tri(x,y,size)"]
    B -->|Line| F["line(x,y,size)"]
    B -->|Unsupported shape| G[Ignored for model context]
```

The parser reads model output with the same token grammar:

```text
sq(100,340,60)
cr(220,180,40)
tri(80,90,60)
```

## Model Response Processing

The model may return either:

- Absolute DSL tokens, such as `sq(100,340,60)`.
- A full board state that repeats existing shapes plus new shapes.
- Relative natural-language instructions, such as `square below circle`.

The app normalizes these through `diffGeneratedDslState()`.

```mermaid
flowchart TD
    A[Model response] --> B[Parse absolute DSL tokens]
    B --> C[Drop current-board prefix if response is full state]
    C --> D[Diff against existing board objects]
    D --> E{New absolute shapes found?}
    E -->|Yes| F[Use absolute generated delta]
    E -->|No| G[Parse relative shape instruction]
    G --> H[Anchor to matching existing board shape]
    H --> I[Create positioned DSL token]
    I --> J[Diff against existing board objects]
    F --> K[Generated shape delta]
    J --> K
```

## Relative Placement Handling

Relative placement is used when a command or response says things like:

- `square below circle`
- `circle right of rectangle`
- `triangle above square`
- `shape near circle`

The app extracts:

- The shape to create.
- The direction.
- The reference shape, when present.

Then it computes the new shape position from the reference object's bounds.

```mermaid
flowchart LR
    A["create a square below the circle"] --> B[Tokenize words]
    B --> C["shape = square"]
    B --> D["direction = below"]
    B --> E["reference = circle"]
    E --> F[Find latest matching circle on board]
    C --> G[Create relative DSL token]
    D --> G
    F --> G
    G --> H["sq(centerX, circleBottom + gap, size)"]
```

This lets explicit user intent override bad model coordinates. For example, if the model returns a square at the wrong absolute position but the user's command says `below the circle`, the app uses the command's relative placement intent first.

## Duplicate Prevention

The model often returns the full desired board state, not just the new objects. To avoid duplicating existing shapes, the app performs two checks:

1. If the generated token list starts with the same number of tokens as the current board context, that prefix is treated as existing context and removed.
2. The remaining generated objects are compared against existing board objects using a normalized geometric key.

```mermaid
flowchart TD
    A[Generated tokens] --> B{Longer than current DSL?}
    B -->|Yes| C[Remove current DSL prefix]
    B -->|No| D[Keep all generated tokens]
    C --> E[Convert tokens to board objects]
    D --> E
    E --> F[Build geometry keys]
    F --> G{Already exists?}
    G -->|Yes| H[Skip object]
    G -->|No| I[Keep as generated delta]
```

## Board Update

Only the final generated delta is sent to Redux through `applyGeneratedShapes()`.

```mermaid
sequenceDiagram
    participant Input as User Command
    participant DSL as DSL Services
    participant Model as Inference
    participant Delta as Delta Extractor
    participant Store as WhiteBoardStore

    Input->>DSL: Convert current board to DSL
    DSL->>Model: Send state + command prompt
    Model-->>Delta: Return generated DSL/text
    Delta->>Delta: Prefer explicit relative intent
    Delta->>Delta: Remove duplicates/current-state prefix
    Delta->>Store: applyGeneratedShapes(delta)
    Store-->>Store: Append only new shapes
```

## Key Files

- `v3/src/Services/GeometricModel/boardToDsl.ts`: Converts board objects into compact model context.
- `v3/src/Services/GeometricModel/dslParser.ts`: Parses absolute model DSL tokens.
- `v3/src/Services/GeometricModel/dslToBoard.ts`: Converts parsed DSL tokens into board objects.
- `v3/src/Services/GeometricModel/diffStates.ts`: Extracts new shapes, prevents duplicates, and handles relative placement.
- `v3/src/Components/ChatPanel/index.tsx`: Connects command submission to the model and dispatches generated shape deltas.

