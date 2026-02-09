# Repomix Analysis

> Analysis of https://github.com/yamadashy/repomix for matching output format in AgentFoundry.

## 1. Core Packing Algorithm

The main entry point is `src/core/packager.ts` → `pack()` function. The pipeline:

1. **Search files** — `searchFiles()` uses `globby` with include/ignore patterns per root directory
2. **Sort paths** — `sortPaths()` sorts alphabetically with directories-first ordering
3. **Collect files** — `collectFiles()` reads file contents from disk
4. **Get git diffs/logs** — Optional: fetches `git diff` (worktree + staged) and `git log`
5. **Security check** — `validateFileSafety()` uses Secretlint to detect secrets/keys
6. **Process files** — `processFiles()` applies transformations (remove comments, line numbers, compression via Tree-sitter)
7. **Sort by git changes** — Optional: reorder files by git change frequency (more changes → bottom)
8. **Generate output** — Render via Handlebars template or structured XML/JSON builder
9. **Calculate metrics** — Token counts (using tiktoken worker threads), char counts per file

Key design: supports **multiple root directories** and **multi-root tree generation**.

## 2. Output Format (XML — Default)

### XML Template (Handlebars)

```xml
<!-- Header/preamble (generated, not a fixed string) -->
This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation.
</notes>

</file_summary>

<user_provided_header>
(optional custom header text)
</user_provided_header>

<directory_structure>
src/
  core/
    packager.ts
    file/
      fileSearch.ts
  index.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/index.ts">
console.log("hello");
</file>

<file path="src/core/packager.ts">
import path from 'node:path';
// ... file contents ...
</file>

</files>

<git_diffs>
<git_diff_work_tree>
(unstaged diff content)
</git_diff_work_tree>
<git_diff_staged>
(staged diff content)
</git_diff_staged>
</git_diffs>

<git_logs>
<git_log_commit>
<date>2024-01-15</date>
<message>feat: add new feature</message>
<files>
src/index.ts
src/core/packager.ts
</files>
</git_log_commit>
</git_logs>

<instruction>
(optional repository instruction from file)
</instruction>
```

### Parsable XML Mode

When `parsableStyle: true`, uses `fast-xml-parser` `XMLBuilder` instead of Handlebars. Wraps everything in `<repomix>` root element. Files become:
```xml
<repomix>
  <file_summary>...</file_summary>
  <directory_structure>...</directory_structure>
  <files>
    <file path="src/index.ts">file content here</file>
  </files>
</repomix>
```

### Other Formats
- **Markdown**: Uses fenced code blocks with dynamic delimiter (calculates max backtick run in all files + 1)
- **JSON**: `{ fileSummary: {...}, directoryStructure: "...", files: { "path": "content" } }`
- **Plain**: Simple text with separators

## 3. File Filtering (Include/Ignore)

### Include Patterns
- Config `include` array → glob patterns via `globby` (fast-glob syntax)
- Default: `['**/*']` (all files)
- CLI: `--include "src/**/*.ts,**/*.md"`

### Ignore Patterns (layered)
1. **Default ignore list** — built-in patterns (node_modules, .git, dist, etc.) via `defaultIgnoreList`
2. **`.gitignore`** — respected via globby's `gitignore: true` option
3. **`.git/info/exclude`** — read and parsed manually
4. **`.ignore` files** — via globby's `ignoreFiles` option (ripgrep-compatible)
5. **`.repomixignore`** — always loaded as ignore file
6. **Custom patterns** — `config.ignore.customPatterns` / CLI `--ignore`
7. **Output file itself** — automatically added to ignore

### Pattern Normalization
- Trailing slashes stripped: `folder/` → `folder`
- `**/folder` expanded to `**/folder/**` for consistent directory matching
- Special chars (parentheses, brackets) escaped in glob patterns

## 4. File Summaries

Repomix does **NOT** generate per-file AI summaries. The "file_summary" section is a **static preamble** describing the output format itself (purpose, format description, usage guidelines, notes).

The preamble is dynamically generated based on config:
- Describes whether it's entire codebase or subset
- Lists processing applied (comments removed, compressed, line numbers, etc.)
- Notes about include/ignore patterns used

