function profileNow() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function createDetectorProfile() {
  return { events: [] };
}

function recordProfileEvent(profile, event) {
  if (!profile) {
    return;
  }
  const normalized = {
    engine: event.engine || "unknown",
    findings: Number.isFinite(event.findings) ? event.findings : 0,
    ms: Number.isFinite(event.ms) ? event.ms : 0,
    phase: event.phase || "unknown",
    ruleId: event.ruleId || "unknown",
    target: event.target || "",
  };
  if (event.detail) {
    normalized.detail = event.detail;
  }
  if (Array.isArray(event.findingIds) && event.findingIds.length) {
    normalized.findingIds = event.findingIds;
  }
  if (typeof profile === "function") {
    profile(normalized);
  } else if (typeof profile.record === "function") {
    profile.record(normalized);
  } else if (Array.isArray(profile.events)) {
    profile.events.push(normalized);
  } else if (Array.isArray(profile)) {
    profile.push(normalized);
  }
}

function extractFindingIds(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return [];
  }
  return [
    ...new Set(
      findings.map((f) => f?.id || f?.type || f?.antipattern).filter(Boolean)
    ),
  ];
}

function profileFindings(profile, meta, callback) {
  if (!profile) {
    return callback();
  }
  const started = profileNow();
  const findings = callback();
  recordProfileEvent(profile, {
    ...meta,
    findingIds: extractFindingIds(findings),
    findings: Array.isArray(findings) ? findings.length : 0,
    ms: profileNow() - started,
  });
  return findings;
}

function profileStep(profile, meta, callback) {
  if (!profile) {
    return callback();
  }
  const started = profileNow();
  try {
    return callback();
  } finally {
    recordProfileEvent(profile, {
      ...meta,
      findings: 0,
      ms: profileNow() - started,
    });
  }
}

async function profileFindingsAsync(profile, meta, callback) {
  if (!profile) {
    return callback();
  }
  const started = profileNow();
  const findings = await callback();
  recordProfileEvent(profile, {
    ...meta,
    findingIds: extractFindingIds(findings),
    findings: Array.isArray(findings) ? findings.length : 0,
    ms: profileNow() - started,
  });
  return findings;
}

async function profileStepAsync(profile, meta, callback) {
  if (!profile) {
    return callback();
  }
  const started = profileNow();
  try {
    return await callback();
  } finally {
    recordProfileEvent(profile, {
      ...meta,
      findings: 0,
      ms: profileNow() - started,
    });
  }
}

function percentile(sortedValues, pct) {
  if (!sortedValues.length) {
    return 0;
  }
  const idx = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sortedValues.length) - 1)
  );
  return sortedValues[idx];
}

function summarizeDetectorProfile(profile) {
  const events = Array.isArray(profile)
    ? profile
    : Array.isArray(profile?.events)
      ? profile.events
      : [];
  const groups = new Map();
  for (const event of events) {
    const key = [
      event.engine || "unknown",
      event.phase || "unknown",
      event.ruleId || "unknown",
      event.target || "",
    ].join("\u0000");
    let group = groups.get(key);
    if (!group) {
      group = {
        calls: 0,
        engine: event.engine || "unknown",
        findings: 0,
        phase: event.phase || "unknown",
        ruleId: event.ruleId || "unknown",
        samples: [],
        target: event.target || "",
        totalMs: 0,
      };
      groups.set(key, group);
    }
    const ms = Number.isFinite(event.ms) ? event.ms : 0;
    group.calls += 1;
    group.totalMs += ms;
    group.findings += Number.isFinite(event.findings) ? event.findings : 0;
    group.samples.push(ms);
  }
  return [...groups.values()]
    .map((group) => {
      const samples = group.samples.sort((a, b) => a - b);
      return {
        avgMs: Number((group.totalMs / group.calls).toFixed(3)),
        calls: group.calls,
        engine: group.engine,
        findings: group.findings,
        p50: Number(percentile(samples, 50).toFixed(3)),
        p95: Number(percentile(samples, 95).toFixed(3)),
        phase: group.phase,
        ruleId: group.ruleId,
        target: group.target,
        totalMs: Number(group.totalMs.toFixed(3)),
      };
    })
    .sort((a, b) => b.totalMs - a.totalMs);
}

export {
  createDetectorProfile,
  extractFindingIds,
  percentile,
  profileFindings,
  profileFindingsAsync,
  profileNow,
  profileStep,
  profileStepAsync,
  recordProfileEvent,
  summarizeDetectorProfile,
};
