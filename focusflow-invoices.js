(() => {
  const { useState, useEffect, useMemo, useCallback } = React;

  const DEFAULT_INVOICE_DEFAULTS = {
    senderName: "SV Verburch",
    senderAddress: "",
    paymentInfo: "",
    defaultPaymentLink: "",
    presetLines: []
  };

  function normalizeLineItem(line, idx = 0) {
    const qty = Math.max(0, Number(line?.quantity ?? line?.aantal ?? 1) || 0);
    const total = Number(line?.total ?? line?.totaalprijs ?? 0) || 0;
    return {
      id: line?.id || `line-${Date.now()}-${idx}`,
      subject: String(line?.subject ?? line?.onderwerp ?? ""),
      quantity: qty,
      total
    };
  }

  function normalizeInvoiceDefaults(raw) {
    const base = raw && typeof raw === "object" ? raw : {};
    const rawLines = Array.isArray(base.presetLines) ? base.presetLines : [];
    return {
      senderName:
        typeof base.senderName === "string" && base.senderName.trim()
          ? base.senderName
          : DEFAULT_INVOICE_DEFAULTS.senderName,
      senderAddress: typeof base.senderAddress === "string" ? base.senderAddress : "",
      paymentInfo: typeof base.paymentInfo === "string" ? base.paymentInfo : "",
      defaultPaymentLink:
        typeof base.defaultPaymentLink === "string" ? base.defaultPaymentLink : "",
      presetLines: rawLines.map((l, idx) => normalizeLineItem(l, idx))
    };
  }

  function calculateInvoiceTotal(lines = []) {
    return lines.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }

  function formatEuro(amount) {
    return (Number(amount) || 0).toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR"
    });
  }

  function getBarDutyBadgeClass(status) {
    if (status === "nvt" || status === "uitbetaald") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300";
    }
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300";
  }

  function buildEmptyDraft(todayStr, defaults) {
    const norm = normalizeInvoiceDefaults(defaults);
    const initialLines =
      norm.presetLines.length > 0
        ? norm.presetLines.map((l, idx) => ({
            ...l,
            id: `inv-line-${Date.now()}-${idx}`
          }))
        : [normalizeLineItem({ subject: "", quantity: 1, total: 0 }, 0)];

    return {
      id: null,
      invoiceNumber: `INV-${todayStr.replace(/-/g, "")}-${String(Math.floor(Math.random() * 900) + 100)}`,
      clientName: "",
      issueDate: todayStr,
      dueDate: todayStr,
      status: "open",
      barDutyStatus: "open",
      paymentLink: norm.defaultPaymentLink || "",
      notes: "",
      lines: initialLines
    };
  }

  function FocusFlowInvoicesSection({
    invoices = [],
    invoiceDefaults = DEFAULT_INVOICE_DEFAULTS,
    todayStr,
    accent,
    onSaveInvoice,
    onDeleteInvoice,
    onUpdateInvoiceQuick,
    onSaveDefaults,
    onShowToast
  }) {
    const normalizedDefaults = useMemo(
      () => normalizeInvoiceDefaults(invoiceDefaults),
      [invoiceDefaults]
    );

    const [editorOpen, setEditorOpen] = useState(false);
    const [isNewInvoice, setIsNewInvoice] = useState(true);
    const [draft, setDraft] = useState(() => buildEmptyDraft(todayStr, normalizedDefaults));

    const [defaultsModalOpen, setDefaultsModalOpen] = useState(false);
    const [defaultsDraft, setDefaultsDraft] = useState(() => normalizedDefaults);

    const closeEditorWithoutSave = useCallback(() => {
      setEditorOpen(false);
    }, []);

    const closeDefaultsWithoutSave = useCallback(() => {
      setDefaultsModalOpen(false);
    }, []);

    useEffect(() => {
      if (!editorOpen && !defaultsModalOpen) return;
      function onKeyDown(e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        if (defaultsModalOpen) {
          closeDefaultsWithoutSave();
        } else if (editorOpen) {
          closeEditorWithoutSave();
        }
      }
      window.addEventListener("keydown", onKeyDown, true);
      return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [editorOpen, defaultsModalOpen, closeEditorWithoutSave, closeDefaultsWithoutSave]);

    function openNewInvoiceModal() {
      setDraft(buildEmptyDraft(todayStr, normalizedDefaults));
      setIsNewInvoice(true);
      setEditorOpen(true);
    }

    function openEditInvoiceModal(inv) {
      setDraft({
        ...inv,
        lines:
          Array.isArray(inv.lines) && inv.lines.length > 0
            ? inv.lines.map((l, idx) => normalizeLineItem(l, idx))
            : [normalizeLineItem({}, 0)],
        barDutyStatus: inv.barDutyStatus || "open",
        paymentLink: inv.paymentLink || ""
      });
      setIsNewInvoice(false);
      setEditorOpen(true);
    }

    function openDefaultsModal() {
      setDefaultsDraft(normalizeInvoiceDefaults(normalizedDefaults));
      setDefaultsModalOpen(true);
    }

    function handleLineChange(lineId, field, rawVal) {
      setDraft((prev) => ({
        ...prev,
        lines: prev.lines.map((line) => {
          if (line.id !== lineId) return line;
          if (field === "quantity") {
            return { ...line, quantity: Math.max(0, Number(rawVal) || 0) };
          }
          if (field === "total") {
            return { ...line, total: Number(rawVal) || 0 };
          }
          return { ...line, [field]: rawVal };
        })
      }));
    }

    function handleAddDraftLine() {
      setDraft((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          normalizeLineItem({ subject: "", quantity: 1, total: 0 }, prev.lines.length)
        ]
      }));
    }

    function handleRemoveDraftLine(lineId) {
      setDraft((prev) => {
        if (prev.lines.length <= 1) return prev;
        return {
          ...prev,
          lines: prev.lines.filter((l) => l.id !== lineId)
        };
      });
    }

    function handleSubmitInvoice(e) {
      e.preventDefault();
      const totalAmount = calculateInvoiceTotal(draft.lines);
      const nowIso = new Date().toISOString();
      const record = {
        ...draft,
        id: draft.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        invoiceNumber: (draft.invoiceNumber || "").trim() || `INV-${Date.now()}`,
        clientName: (draft.clientName || "").trim(),
        totalAmount,
        updatedAt: nowIso,
        createdAt: draft.createdAt || nowIso
      };
      onSaveInvoice?.(record, isNewInvoice);
      setEditorOpen(false);
    }

    function handleCopyPaymentLink(link) {
      if (!link) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(link)
          .then(() => onShowToast?.("Betaallink gekopieerd"))
          .catch(() => onShowToast?.("Kon betaallink niet kopiëren"));
      } else {
        onShowToast?.(link);
      }
    }

    function handleSaveDefaultsForm(e) {
      e.preventDefault();
      onSaveDefaults?.(normalizeInvoiceDefaults(defaultsDraft));
      setDefaultsModalOpen(false);
    }

    const draftTotal = useMemo(() => calculateInvoiceTotal(draft.lines), [draft.lines]);

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold">Facturen</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Afzender: {normalizedDefaults.senderName} • {invoices.length} facturen totaal
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openDefaultsModal}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Standaardinstellingen
            </button>
            <button
              type="button"
              onClick={openNewInvoiceModal}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent?.primaryBtn || "bg-orange-600 text-white"}`}
            >
              + Nieuwe factuur
            </button>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Nog geen facturen aangemaakt. Klik op &ldquo;+ Nieuwe factuur&rdquo; om te beginnen.
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const total =
                typeof inv.totalAmount === "number"
                  ? inv.totalAmount
                  : calculateInvoiceTotal(inv.lines || []);
              const barStatus = inv.barDutyStatus || "open";
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{inv.invoiceNumber}</span>
                        {inv.clientName && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            • {inv.clientName}
                          </span>
                        )}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {inv.status || "open"}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${getBarDutyBadgeClass(
                            barStatus
                          )}`}
                        >
                          Bardienst: {barStatus}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Datum: {inv.issueDate || todayStr} • Totaal:{" "}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {formatEuro(total)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={barStatus}
                        aria-label="Bardienststatus"
                        onChange={(e) =>
                          onUpdateInvoiceQuick?.(inv.id, { barDutyStatus: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="open">Bardienst: open</option>
                        <option value="nvt">Bardienst: nvt</option>
                        <option value="uitbetaald">Bardienst: uitbetaald</option>
                      </select>

                      <select
                        value={inv.status || "open"}
                        aria-label="Factuurstatus"
                        onChange={(e) =>
                          onUpdateInvoiceQuick?.(inv.id, { status: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="open">Open</option>
                        <option value="verzonden">Verzonden</option>
                        <option value="betaald">Betaald</option>
                      </select>

                      {inv.paymentLink && (
                        <button
                          type="button"
                          onClick={() => handleCopyPaymentLink(inv.paymentLink)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          Kopieer betaallink
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditInvoiceModal(inv)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
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
              );
            })}
          </div>
        )}

        {editorOpen && (
          <div
            onClick={closeEditorWithoutSave}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmitInvoice}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="text-base font-bold">
                  {isNewInvoice ? "Nieuwe factuur" : `Factuur ${draft.invoiceNumber} bewerken`}
                </h3>
                <button
                  type="button"
                  onClick={closeEditorWithoutSave}
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
                      value={draft.invoiceNumber}
                      onChange={(e) => setDraft({ ...draft, invoiceNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Ontvanger / Lid
                    </label>
                    <input
                      type="text"
                      value={draft.clientName}
                      onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Factuurdatum
                    </label>
                    <input
                      type="date"
                      value={draft.issueDate || todayStr}
                      onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Status
                    </label>
                    <select
                      value={draft.status || "open"}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="open">Open</option>
                      <option value="verzonden">Verzonden</option>
                      <option value="betaald">Betaald</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Bardienststatus
                    </label>
                    <select
                      value={draft.barDutyStatus || "open"}
                      onChange={(e) => setDraft({ ...draft, barDutyStatus: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="open">open</option>
                      <option value="nvt">nvt</option>
                      <option value="uitbetaald">uitbetaald</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Factuurregels
                    </span>
                    <button
                      type="button"
                      onClick={handleAddDraftLine}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      + Regel toevoegen
                    </button>
                  </div>

                  <div className="space-y-2">
                    {draft.lines.map((line) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={line.subject}
                          onChange={(e) => handleLineChange(line.id, "subject", e.target.value)}
                          placeholder="Onderwerp"
                          className="col-span-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(line.id, "quantity", e.target.value)}
                          aria-label="Aantal"
                          placeholder="Aantal"
                          className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={line.total}
                          onChange={(e) => handleLineChange(line.id, "total", e.target.value)}
                          aria-label="Totaalprijs"
                          placeholder="Totaalprijs"
                          className="col-span-3 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftLine(line.id)}
                          disabled={draft.lines.length <= 1}
                          aria-label="Regel verwijderen"
                          className="col-span-1 rounded-lg py-1.5 text-center text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end text-sm font-bold">
                    Totaal: {formatEuro(draftTotal)}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Betaallink (optioneel)
                  </label>
                  <input
                    type="url"
                    value={draft.paymentLink || ""}
                    onChange={(e) => setDraft({ ...draft, paymentLink: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeEditorWithoutSave}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent?.primaryBtn || "bg-orange-600 text-white"}`}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        )}

        {defaultsModalOpen && (
          <div
            onClick={closeDefaultsWithoutSave}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveDefaultsForm}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-base font-bold">Standaardinstellingen facturen</h3>
                <button
                  type="button"
                  onClick={closeDefaultsWithoutSave}
                  className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Afzendernaam
                  </label>
                  <input
                    type="text"
                    value={defaultsDraft.senderName}
                    onChange={(e) =>
                      setDefaultsDraft({ ...defaultsDraft, senderName: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Standaard betaallink
                  </label>
                  <input
                    type="url"
                    value={defaultsDraft.defaultPaymentLink}
                    onChange={(e) =>
                      setDefaultsDraft({ ...defaultsDraft, defaultPaymentLink: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDefaultsWithoutSave}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${accent?.primaryBtn || "bg-orange-600 text-white"}`}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    );
  }

  window.FocusFlowInvoices = {
    DEFAULT_INVOICE_DEFAULTS,
    normalizeInvoiceDefaults,
    FocusFlowInvoicesSection
  };
})();
