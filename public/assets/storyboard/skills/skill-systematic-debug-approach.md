# Systematic Debug & Implementation Approach

## Core Principle
Before coding, think like a UX designer + top programmer + co-creator.
For persistent bugs: examine from multiple angles. Never guess — trace the root cause.
After each task: verify it compiles, verify it matches requirements, then move to next.

## Steps
1. Parse ALL user requests into discrete, numbered tasks
2. Order by dependency (bugs first, then features)
3. For each task:
   - Understand the root cause or design goal
   - Plan the fix/implementation
   - Code it
   - TypeScript check
   - Verify against original requirement
4. Only move to next task after current passes all checks
5. For persistent bugs (failed twice+):
   - List ALL possible causes
   - Check each one systematically
   - Look at the actual runtime behavior, not just code logic
   - Consider: wrong file path? async timing? library version? browser API mismatch?

## Anti-Patterns to Avoid
- Don't guess at fixes — trace the actual error
- Don't replace large blocks when small targeted edits work
- Don't leave duplicate code after edits
- Don't skip TypeScript checks between tasks
