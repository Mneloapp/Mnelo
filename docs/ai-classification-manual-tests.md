# AI Classification Manual Tests

Use these checks before shipping changes to the BOQ classification workflow.

1. Upload a 10-row BOQ file and confirm parsed rows appear in the BOQ tab.
2. Run classification without `OPENAI_API_KEY`.
   - Expected: the run completes with local learning/rules only.
   - Expected: low-confidence unknown rows remain marked as `Needs Review`.
3. Run classification with `OPENAI_API_KEY`.
   - Expected: only low-confidence or `Needs Review` rows are sent to AI.
   - Expected: high-confidence rules and learned classifications are not overwritten.
4. Manually correct one item to a specific system and category.
   - Expected: the row is saved with source `Learned` and confidence `100%`.
5. Run classification again.
   - Expected: the manually corrected row is not overwritten by AI.
   - Expected: similar future rows can reuse the learned classification.
6. Verify failed OpenAI batches do not fail the whole run.
   - Expected: local fallback rows remain visible and the UI shows a clear warning.
7. Verify each product row shows source, confidence, optional reason, and `Needs Review` badge when applicable.
8. Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build`.
