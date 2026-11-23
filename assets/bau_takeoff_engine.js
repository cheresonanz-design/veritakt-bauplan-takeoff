/**
 * Bauplan-Aufmaß & LV-Kalkulator (B12) — Deterministic Client-Side & Node.js Engine
 * 100 % local in browser / offline CLI, zero network calls.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.CheProjectEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const META = {
  "pid": "B12",
  "brand": "MarginProof",
  "short_name": "Bauplan-Aufmaß & LV-Kalkulator",
  "slug": "bau_takeoff",
  "default_profile": "Neubau Kita Nord · Los 09 Trockenbau",
  "kpi_impact_label": "Abgesicherter Bau-Deckungsbeitrag",
  "annual_multiplier": 6
};
  const SAMPLES = {
  "s1": {
    "profile_name": "Neubau Kita Nord · Los 09 Trockenbau",
    "mode": "trockenbau",
    "tone": "streng",
    "items": [
      {
        "id": "LV-01",
        "label": "GK-Ständerwand 1.240 qm ohne 10 % Verschnitt gerechnet",
        "category": "Aufmaß/Verschnitt",
        "metric": 92,
        "base_eur": 78000,
        "impact_eur": 7440,
        "status": "FAIL",
        "note": "10 % Verschnitt & Befestigungsmittel in EP einpreisen (+6,00 EUR/qm)"
      },
      {
        "id": "LV-02",
        "label": "Geänderte Brandschutzklasse F90 statt F30 per Planindex B",
        "category": "§ 2 Abs. 5 VOB/B",
        "metric": 88,
        "base_eur": 18000,
        "impact_eur": 6200,
        "status": "FAIL",
        "note": "Mehrkosten vor Einbau schriftlich nach § 2 Abs. 5 VOB/B anzeigen"
      },
      {
        "id": "LV-03",
        "label": "Spachtelgüte Q2 Standardflächen",
        "category": "Standard LV",
        "metric": 100,
        "base_eur": 12400,
        "impact_eur": 0,
        "status": "PASS",
        "note": "Kalkulatorisch sauber abgedeckt"
      }
    ]
  },
  "s2": {
    "profile_name": "Gewerbehalle Ost · Sauberes LV",
    "mode": "rohbau",
    "tone": "executive",
    "items": [
      {
        "id": "LV-10",
        "label": "Beton C25/30 inkl. Pumpe & Schalungsanteil",
        "category": "Rohbau",
        "metric": 100,
        "base_eur": 115000,
        "impact_eur": 0,
        "status": "PASS",
        "note": "AGK 14 % + Wagnis 5 % sauber kalkuliert"
      }
    ]
  },
  "s3": {
    "profile_name": "Klinikum Sanierung · TGA Gewerk",
    "mode": "tga",
    "tone": "streng",
    "items": [
      {
        "id": "LV-20",
        "label": "Massenmehrung Rohrleitung +24 % (>10 % Grenze)",
        "category": "§ 2 Abs. 3 VOB/B",
        "metric": 85,
        "base_eur": 44000,
        "impact_eur": 4100,
        "status": "WARN",
        "note": "Neuen EP wegen geänderter BGK-Deckung ab 110 % verlangen"
      }
    ]
  }
};

  function r2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function evaluateCase(input = {}) {
    const profileName = String(input.profile_name || SAMPLES.s1.profile_name || META.default_profile);
    const mode = String(input.mode || SAMPLES.s1.mode || "standard");
    const tone = String(input.tone || SAMPLES.s1.tone || "executive");
    const rawItems = Array.isArray(input.items) && input.items.length ? input.items : SAMPLES.s1.items;

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;
    let impactTotal = 0;
    let baseTotal = 0;

    const rows = rawItems.map((it, idx) => {
      const id = String(it.id || `${META.pid}-${String(idx + 1).padStart(2, "0")}`);
      const label = String(it.label || "Position");
      const category = String(it.category || "Prüfpunkt");
      const metric = Number(it.metric) || 0;
      const impact = Number(it.impact_eur) || 0;
      const base = Number(it.base_eur) || 0;
      const statusRaw = String(it.status || "").toUpperCase();
      const status = ["PASS", "WARN", "FAIL"].includes(statusRaw)
        ? statusRaw
        : impact > 0 && metric >= 70
          ? "FAIL"
          : impact > 0
            ? "WARN"
            : "PASS";

      if (status === "PASS") passCount += 1;
      else if (status === "WARN") warnCount += 1;
      else failCount += 1;

      impactTotal += impact;
      baseTotal += base;

      return {
        id,
        label,
        category,
        metric: r2(metric),
        base_eur: r2(base),
        impact_eur: r2(impact),
        status,
        note: String(it.note || (status === "PASS" ? "Regelkonform" : "Maßnahme empfohlen")),
      };
    });

    const totalCount = rows.length || 1;
    const score = r2(Math.max(0, Math.min(100, ((passCount + warnCount * 0.5) / totalCount) * 100)));
    const ok = failCount === 0;
    const annualImpact = r2(impactTotal * (Number(META.annual_multiplier) || 12));

    const headerTone = tone === "streng"
      ? `[FRIST / ESKALATION] ${profileName} (${META.pid} · Modus: ${mode})`
      : `[EXECUTIVE SUMMARY] ${profileName} (${META.pid} · Modus: ${mode})`;

    const actionLines = rows
      .filter((r) => r.status !== "PASS")
      .map((r) => `- [${r.status}] ${r.id} ${r.label}: ${r.note} (Potenzial/Risiko: ${r.impact_eur.toFixed(2)} EUR)`);

    const actionText = [
      headerTone,
      `Readiness-Score: ${score} % | Geprüft: ${rows.length} | PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}`,
      `${META.kpi_impact_label}: ${impactTotal.toFixed(2)} EUR (Hochgerechnet p.a.: ${annualImpact.toFixed(2)} EUR)`,
      "",
      actionLines.length ? "Priorisierte Maßnahmen:" : "Alle geprüften Punkte erfüllen die DACH-Vorgaben ohne Beanstandung.",
      ...actionLines,
      "",
      `Erstellt lokal mit ${META.brand} ${META.short_name} (by VeriTakt Collective) — 0 Cloud-Upload.`
    ].join("\n");

    const csvHeader = "ID;Kategorie;Position;Kennzahl;Basis_EUR;Effekt_EUR;Status;Hinweis";
    const csvRows = rows.map((r) =>
      [r.id, r.category, r.label, r.metric.toFixed(2), r.base_eur.toFixed(2), r.impact_eur.toFixed(2), r.status, r.note]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
    const exportCsv = "\uFEFF" + [csvHeader, ...csvRows].join("\n");

    return {
      ok,
      project_id: META.pid,
      brand: META.brand,
      profile_name: profileName,
      mode,
      tone,
      readiness_percent: score,
      summary: {
        total_count: rows.length,
        pass_count: passCount,
        warn_count: warnCount,
        fail_count: failCount,
      },
      base_total_eur: r2(baseTotal),
      impact_eur: r2(impactTotal),
      annual_impact_eur: annualImpact,
      entries: rows,
      action_text: actionText,
      export_csv: exportCsv,
    };
  }

  function formatAuditReportMarkdown(res) {
    return [
      `# ${META.brand} ${META.short_name} — Audit Report (${res.profile_name})`,
      `- **Score:** ${res.readiness_percent} % | **FAIL:** ${res.summary.fail_count} | **WARN:** ${res.summary.warn_count}`,
      `- **${META.kpi_impact_label}:** ${res.impact_eur.toFixed(2)} EUR (Jahr: ${res.annual_impact_eur.toFixed(2)} EUR)`,
      "",
      "## Maßnahmen & Empfehlung",
      res.action_text,
    ].join("\n");
  }

  function formatAuditReportJson(res) {
    return JSON.stringify(res, null, 2);
  }

  return {
    META,
    SAMPLES,
    evaluateCase,
    formatAuditReportMarkdown,
    formatAuditReportJson,
  };
});
