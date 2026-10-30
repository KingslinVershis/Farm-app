---
name: always-quality-development
description: Use whenever implementing, modifying, reviewing, or optimizing application features, UI, responsive layouts, translations, or code. Enforce responsive design, complete existing i18n integration, and efficient production-quality implementation by default.
---

# Always-Quality Development

## Purpose

Implement every requested change using responsive, maintainable, optimized code while preserving the existing application architecture, design, functionality, and conventions.

Apply these standards automatically to every relevant task without requiring the user to repeat them.

## 1. Responsive UI — Mandatory

- Make every new or modified UI responsive across mobile, tablet, laptop, and desktop.
- Inspect existing breakpoints, layout conventions, components, and styling before making changes.
- Use the project's existing responsive framework and styling approach, such as Tailwind CSS, CSS media queries, or its current component library.
- Use flexible layouts, appropriate breakpoints, responsive spacing, and fluid sizing where suitable.
- Prevent horizontal overflow, clipped content, overlapping elements, and unusable navigation or forms.
- Ensure buttons, inputs, dialogs, tables, cards, and navigation remain usable on small screens.
- Preserve the existing design system, visual consistency, and accessibility.
- Do not introduce arbitrary breakpoints or a new styling library when existing conventions are sufficient.
- Check relevant screen sizes and interactions after implementing UI changes.

## 2. Complete Multilingual Support — Mandatory

- Inspect the existing internationalization (i18n) configuration, supported locales, translation files, and translation conventions before changing user-facing text.
- Reuse the existing translation library and patterns. Do not introduce a second i18n system.
- Never hardcode new user-facing strings directly into components when the application uses translations.
- For every new or modified user-facing string, add or update the corresponding translation key in EVERY supported language file.
- Keep translation keys consistent across locales and preserve the existing namespace and file structure.
- Translate page titles, headings, buttons, labels, placeholders, validation messages, errors, notifications, empty states, tooltips, accessibility labels, and other user-visible text.
- Preserve interpolation variables, pluralization rules, formatting, and dynamic values across all locales.
- Use the project's established translation fallback when appropriate, but do not treat fallback behavior as a substitute for completing translations.
- Do not invent unsupported locales or silently remove existing translations.
- If the project has no i18n system, identify this first and propose or implement a suitable approach consistent with the requested scope.
- Verify that all supported locale files contain the required keys and that the application uses the translated values correctly.

## 3. Code Optimization and Quality — Mandatory

- Inspect the relevant existing code and project structure before implementing a change.
- Understand the requested behavior and reuse existing components, utilities, hooks, services, and types where appropriate.
- Prefer the simplest correct solution that satisfies the requirements.
- Avoid unnecessary abstractions, duplicated logic, excessive nesting, redundant state, repeated API calls, and avoidable re-renders.
- Use appropriate TypeScript types and safe error handling when applicable.
- Follow existing architecture, naming conventions, formatting, and dependency choices.
- Consider performance, accessibility, security, maintainability, and edge cases relevant to the change.
- Avoid unnecessary dependencies, speculative features, unrelated refactoring, and large rewrites.
- Do not sacrifice readability, correctness, security, or maintainability for fewer lines of code.
- Do not optimize code prematurely when there is no meaningful benefit.
- Preserve existing functionality and backward compatibility unless the request explicitly requires a change.

## 4. Token and Context Efficiency

- Use the minimum context, tool calls, and output tokens reasonably necessary to complete the task correctly.
- Inspect only the relevant files first; expand the investigation when dependencies or errors require it.
- Avoid rereading unchanged files, repeating explanations, and generating boilerplate unnecessarily.
- Make focused changes rather than rewriting entire files when a smaller patch is sufficient.
- Reuse established project patterns instead of repeatedly designing new solutions.
- Provide concise explanations and summaries. Show detailed reasoning or extensive code only when needed.
- Never omit essential implementation, translations, validation, or testing merely to reduce token usage.
- Do not claim to have run tests, checked responsiveness, or verified translations unless those checks were actually performed.

## 5. Implementation Workflow

For every relevant task:

1. Inspect the relevant files, project conventions, dependencies, and existing implementation.
2. Identify the smallest complete solution and its affected files.
3. Implement the requested feature using the existing architecture.
4. Apply responsive design to all affected UI elements.
5. Update every supported locale file for all new or modified user-facing text.
6. Check types, validation, errors, accessibility, and edge cases relevant to the change.
7. Run appropriate targeted checks or tests when available.
8. Fix issues discovered during verification.
9. Summarize the implementation, affected files, and verification results concisely.
10. Explicitly mention any checks that could not be completed or any remaining limitations.

## 6. Scope and Safety

- Focus on the user's requested task and necessary supporting changes.
- Do not modify unrelated features, configuration, or dependencies without justification.
- Never overwrite user changes or expose secrets.
- Ask for clarification only when a missing requirement materially affects the implementation.
- If a requirement conflicts with existing architecture or cannot be completed safely, explain the limitation and provide the best justified alternative.

## Definition of Done

A relevant feature is complete only when:

- Its requested functionality works.
- Its affected UI is responsive across relevant screen sizes.
- Every supported locale has the required translation keys and appropriate translations.
- The implementation follows existing conventions and avoids unnecessary complexity.
- Relevant checks have been performed and their actual results are reported.
