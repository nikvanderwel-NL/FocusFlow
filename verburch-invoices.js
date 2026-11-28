(() => {
  const { useState, useEffect, useMemo, useCallback } = React;

  const INVOICE_STATUSES = [
    { id: "concept", label: "Concept" },
    { id: "verzonden", label: "Verzonden" },
    { id: "betaald", label: "Betaald" },
    { id: "achterstallig", label: "Achterstallig" }
  ];

  const BARDIENST_STATUSES = [
    { id: "open", label: "open" },
    { id: "nvt", label: "nvt" },
    { id: "uitbetaald", label: "uitbetaald" }
  ];

  const DEFAULT_INVOICE_DEFAULTS = {
    senderName: "SV Verburch",
    senderAddress: "",
    paymentInfo: "",
    defaultPaymentLink: "",
    presetLines: [
      {
        id: "preset-1",
        subject: "Bardienst",
        quantity: 1,
        totalPrice: 0
      }
    ]
  };

  function normalizePresetLines(lines) {
    if (!Array.isArray(lines)) return [];
    return lines.map((line, idx) => ({
      id: line?.id || `preset-${idx + 1}`,
      subject: typeof line?.subject === "string" ? line.subject : "",
      quantity: Math.max(1, Number(line?.quantity) || 1),
      totalPrice: Number(line?.totalPrice) || 0
    }));
  }

  function normalizeInvoiceLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) {
      return [
        {
          id: `line-${Date.now()}-1`,
          subject: "",
          quantity: 1,
          totalPrice: 0
        }
      ];
    }
    return lines.map((line, idx) => ({
      id: line?.id || `line-${Date.now()}-${idx}`,
      subject: typeof line?.subject === "string" ? line.subject : "",
      quantity: Math.max(1, Number(line?.quantity) || 1),
      totalPrice: Number(line?.totalPrice) || 0
    }));
  }

  function normalizeInvoiceDefaults(raw) {
    if (!raw || typeof raw !== "object") {
      return {
        ...DEFAULT_INVOICE_DEFAULTS,
        presetLines: normalizePresetLines(DEFAULT_INVOICE_DEFAULTS.presetLines)
      };
    }
    return {
      senderName: typeof raw.senderName === "string" ? raw.senderName : DEFAULT_INVOICE_DEFAULTS.senderName,
      senderAddress: typeof raw.senderAddress === "string" ? raw.senderAddress : "",
      paymentInfo: typeof raw.paymentInfo === "string" ? raw.paymentInfo : "",
      defaultPaymentLink: typeof raw.defaultPaymentLink === "string" ? raw.defaultPaymentLink : "",
      presetLines: normalizePresetLines(raw.presetLines)
    };
  }

  function calculateInvoiceTotal(lines) {
    if (!Array.isArray(lines)) return 0;
    return lines.reduce((sum, line) => sum + (Number(line?.totalPrice) || 0), 0);
  }

  function formatEuro(amount) {
    const num = Number(amount) || 0;
    return num.toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getInvoiceStatusBadge(status) {
    switch (status) {
      case "betaald":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300";
      case "verzonden":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300";
      case "achterstallig":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300";
      case "concept":
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  }

  // Bardienststatus: 'nvt' en 'uitbetaald' zijn compleet en altijd groen; 'open' is waarschuwend/open
  function getBardienstBadge(status) {
    if (status === "nvt" || status === "uitbetaald") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/70";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200/80 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/70";
  }

  function getSafeHttpUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    const trimmed = rawUrl.trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.toString();
      }
      return "";
    } catch {
      return "";
    }
  }

  function buildDraftInvoice(defaultsObj, todayStr, seqNumber = 1) {
    const cleanDefaults = normalizeInvoiceDefaults(defaultsObj);
    const year = (todayStr || "").slice(0, 4) || String(new Date().getFullYear());
    const padded = String(seqNumber).padStart(3, "0");

    return {
      id: null,
      invoiceNumber: `VB-${year}-${padded}`,
      customerOrTitle: "",
      issueDate: todayStr,
      dueDate: "",
      status: "concept",
      bardienstStatus: "open",
      paymentLink: cleanDefaults.defaultPaymentLink || "",
      senderName: cleanDefaults.senderName || "",
      senderAddress: cleanDefaults.senderAddress || "",
      paymentInfo: cleanDefaults.paymentInfo || "",
      notes: "",
      lines: normalizeInvoiceLines(cleanDefaults.presetLines)
    };
  }

  function VerburchInvoicesSection({
    invoices = [],
    invoiceDefaults,
    todayStr,
    accent,
    onSaveInvoice,
    onDeleteInvoice,
    onUpdateInvoiceQuick,
    onSaveDefaults,
    onShowToast
  }) {
    const cleanDefaults = useMemo(
      () => normalizeInvoiceDefaults(invoiceDefaults),
      [invoiceDefaults]
    );

    const safeInvoices = useMemo(
      () =>
        (Array.isArray(invoices) ? invoices : []).map((inv, idx) => {
          const lines = normalizeInvoiceLines(inv.lines);
          return {
            ...inv,
            id: inv.id || `inv-${idx}`,
            invoiceNumber: inv.invoiceNumber || `VB-${idx + 1}`,
            customerOrTitle: inv.customerOrTitle || "",
            issueDate: inv.issueDate || todayStr,
            dueDate: inv.dueDate || "",
            status: inv.status || "concept",
            bardienstStatus: ["open", "nvt", "uitbetaald"].includes(inv.bardienstStatus)
              ? inv.bardienstStatus
              : "open",
            paymentLink: inv.paymentLink || "",
            senderName: inv.senderName || "",
            senderAddress: inv.senderAddress || "",
            paymentInfo: inv.paymentInfo || "",
            notes: inv.notes || "",
            lines
          };
        }),
      [invoices, todayStr]
    );

    const [statusFilter, setStatusFilter] = useState("all");
    const [bardienstFilter, setBardienstFilter] = useState("all");
    const [invoiceModalDraft, setInvoiceModalDraft] = useState(null);
    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [defaultsModalDraft, setDefaultsModalDraft] = useState(null);
    const [copiedLinkId, setCopiedLinkId] = useState(null);

    const closeInvoiceModalWithoutSave = useCallback(() => {
      setInvoiceModalDraft(null);
      setSelectedPresetId("");
    }, []);

    const closeDefaultsModalWithoutSave = useCallback(() => {
      setDefaultsModalDraft(null);
    }, []);

    // Escape sluit open factuur-pop-ups zonder op te slaan
    useEffect(() => {
      if (!invoiceModalDraft && !defaultsModalDraft) return;
      function handleKeyDown(e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        if (invoiceModalDraft) {
          closeInvoiceModalWithoutSave();
        } else if (defaultsModalDraft) {
          closeDefaultsModalWithoutSave();
        }
      }
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [
      invoiceModalDraft,
      defaultsModalDraft,
      closeInvoiceModalWithoutSave,
      closeDefaultsModalWithoutSave
    ]);

    function openNewInvoiceModal() {
      const nextNum = safeInvoices.length + 1;
      const draft = buildDraftInvoice(cleanDefaults, todayStr, nextNum);
      setInvoiceModalDraft(draft);
      setSelectedPresetId(cleanDefaults.presetLines[0]?.id || "");
    }

    function openEditInvoiceModal(inv) {
      setInvoiceModalDraft({
        ...inv,
        lines: normalizeInvoiceLines(inv.lines)
      });
      setSelectedPresetId(cleanDefaults.presetLines[0]?.id || "");
    }

    function openDefaultsModal() {
      setDefaultsModalDraft({
        senderName: cleanDefaults.senderName,
        senderAddress: cleanDefaults.senderAddress,
        paymentInfo: cleanDefaults.paymentInfo,
        defaultPaymentLink: cleanDefaults.defaultPaymentLink,
        presetLines: normalizePresetLines(cleanDefaults.presetLines)
      });
    }

    function handleAddLineToDraft() {
      setInvoiceModalDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lines: [
            ...prev.lines,
            {
              id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              subject: "",
              quantity: 1,
              totalPrice: 0
            }
          ]
        };
      });
    }

    function handleInsertPresetLine() {
      if (!invoiceModalDraft) return;
      const chosen =
        cleanDefaults.presetLines.find((p) => p.id === selectedPresetId) ||
        cleanDefaults.presetLines[0];
      if (!chosen) return;

      setInvoiceModalDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lines: [
            ...prev.lines,
            {
              id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              subject: chosen.subject || "",
              quantity: Math.max(1, Number(chosen.quantity) || 1),
              totalPrice: Number(chosen.totalPrice) || 0
            }
          ]
        };
      });
      onShowToast?.(`Standaardregel "${chosen.subject || "Regel"}" toegevoegd`);
    }

    function handleUpdateDraftLine(lineId, field, rawVal) {
      setInvoiceModalDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lines: prev.lines.map((line) => {
            if (line.id !== lineId) return line;
            if (field === "subject") {
              return { ...line, subject: rawVal };
            }
            if (field === "quantity") {
              return { ...line, quantity: Math.max(1, parseInt(rawVal, 10) || 1) };
            }
            if (field === "totalPrice") {
              const parsed = parseFloat(String(rawVal).replace(",", "."));
              return { ...line, totalPrice: Number.isNaN(parsed) ? 0 : parsed };
            }
            return line;
          })
        };
      });
    }

    function handleRemoveDraftLine(lineId) {
      setInvoiceModalDraft((prev) => {
        if (!prev) return null;
        const remaining = prev.lines.filter((l) => l.id !== lineId);
        return {
          ...prev,
          lines: normalizeInvoiceLines(remaining)
        };
      });
    }

    function handleSubmitInvoiceForm(e) {
      e.preventDefault();
      if (!invoiceModalDraft) return;
      const cleanedLines = normalizeInvoiceLines(invoiceModalDraft.lines);
      const totalAmount = calculateInvoiceTotal(cleanedLines);
      const isNew = !invoiceModalDraft.id;

      const record = {
        ...invoiceModalDraft,
        id: invoiceModalDraft.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        invoiceNumber: (invoiceModalDraft.invoiceNumber || "").trim() || `VB-${Date.now().toString().slice(-4)}`,
        customerOrTitle: (invoiceModalDraft.customerOrTitle || "").trim(),
        paymentLink: (invoiceModalDraft.paymentLink || "").trim(),
        senderName: (invoiceModalDraft.senderName || "").trim(),
        senderAddress: (invoiceModalDraft.senderAddress || "").trim(),
        paymentInfo: (invoiceModalDraft.paymentInfo || "").trim(),
        notes: (invoiceModalDraft.notes || "").trim(),
        lines: cleanedLines,
        totalAmount,
        updatedAt: new Date().toISOString(),
        createdAt: invoiceModalDraft.createdAt || new Date().toISOString()
      };

      onSaveInvoice?.(record, isNew);
      closeInvoiceModalWithoutSave();
    }

    function handleSaveDefaultsForm(e) {
      e.preventDefault();
      if (!defaultsModalDraft) return;
      const normalized = normalizeInvoiceDefaults(defaultsModalDraft);
      onSaveDefaults?.(normalized);
      closeDefaultsModalWithoutSave();
    }

    function handleCopyPaymentLink(invId, url) {
      if (!url) return;
      const temp = document.createElement("textarea");
      temp.value = url;
      temp.setAttribute("readonly", "");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand("copy");
        setCopiedLinkId(invId);
        setTimeout(() => setCopiedLinkId(null), 2000);
        onShowToast?.("Betaallink gekopieerd");
      } finally {
        document.body.removeChild(temp);
      }
    }

    const filteredInvoices = useMemo(() => {
      return safeInvoices.filter((inv) => {
        if (statusFilter !== "all" && inv.status !== statusFilter) return false;
        if (bardienstFilter !== "all" && inv.bardienstStatus !== bardienstFilter) return false;
        return true;
      });
    }, [safeInvoices, statusFilter, bardienstFilter]);

    const summary = useMemo(() => {
      let openAmount = 0;
      let unpaidCount = 0;
      let openBardienstCount = 0;

      for (const inv of safeInvoices) {
        const total = calculateInvoiceTotal(inv.lines);
        if (inv.status !== "betaald") {
          openAmount += total;
          unpaidCount += 1;
        }
        if (inv.bardienstStatus === "open") {
          openBardienstCount += 1;
        }
      }

      return {
        totalCount: safeInvoices.length,
        openAmount,
        unpaidCount,
        openBardienstCount
      };
    }, [safeInvoices]);

    const draftTotal = useMemo(
      () => calculateInvoiceTotal(invoiceModalDraft?.lines || []),
      [invoiceModalDraft]
    );

    return (
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Facturen — Verburch</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Factuurregels, betaallink, factuurstatus en bardienststatus (open, nvt, uitbetaald).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openDefaultsModal}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Standaardinstellingen
              </button>
              <button
                type="button"
                onClick={openNewInvoiceModal}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent.primaryBtn}`}
              >
                + Nieuwe factuur
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Openstaand bedrag ({summary.unpaidCount} facturen)
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatEuro(summary.openAmount)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Totaal aantal facturen
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {summary.totalCount}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Bardienst nog open
              </div>
              <div className="mt-1 flex items-center gap-2 text-lg font-bold">
                <span
                  className={
                    summary.openBardienstCount > 0
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }
                >
                  {summary.openBardienstCount}
                </span>
                <span className="text-xs font-normal text-slate-400">
                  (nvt en uitbetaald zijn groen)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-medium ${
                  statusFilter === "all" ? accent.activeTab : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Alles
              </button>
              {INVOICE_STATUSES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-lg px-2.5 py-1 font-medium ${
                    statusFilter === st.id ? accent.activeTab : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Bardienst:</span>
              <select
                value={bardienstFilter}
                onChange={(e) => setBardienstFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">Alle bardienststatussen</option>
                {BARDIENST_STATUSES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
                Geen facturen gevonden voor deze selectie.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const total = calculateInvoiceTotal(inv.lines);
                const safeUrl = getSafeHttpUrl(inv.paymentLink);

                return (
                  <div
                    key={inv.id}
                    className={`rounded-xl border border-slate-200 bg-white p-4 transition ${accent.borderHover} dark:border-slate-800 dark:bg-slate-900`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {inv.customerOrTitle || "(Zonder omschrijving)"}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getInvoiceStatusBadge(
                              inv.status
                            )}`}
                          >
                            {INVOICE_STATUSES.find((s) => s.id === inv.status)?.label || inv.status}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getBardienstBadge(
                              inv.bardienstStatus
                            )}`}
                          >
                            Bardienst: {inv.bardienstStatus}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {inv.issueDate && <span>Datum: {inv.issueDate}</span>}
                          {inv.dueDate && <span>Vervaldatum: {inv.dueDate}</span>}
                          <span>{inv.lines.length} {inv.lines.length === 1 ? "regel" : "regels"}</span>
                        </div>

                        {inv.lines.length > 0 && (
                          <div className="mt-2.5 rounded-lg bg-slate-50/80 px-3 py-2 text-xs dark:bg-slate-950/60">
                            {inv.lines.map((line) => (
                              <div
                                key={line.id}
                                className="flex items-center justify-between gap-2 py-0.5 text-slate-700 dark:text-slate-300"
                              >
                                <span className="truncate">
                                  {line.quantity}× {line.subject || "(Geen onderwerp)"}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {formatEuro(line.totalPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {inv.paymentLink && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Betaallink:</span>
                            {safeUrl ? (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-medium underline text-orange-700 hover:text-orange-800 dark:text-orange-300"
                              >
                                {safeUrl}
                              </a>
                            ) : (
                              <span className="truncate text-slate-700 dark:text-slate-300">
                                {inv.paymentLink}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyPaymentLink(inv.id, inv.paymentLink)}
                              className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              {copiedLinkId === inv.id ? "Gekopieerd" : "Kopieer"}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {formatEuro(total)}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            aria-label="Factuurstatus wijzigen"
                            value={inv.status}
                            onChange={(e) =>
                              onUpdateInvoiceQuick?.(inv.id, { status: e.target.value })
                            }
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                          >
                            {INVOICE_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          <select
                            aria-label="Bardienststatus wijzigen"
                            value={inv.bardienstStatus}
                            onChange={(e) =>
                              onUpdateInvoiceQuick?.(inv.id, { bardienstStatus: e.target.value })
                            }
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${getBardienstBadge(
                              inv.bardienstStatus
                            )}`}
                          >
                            {BARDIENST_STATUSES.map((b) => (
                              <option key={b.id} value={b.id}>
                                Bardienst: {b.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => openEditInvoiceModal(inv)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            Bewerken
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteInvoice?.(inv.id)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pop-up: Factuur aanmaken of bewerken met factuurregels, betaallink en bardienststatus */}
        {invoiceModalDraft && (
          <div
            onClick={closeInvoiceModalWithoutSave}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmitInvoiceForm}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="text-base font-bold">
                  {invoiceModalDraft.id ? "Factuur bewerken" : "Nieuwe factuur aanmaken"}
                </h3>
                <button
                  type="button"
                  onClick={closeInvoiceModalWithoutSave}
                  className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Factuurnummer
                    </label>
                    <input
                      type="text"
                      value={invoiceModalDraft.invoiceNumber}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          invoiceNumber: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Klant / omschrijving
                    </label>
                    <input
                      type="text"
                      value={invoiceModalDraft.customerOrTitle}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          customerOrTitle: e.target.value
                        })
                      }
                      placeholder="Bijv. Toernooi / Sponsor / Activiteit"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Factuurdatum
                    </label>
                    <input
                      type="date"
                      value={invoiceModalDraft.issueDate || ""}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          issueDate: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Vervaldatum
                    </label>
                    <input
                      type="date"
                      value={invoiceModalDraft.dueDate || ""}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          dueDate: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Factuurstatus
                    </label>
                    <select
                      value={invoiceModalDraft.status}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          status: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {INVOICE_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Bardienststatus
                    </label>
                    <select
                      value={invoiceModalDraft.bardienstStatus}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          bardienstStatus: e.target.value
                        })
                      }
                      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${getBardienstBadge(
                        invoiceModalDraft.bardienstStatus
                      )}`}
                    >
                      {BARDIENST_STATUSES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Factuurregels: Onderwerp, Aantal, Totaalprijs + snelkeuze standaardregel */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Factuurregels
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {cleanDefaults.presetLines.length > 0 && (
                        <>
                          <select
                            aria-label="Kies standaardregel"
                            value={selectedPresetId}
                            onChange={(e) => setSelectedPresetId(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                          >
                            {cleanDefaults.presetLines.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.subject || "Standaardregel"} ({p.quantity}× • {formatEuro(p.totalPrice)})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleInsertPresetLine}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                          >
                            + Standaardregel
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handleAddLineToDraft}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        + Regel toevoegen
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {invoiceModalDraft.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid gap-2 sm:grid-cols-12 items-center"
                      >
                        <div className="sm:col-span-6">
                          <label className="mb-0.5 block text-[11px] text-slate-500">
                            Onderwerp
                          </label>
                          <input
                            type="text"
                            value={line.subject}
                            onChange={(e) =>
                              handleUpdateDraftLine(line.id, "subject", e.target.value)
                            }
                            placeholder="Onderwerp van de regel"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-0.5 block text-[11px] text-slate-500">
                            Aantal
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) =>
                              handleUpdateDraftLine(line.id, "quantity", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="mb-0.5 block text-[11px] text-slate-500">
                            Totaalprijs (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={line.totalPrice}
                            onChange={(e) =>
                              handleUpdateDraftLine(line.id, "totalPrice", e.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-1 sm:pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftLine(line.id)}
                            title="Regel verwijderen"
                            className="rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-3 text-sm font-bold dark:border-slate-800">
                    <span>Berekend totaal</span>
                    <span>{formatEuro(draftTotal)}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Betaallink (optioneel)
                    </label>
                    <input
                      type="url"
                      value={invoiceModalDraft.paymentLink}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          paymentLink: e.target.value
                        })
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Afzender / organisatie
                    </label>
                    <input
                      type="text"
                      value={invoiceModalDraft.senderName}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          senderName: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Adres / contactgegevens
                    </label>
                    <input
                      type="text"
                      value={invoiceModalDraft.senderAddress}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          senderAddress: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Betaalgegevens / IBAN
                    </label>
                    <input
                      type="text"
                      value={invoiceModalDraft.paymentInfo}
                      onChange={(e) =>
                        setInvoiceModalDraft({
                          ...invoiceModalDraft,
                          paymentInfo: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Opmerking / toelichting
                  </label>
                  <textarea
                    rows="2"
                    value={invoiceModalDraft.notes}
                    onChange={(e) =>
                      setInvoiceModalDraft({
                        ...invoiceModalDraft,
                        notes: e.target.value
                      })
                    }
                    placeholder="Optionele notitie bij deze factuur..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeInvoiceModalWithoutSave}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent.primaryBtn}`}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pop-up: Standaardinstellingen voor Verburch-facturen */}
        {defaultsModalDraft && (
          <div
            onClick={closeDefaultsModalWithoutSave}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveDefaultsForm}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold">Standaardinstellingen facturen (Verburch)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Worden vooringevuld bij nieuwe facturen en gebruikt als snelkeuze voor regels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDefaultsModalWithoutSave}
                  className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Standaard afzender / organisatie
                    </label>
                    <input
                      type="text"
                      value={defaultsModalDraft.senderName}
                      onChange={(e) =>
                        setDefaultsModalDraft({
                          ...defaultsModalDraft,
                          senderName: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Standaard betaalgegevens / IBAN
                    </label>
                    <input
                      type="text"
                      value={defaultsModalDraft.paymentInfo}
                      onChange={(e) =>
                        setDefaultsModalDraft({
                          ...defaultsModalDraft,
                          paymentInfo: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Standaard adres / contact
                    </label>
                    <input
                      type="text"
                      value={defaultsModalDraft.senderAddress}
                      onChange={(e) =>
                        setDefaultsModalDraft({
                          ...defaultsModalDraft,
                          senderAddress: e.target.value
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Standaard betaallink (optioneel)
                    </label>
                    <input
                      type="url"
                      value={defaultsModalDraft.defaultPaymentLink}
                      onChange={(e) =>
                        setDefaultsModalDraft({
                          ...defaultsModalDraft,
                          defaultPaymentLink: e.target.value
                        })
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Standaard factuurregels
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDefaultsModalDraft((prev) => ({
                          ...prev,
                          presetLines: [
                            ...(prev?.presetLines || []),
                            {
                              id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                              subject: "",
                              quantity: 1,
                              totalPrice: 0
                            }
                          ]
                        }))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      + Standaardregel
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(defaultsModalDraft.presetLines || []).map((preset) => (
                      <div
                        key={preset.id}
                        className="grid gap-2 sm:grid-cols-12 items-center"
                      >
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            value={preset.subject}
                            onChange={(e) =>
                              setDefaultsModalDraft((prev) => ({
                                ...prev,
                                presetLines: prev.presetLines.map((p) =>
                                  p.id === preset.id ? { ...p, subject: e.target.value } : p
                                )
                              }))
                            }
                            placeholder="Onderwerp"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={preset.quantity}
                            onChange={(e) =>
                              setDefaultsModalDraft((prev) => ({
                                ...prev,
                                presetLines: prev.presetLines.map((p) =>
                                  p.id === preset.id
                                    ? { ...p, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                    : p
                                )
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            value={preset.totalPrice}
                            onChange={(e) =>
                              setDefaultsModalDraft((prev) => ({
                                ...prev,
                                presetLines: prev.presetLines.map((p) => {
                                  if (p.id !== preset.id) return p;
                                  const parsed = parseFloat(String(e.target.value).replace(",", "."));
                                  return {
                                    ...p,
                                    totalPrice: Number.isNaN(parsed) ? 0 : parsed
                                  };
                                })
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setDefaultsModalDraft((prev) => ({
                                ...prev,
                                presetLines: prev.presetLines.filter((p) => p.id !== preset.id)
                              }))
                            }
                            title="Verwijderen"
                            className="rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDefaultsModalWithoutSave}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent.primaryBtn}`}
                >
                  Standaardinstellingen opslaan
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    );
  }

  window.VerburchInvoices = {
    VerburchInvoicesSection,
    DEFAULT_INVOICE_DEFAULTS,
    normalizeInvoiceDefaults
  };
})();
