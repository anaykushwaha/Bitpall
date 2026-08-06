# Architecture

AegisScript uses a staged compiler pipeline with strict package boundaries.

```text
source
  ↓
lexer
  ↓
parser
  ↓
AST
  ↓
checker
  ↓
interpreter
  ↓
runtime
  ↓
audit output
```

## Dependency direction

Lower-level packages must not import higher-level packages.

| Package            | May depend on                             |
| ------------------ | ----------------------------------------- |
| `ast`              | nothing in the compiler graph             |
| `lexer`            | `ast`                                     |
| `parser`           | `ast`, `lexer`                            |
| `checker`          | `ast`                                     |
| `runtime`          | `ast`                                     |
| `interpreter`      | `ast`, `runtime`                          |
| `language-service` | `ast`, `parser`, `checker`                |
| `playground`       | language-service and interpreter packages |

## Product naming

Product constants such as `PRODUCT_NAME` live in `@aegisscript/ast` so a rename does not require rewriting every package.

## Safety boundary

The interpreter proposes actions. Only `MockResponseExecutor` records them. No package in this repository isolates hosts or terminates processes on real systems.
