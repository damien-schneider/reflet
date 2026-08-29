import { commitManualEdits } from "../live-commit-manual-edits.mjs";
import { buildManualEditEvidence } from "../live-manual-edit-evidence.mjs";
import { validateEvent } from "./event-validation.mjs";
import {
  summarizeManualApplyFailures,
  summarizeManualDiagnostics,
  summarizeManualLogFile,
} from "./manual-apply.mjs";
import {
  countByPage as countPendingByPage,
  readBuffer as readManualEditsBuffer,
  removeEntries as removeManualEditEntries,
  stageEntry as stageManualEditEntry,
  truncateBuffer as truncateManualEditsBuffer,
} from "./manual-edits-buffer.mjs";

export function createManualEditRoutes({
  getToken,
  manualApply,
  recordManualEditActivity,
  getManualEditStatus,
  chatAgentLikelyActive,
  cwd = () => process.cwd(),
  env = () => process.env,
} = {}) {
  const projectCwd = () =>
    typeof cwd === "function" ? cwd() : cwd || process.cwd();
  const currentEnv = () =>
    typeof env === "function" ? env() : env || process.env;

  return function handleManualEditRoute(req, res, url) {
    const p = url.pathname;

    // Save stages entries; Apply commits the staged page batch through the
    // local AI copy-edit runner.
    if (p === "/manual-edit-stash" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => {
        body += c;
      });
      req.on("end", () => {
        let msg;
        try {
          msg = JSON.parse(body);
        } catch {
          sendJson(res, 400, { error: "Invalid JSON" });
          return;
        }
        if (msg.token !== getToken()) {
          sendJson(res, 401, { error: "Unauthorized" });
          return;
        }
        const error = validateEvent({ ...msg, type: "manual_edits" });
        if (error) {
          sendJson(res, 400, { error });
          return;
        }
        try {
          stageManualEditEntry(projectCwd(), {
            element: msg.element,
            id: msg.id,
            ops: msg.ops,
            pageUrl: msg.pageUrl,
          });
        } catch (err) {
          sendJson(res, 500, {
            error: "stash_write_failed",
            message: err.message,
          });
          return;
        }
        const { totalCount, perPage } = countPendingByPage(projectCwd());
        const pendingCount = perPage[msg.pageUrl] || 0;
        recordManualEditActivity("manual_edit_stashed", {
          hintedFileCount: new Set(
            (msg.ops || [])
              .map((op) =>
                summarizeManualLogFile(op.sourceHint?.file, projectCwd())
              )
              .filter(Boolean)
          ).size,
          id: msg.id,
          opCount: msg.ops.length,
          pageUrl: msg.pageUrl,
          pendingCount,
          totalCount,
        });
        sendJson(res, 200, { ok: true, pendingCount, perPage, totalCount });
      });
      return true;
    }

    if (p === "/manual-edit-stash" && req.method === "GET") {
      const token = url.searchParams.get("token");
      if (token !== getToken()) {
        res.writeHead(401);
        res.end("Unauthorized");
        return true;
      }
      const pageUrl = url.searchParams.get("pageUrl") || "";
      const { totalCount, perPage } = countPendingByPage(projectCwd());
      const buffer = readManualEditsBuffer(projectCwd());
      const entriesForPage = pageUrl
        ? buffer.entries.filter((e) => e.pageUrl === pageUrl)
        : buffer.entries;
      sendJson(res, 200, {
        count: pageUrl ? perPage[pageUrl] || 0 : totalCount,
        entries: entriesForPage,
        perPage,
        totalCount,
      });
      return true;
    }

    if (p === "/manual-edit-commit" && req.method === "POST") {
      const token = url.searchParams.get("token");
      if (token !== getToken()) {
        res.writeHead(401);
        res.end("Unauthorized");
        return true;
      }
      const pageUrl = url.searchParams.get("pageUrl");
      const asyncMode = /^(1|true|yes)$/i.test(
        url.searchParams.get("async") || ""
      );
      const repairOnly = /^(1|true|yes)$/i.test(
        url.searchParams.get("repair") || ""
      );
      const existingTransaction = manualApply.readTransaction();
      if (repairOnly && !existingTransaction) {
        sendJson(res, 409, { error: "manual_edit_repair_transaction_missing" });
        return true;
      }
      const recoveredTransaction = repairOnly
        ? null
        : manualApply.rollbackTransaction({
            pageUrl,
            reason: "manual_edit_commit_recovered_abandoned_transaction",
          });
      const before = getManualEditStatus();
      const pendingCount = pageUrl
        ? before.perPage[pageUrl] || 0
        : before.totalCount;
      recordManualEditActivity("manual_edit_commit_started", {
        pageUrl,
        pendingCount,
        recoveredTransaction: recoveredTransaction
          ? {
              id: recoveredTransaction.id,
              reason: recoveredTransaction.reason,
              rollbackFailures: summarizeManualDiagnostics(
                recoveredTransaction.rollbackFailures,
                projectCwd()
              ),
              rolledBackFiles: recoveredTransaction.rolledBackFiles,
              skipped: recoveredTransaction.skipped,
            }
          : null,
        repairOnly,
        totalCount: before.totalCount,
        ...summarizePendingManualEditBatch(projectCwd(), pageUrl),
      });
      if (asyncMode) {
        sendJson(res, 202, {
          pendingCount,
          perPage: before.perPage,
          status: "started",
          totalCount: before.totalCount,
        });
      }
      (async () => {
        let result;
        let routedProvider = "subprocess";
        let transaction = null;
        let commitBatch = null;
        try {
          if (pendingCount > 0) {
            const transactionBatch = buildManualEditEvidence({
              cwd: projectCwd(),
              pageUrl,
            });
            commitBatch = transactionBatch;
            if (!repairOnly && manualApply.countOps(transactionBatch) > 0) {
              transaction = manualApply.writeTransaction({
                batch: transactionBatch,
                pageUrl,
              });
            } else if (repairOnly && existingTransaction) {
              transaction = existingTransaction;
            }
          }
          const envValue = currentEnv();
          const requestedMode = (envValue.IMPECCABLE_LIVE_COPY_AGENT || "auto")
            .trim()
            .toLowerCase();
          const useChatRoute =
            requestedMode === "chat" ||
            (requestedMode === "auto" && chatAgentLikelyActive());
          if (useChatRoute) {
            routedProvider = "chat";
            const timeoutMs = Number(
              envValue.IMPECCABLE_LIVE_COPY_AGENT_TIMEOUT_MS || 120_000
            );
            result = await commitManualEdits({
              applyBatchToSource: (batch, context) =>
                manualApply.pushBatchInChunksAndWait(batch, pageUrl, context),
              batch: commitBatch,
              chatAvailable: chatAgentLikelyActive,
              cwd: projectCwd(),
              env: envValue,
              pageUrl,
              provider: "chat",
              repairOnly,
              timeoutMs,
              transactionId: transaction?.id || existingTransaction?.id || null,
            });
          } else {
            const timeoutMs = Number(
              envValue.IMPECCABLE_LIVE_COPY_AGENT_TIMEOUT_MS || 120_000
            );
            const provider = ["codex", "claude", "mock"].includes(requestedMode)
              ? requestedMode
              : undefined;
            result = await commitManualEdits({
              batch: commitBatch,
              chatAvailable: chatAgentLikelyActive,
              cwd: projectCwd(),
              env: envValue,
              pageUrl,
              provider,
              repairOnly,
              timeoutMs,
              transactionId: transaction?.id || existingTransaction?.id || null,
            });
          }
        } catch (err) {
          if (transaction) {
            manualApply.rollbackTransaction({
              pageUrl,
              reason: "manual_edit_commit_exception",
            });
          }
          const message = err.stderr?.toString?.() || err.message;
          recordManualEditActivity("manual_edit_commit_failed", {
            error: "manual_edit_commit_failed",
            message,
            pageUrl,
            provider: routedProvider,
            transactionId: transaction?.id || null,
          });
          if (!asyncMode) {
            sendJson(res, 500, {
              error: "manual_edit_commit_failed",
              message,
            });
          }
          return;
        } finally {
          if (transaction) {
            const shouldKeepTransaction = result?.needsManualDecision === true;
            if (!shouldKeepTransaction) {
              manualApply.clearTransaction(transaction.id);
            }
          }
        }
        const { totalCount, perPage } = countPendingByPage(projectCwd());
        if (result?.needsManualDecision) {
          recordManualEditActivity("manual_edit_repair_needs_decision", {
            failed: summarizeManualApplyFailures(result.failed, projectCwd()),
            files: Array.isArray(result.files)
              ? result.files
                  .slice(0, 20)
                  .map((file) => summarizeManualLogFile(file, projectCwd()))
                  .filter(Boolean)
              : [],
            pageUrl,
            provider: routedProvider,
            remainingCount: pageUrl ? perPage[pageUrl] || 0 : totalCount,
            repair: result.repair || null,
            totalCount,
            transactionId: transaction?.id || existingTransaction?.id || null,
          });
        } else {
          recordManualEditActivity("manual_edit_commit_done", {
            appliedCount: Array.isArray(result.applied)
              ? result.applied.length
              : 0,
            cleared: result.cleared || 0,
            failed: summarizeManualApplyFailures(result.failed, projectCwd()),
            failedCount: Array.isArray(result.failed)
              ? result.failed.length
              : 0,
            files: Array.isArray(result.files)
              ? result.files
                  .slice(0, 20)
                  .map((file) => summarizeManualLogFile(file, projectCwd()))
                  .filter(Boolean)
              : [],
            noteCount: Array.isArray(result.notes) ? result.notes.length : 0,
            pageUrl,
            provider: routedProvider,
            reason: result.reason || null,
            remainingCount: pageUrl ? perPage[pageUrl] || 0 : totalCount,
            repair: result.repair || null,
            rollbackFailures: summarizeManualDiagnostics(
              result.rollbackFailures,
              projectCwd()
            ),
            rolledBackFiles: Array.isArray(result.rolledBackFiles)
              ? result.rolledBackFiles
                  .slice(0, 20)
                  .map((file) => summarizeManualLogFile(file, projectCwd()))
                  .filter(Boolean)
              : [],
            totalCount,
            unreportedFiles: Array.isArray(result.unreportedFiles)
              ? result.unreportedFiles
                  .slice(0, 20)
                  .map((file) => summarizeManualLogFile(file, projectCwd()))
                  .filter(Boolean)
              : undefined,
            warnings: summarizeManualDiagnostics(result.warnings, projectCwd()),
          });
        }
        if (!asyncMode) {
          sendJson(res, 200, { ...result, perPage, totalCount });
        }
      })();
      return true;
    }

    if (p === "/manual-edit-repair-decision" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        let payload = {};
        try {
          payload = body ? JSON.parse(body) : {};
        } catch {
          sendJson(res, 400, { error: "Invalid JSON" });
          return;
        }
        const token = payload.token || url.searchParams.get("token");
        if (token !== getToken()) {
          res.writeHead(401);
          res.end("Unauthorized");
          return;
        }
        const pageUrl =
          payload.pageUrl || url.searchParams.get("pageUrl") || null;
        const action = String(
          payload.action || url.searchParams.get("action") || ""
        )
          .trim()
          .toLowerCase();
        if (action !== "rollback") {
          sendJson(res, 400, {
            action,
            error: "unsupported_manual_edit_repair_decision",
          });
          return;
        }
        const rollback = manualApply.rollbackTransaction({
          pageUrl,
          reason: "manual_edit_user_requested_rollback",
        });
        const { totalCount, perPage } = countPendingByPage(projectCwd());
        const response = {
          action,
          pageUrl,
          perPage,
          remainingCount: pageUrl ? perPage[pageUrl] || 0 : totalCount,
          rollback,
          totalCount,
        };
        recordManualEditActivity("manual_edit_repair_rollback_done", response);
        sendJson(res, 200, response);
      });
      return true;
    }

    if (p === "/manual-edit-discard" && req.method === "POST") {
      const token = url.searchParams.get("token");
      if (token !== getToken()) {
        res.writeHead(401);
        res.end("Unauthorized");
        return true;
      }
      const pageUrl = url.searchParams.get("pageUrl");
      let discarded;
      let discardedEntries = [];
      let canceledApplyEvents = [];
      let transactionRollback = null;
      try {
        const buffer = readManualEditsBuffer(projectCwd());
        transactionRollback = manualApply.rollbackTransaction({
          pageUrl,
          reason: "manual_edit_discarded",
        });
        if (pageUrl) {
          discardedEntries = buffer.entries.filter(
            (entry) => entry.pageUrl === pageUrl
          );
          discarded = removeManualEditEntries(
            projectCwd(),
            (entry) => entry.pageUrl === pageUrl
          );
        } else {
          discardedEntries = buffer.entries;
          discarded = truncateManualEditsBuffer(projectCwd());
        }
        canceledApplyEvents = manualApply.cancelPendingEvents(pageUrl);
      } catch (err) {
        sendJson(res, 500, { error: "discard_failed", message: err.message });
        return true;
      }
      const { totalCount, perPage } = countPendingByPage(projectCwd());
      recordManualEditActivity("manual_edit_discarded", {
        canceledApplyIds: canceledApplyEvents.map((event) => event.id),
        discarded,
        pageUrl,
        totalCount,
        transactionRollback: transactionRollback
          ? {
              id: transactionRollback.id,
              rollbackFailures: summarizeManualDiagnostics(
                transactionRollback.rollbackFailures,
                projectCwd()
              ),
              rolledBackFiles:
                transactionRollback.rolledBackFiles
                  ?.map((file) => summarizeManualLogFile(file, projectCwd()))
                  .filter(Boolean) || [],
              skipped: transactionRollback.skipped,
            }
          : undefined,
      });
      sendJson(res, 200, {
        canceledApplyEvents,
        discarded,
        entries: discardedEntries,
        perPage,
        totalCount,
      });
      return true;
    }

    if (p === "/manual-edit" && req.method === "POST") {
      sendJson(res, 410, {
        error:
          "/manual-edit is removed; use /manual-edit-stash and /manual-edit-commit for staged copy edits.",
      });
      return true;
    }

    return false;
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function summarizePendingManualEditBatch(cwd, pageUrl = null) {
  try {
    const buffer = readManualEditsBuffer(cwd);
    const entries = (buffer.entries || []).filter(
      (entry) => !pageUrl || entry.pageUrl === pageUrl
    );
    return {
      pendingEntryCount: entries.length,
      pendingOpCount: entries.reduce(
        (sum, entry) => sum + (entry.ops?.length || 0),
        0
      ),
    };
  } catch (err) {
    return { pendingSummaryError: err.message || String(err) };
  }
}
