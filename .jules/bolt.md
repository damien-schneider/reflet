## 2024-05-23 - Convex Index Optimization
**Learning:** In Convex, using `.withIndex()` with a composite index (e.g., `["boardId", "status"]`) allows filtering at the database level, which is significantly more efficient than fetching all documents and filtering in memory with JavaScript `Array.prototype.filter()`.
**Action:** Always check `schema.ts` for available composite indexes when writing Convex queries (`query()` or `mutation()`). If a query filters by multiple fields that match an existing index, update the query to use `.withIndex()` and `.eq()` for those fields.