The `fileSummary` config flag (`output.fileSummary`) controls whether this preamble section is included at all.

## 5. `pack_remote_repository` MCP Tool

This is an **MCP (Model Context Protocol) server tool** registered via `@modelcontextprotocol/sdk`. It:

1. Creates a temp workspace directory
2. Calls `runCli()` with `--remote <url>` which clones the repo via git
3. Packs using the standard pipeline
4. Returns structured result with metrics

### Input Schema:
```typescript
{
  remote: string,        // GitHub URL or "user/repo" shorthand
  compress: boolean,     // Tree-sitter compression (default: false)
  includePatterns?: string,  // Comma-separated glob patterns
  ignorePatterns?: string,   // Comma-separated glob patterns
  topFilesLength?: number,   // Default: 10
  style: 'xml' | 'markdown' | 'json' | 'plain'  // Default: 'xml'
}
```

### Output includes:
- Description, result JSON, directory structure, outputId, outputFilePath, totalFiles, totalTokens

Supports GitHub URL formats: `user/repo`, full URL, branch URL (`/tree/branch`), commit URL.

## 6. Interesting Patterns to Copy

### File Sorting by Git Change Count
- `outputSort.ts` — uses `git log --format=format: --name-only` to count how many commits touched each file
- Files with **more changes go to the bottom** (theory: most-changed files are most important, place them last so they're freshest in LLM context window)
- Configurable max commits to scan
- Results cached per `cwd:maxCommits` key

### Token Counting
- Uses worker threads (`worker_threads`) for parallel token counting
- Encoding configurable (tiktoken-based, e.g., cl100k_base)
- Calculates per-file and total output token counts
- Optimization: only calculates token counts for top N files by character count (unless `tokenCountTree` enabled)

### Path Sorting Algorithm
```typescript
// Directories first, then alphabetical within each level
sortPaths(filePaths) {
  // Compare path segments level by level
  // If one is a directory (has more segments) and other is a file → directory first
  // Otherwise alphabetical via localeCompare
}
```

### Markdown Delimiter Calculation
- Scans all file contents for longest backtick run
- Uses `max(3, longestRun + 1)` backticks for code fences — prevents escaping issues

### Security: Secretlint Integration
- Runs Secretlint on all files before including them
- Files with detected secrets are flagged as "suspicious" and excluded
- Also checks git diffs and logs for secrets

### Code Compression (`--compress`)
- Uses Tree-sitter to parse code and extract signatures (function defs, class defs, imports)
- Removes implementation details
- Blocks separated by `⋮----` delimiter
- Claims ~70% token reduction

### Line Counting for Files
- Tracked per file in output context
- Empty files = 0 lines
- Handles trailing newline correctly

### Header Generation
- Dynamic based on config — describes what processing was applied
- Example: "This file is a merged representation of the entire codebase, combined into a single document by Repomix. The content has been processed where comments have been removed, content has been compressed."

## 7. Architecture Summary

```
src/
  cli/          — CLI entry point, arg parsing
  config/       — Config schema, defaults, merge logic
  core/
    file/       — fileSearch (globby), fileCollect (read), fileProcess (transform), filePathSort
    git/        — gitDiffHandle, gitLogHandle, gitRepositoryHandle
    metrics/    — Token counting with worker threads
    output/     — outputGenerate, outputStyles/{xml,markdown,plain}, outputSort, outputSplit
    security/   — Secretlint integration
    packager.ts — Main orchestration
  mcp/          — MCP server with tools (pack_remote_repository, pack_local_repository, etc.)
```

## 8. Key Takeaways for AgentFoundry

1. **Match the XML format** — Use `<file_summary>`, `<directory_structure>`, `<files>`, `<file path="...">` tags
2. **Include preamble** — The summary section helps LLMs understand the format
3. **Directories-first sorting** — Sort file paths with directories before files at each level
4. **Git-aware sorting** — Put most-changed files last (bottom of context = most attention from LLM)
5. **Layered ignore system** — .gitignore + .ignore + .repomixignore + defaults + custom
6. **Security scanning** — Consider Secretlint or similar before packing
7. **Token counting** — Use worker threads for performance; tiktoken cl100k_base encoding
8. **Dynamic code fences** — For markdown output, calculate delimiter length from content
