# Grammar

This document describes **implemented** syntax only.

## Program

```text
program        := workspace_decl+
workspace_decl := 'workspace' IDENT '{' member* '}'
member         := asset_decl | telemetry_decl | rule_decl | test_decl
```

## Declarations

```text
asset_decl     := 'asset' IDENT IDENT '{' property* '}'
telemetry_decl := 'telemetry' IDENT '{' property* '}'
property       := IDENT '=' literal ';'

rule_decl := 'rule' IDENT '{'
               observe_stage?
               then_stage*
               require_clause*
               respond_block?
               rollback_block?
             '}'
# Semantic/parse rule: at most one observe, respond, and rollback each.

observe_stage := 'observe' IDENT 'where' expression ';'
then_stage    := 'then' IDENT 'where' expression 'within' DURATION ';'
require_clause := 'require' ('confidence' | 'sources') compare_op NUMBER ';'

respond_block := 'respond' '{' respond_stmt* '}'
respond_stmt  := isolate_stmt | preserve_stmt | revoke_sessions_stmt | disable_account_stmt | approval_stmt
isolate_stmt  := 'isolate' 'endpoint' IDENT ';'
preserve_stmt := 'preserve' 'evidence' ';'
revoke_sessions_stmt := 'revoke' 'sessions' 'user' IDENT ';'
disable_account_stmt := 'disable' 'account' IDENT ';'
approval_stmt := 'approval' 'required' 'for' IDENT ';'

rollback_block := 'rollback' '{' rollback_stmt* '}'
rollback_stmt  := reconnect_stmt | reenable_account_stmt
reconnect_stmt := 'reconnect' 'endpoint' IDENT ';'
reenable_account_stmt := 'reenable' 'account' IDENT ';'

test_decl := 'test' IDENT '{' expect_stmt* '}'
expect_stmt := 'expect' 'rule' IDENT expect_body ';'
expect_body := 'to_match'
            | 'to_not_match'
            | 'confidence' compare_op NUMBER
```

## Expressions

```text
expression  := or_expr
or_expr     := and_expr ('or' and_expr)*
and_expr    := unary_expr ('and' unary_expr)*
unary_expr  := 'not' unary_expr | comparison
comparison  := primary (compare_op primary)?
primary     := '(' expression ')' | literal | property_path
property_path := IDENT ('.' IDENT)*
literal     := STRING | NUMBER | BOOLEAN | DURATION
compare_op  := '==' | '!=' | '>' | '>=' | '<' | '<='
```

## Literals

- Strings: `"text"`
- Numbers: `2`, `0.80`
- Booleans: `true`, `false`
- Durations: `30s`, `5m`, `1h` (whole numbers only)

## Not implemented

- Protected-resource declarations
- Live stream subscriptions
- Vendor-specific action adapters
- Function-call response syntax beyond the statements above
- Complex type annotations
- Typed telemetry / event payload schemas (property paths such as `file.extension` are not schema-validated yet)
- Imports/modules across files — Bitpall is currently a single compilation unit; modular rule packs are future work
- Macros or templates
