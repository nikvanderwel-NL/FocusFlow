(() => {
  const { useEffect, useRef } = React;

  function toDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateStr(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function addDaysStr(dateStr, days) {
    const base = parseDateStr(dateStr) || new Date();
    base.setDate(base.getDate() + days);
    return toDateStr(base);
  }

  function addMonthsStr(dateStr, months) {
    const base = parseDateStr(dateStr) || new Date();
    const targetDay = base.getDate();
    base.setDate(1);
    base.setMonth(base.getMonth() + months);
    const maxDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(targetDay, maxDay));
    return toDateStr(base);
  }

  function computeNextDueDate(task, completedDateStr) {
    const rec = task.recurrence;
    if (!rec || rec.type === "none") return null;

    const mode = rec.mode || "from_completion";
    const anchorStr = mode === "from_due" && task.targetDate ? task.targetDate : completedDateStr;

    if (rec.type === "daily") return addDaysStr(anchorStr, 1);
    if (rec.type === "weekdays") {
      let candidate = addDaysStr(anchorStr, 1);
      while ([0, 6].includes(parseDateStr(candidate).getDay())) {
        candidate = addDaysStr(candidate, 1);
      }
      return candidate;
    }
    if (rec.type === "weekly") return addDaysStr(anchorStr, 7);
    if (rec.type === "biweekly") return addDaysStr(anchorStr, 14);
    if (rec.type === "monthly") return addMonthsStr(anchorStr, 1);
    if (rec.type === "custom") {
      const interval = Math.max(1, Number(rec.interval) || 1);
      const unit = rec.unit || "days";
      if (unit === "days") return addDaysStr(anchorStr, interval);
      if (unit === "weeks") return addDaysStr(anchorStr, interval * 7);
      if (unit === "months") return addMonthsStr(anchorStr, interval);
    }
    return addDaysStr(anchorStr, 7);
  }

  function formatRecurrenceLabel(rec) {
    if (!rec || rec.type === "none") return "";
    const modeSuffix = rec.mode === "from_due" ? " (vaste cadans)" : " (vanaf afronden)";
    if (rec.type === "daily") return "Dagelijks" + modeSuffix;
    if (rec.type === "weekdays") return "Werkdagen (ma–vr)" + modeSuffix;
    if (rec.type === "weekly") return "Wekelijks" + modeSuffix;
    if (rec.type === "biweekly") return "Elke 2 weken" + modeSuffix;
    if (rec.type === "monthly") return "Maandelijks" + modeSuffix;
    if (rec.type === "custom") {
      const n = Math.max(1, Number(rec.interval) || 1);
      const unitMap = {
        days: n === 1 ? "dag" : "dagen",
        weeks: n === 1 ? "week" : "weken",
        months: n === 1 ? "maand" : "maanden"
      };
      return `Elke ${n} ${unitMap[rec.unit || "days"]}` + modeSuffix;
    }
    return "";
  }

  function formatDutchDate(dateStr, todayStr) {
    if (!dateStr) return "Geen datum";
    const tomorrowStr = addDaysStr(todayStr, 1);
    const yesterdayStr = addDaysStr(todayStr, -1);
    if (dateStr === todayStr) return "Vandaag";
    if (dateStr === tomorrowStr) return "Morgen";
    if (dateStr === yesterdayStr) return "Gisteren";

    const d = parseDateStr(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function formatFullDutchDate(dateStr) {
    const d = parseDateStr(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatDateTimeNL(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatTimeOnlyNL(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function isSafeImageSrc(src) {
    if (!src || typeof src !== "string") return false;
    const trimmed = src.trim();
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed)) return true;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function markdownToEditorHtml(mdText = "") {
    if (!mdText) return "";
    const lines = mdText.replace(/\r\n/g, "\n").split("\n");
    const htmlParts = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
    };

    const formatInline = (str) => {
      const imgRegex = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
      let result = "";
      let lastIndex = 0;
      let match;
      while ((match = imgRegex.exec(str)) !== null) {
        result += escapeHtml(str.slice(lastIndex, match.index));
        const alt = escapeHtml(match[1] || "Afbeelding");
        const url = match[2];
        if (isSafeImageSrc(url)) {
          result += `<img src="${escapeHtml(url)}" alt="${alt}" />`;
        } else {
          result += escapeHtml(match[0]);
        }
        lastIndex = imgRegex.lastIndex;
      }
      result += escapeHtml(str.slice(lastIndex));
      return result;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        closeLists();
        continue;
      }

      const h3Match = line.match(/^###\s+(.*)$/);
      const h2Match = line.match(/^##\s+(.*)$/);
      const h1Match = line.match(/^#\s+(.*)$/);
      const ulMatch = line.match(/^[-*]\s+(.*)$/);
      const olMatch = line.match(/^\d+\.\s+(.*)$/);

      if (h1Match) {
        closeLists();
        htmlParts.push(`<h1>${formatInline(h1Match[1])}</h1>`);
      } else if (h2Match) {
        closeLists();
        htmlParts.push(`<h2>${formatInline(h2Match[1])}</h2>`);
      } else if (h3Match) {
        closeLists();
        htmlParts.push(`<h3>${formatInline(h3Match[1])}</h3>`);
      } else if (ulMatch) {
        if (!inUl) {
          closeLists();
          htmlParts.push("<ul>");
          inUl = true;
        }
        htmlParts.push(`<li>${formatInline(ulMatch[1])}</li>`);
      } else if (olMatch) {
        if (!inOl) {
          closeLists();
          htmlParts.push("<ol>");
          inOl = true;
        }
        htmlParts.push(`<li>${formatInline(olMatch[1])}</li>`);
      } else {
        closeLists();
        htmlParts.push(`<p>${formatInline(line)}</p>`);
      }
    }

    closeLists();
    return htmlParts.join("");
  }

  function editorElementToMarkdown(el) {
    if (!el) return "";
    const blocks = [];

    const walkNode = (node, listContext = null) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();
      if (tag === "img") {
        const src = node.getAttribute("src") || "";
        const alt = (node.getAttribute("alt") || "Afbeelding").replace(/\]/g, "");
        return isSafeImageSrc(src) ? `![${alt}](${src})` : "";
      }
      if (tag === "br") return "";

      if (tag === "ul") {
        const items = [];
        Array.from(node.children).forEach((child) => {
          if (child.tagName.toLowerCase() === "li") {
            const txt = walkNode(child, "ul").trim();
            if (txt) items.push(`- ${txt}`);
          }
        });
        if (items.length) blocks.push(items.join("\n"));
        return "";
      }

      if (tag === "ol") {
        const items = [];
        let counter = 1;
        Array.from(node.children).forEach((child) => {
          if (child.tagName.toLowerCase() === "li") {
            const txt = walkNode(child, "ol").trim();
            if (txt) {
              items.push(`${counter}. ${txt}`);
              counter += 1;
            }
          }
        });
        if (items.length) blocks.push(items.join("\n"));
        return "";
      }

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const prefix = tag === "h1" ? "# " : tag === "h2" ? "## " : "### ";
        const inner = Array.from(node.childNodes)
          .map((c) => walkNode(c, listContext))
          .join("")
          .trim();
        if (inner) blocks.push(`${prefix}${inner}`);
        return "";
      }

      if (tag === "p" || tag === "div") {
        const imgs = Array.from(node.querySelectorAll("img"));
        const nonImgText = Array.from(node.childNodes)
          .filter((c) => !(c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() === "img"))
          .map((c) => walkNode(c, listContext))
          .join("")
          .trim();

        if (nonImgText) {
          const hMatch = nonImgText.match(/^(#{1,3})\s+(.*)$/);
          const ulMatch = nonImgText.match(/^[-*]\s+(.*)$/);
          const olMatch = nonImgText.match(/^(\d+)\.\s+(.*)$/);
          if (hMatch) {
            blocks.push(`${hMatch[1]} ${hMatch[2]}`);
          } else if (ulMatch) {
            blocks.push(`- ${ulMatch[1]}`);
          } else if (olMatch) {
            blocks.push(`${olMatch[1]}. ${olMatch[2]}`);
          } else {
            blocks.push(nonImgText);
          }
        }
        imgs.forEach((imgEl) => {
          const mdImg = walkNode(imgEl, listContext);
          if (mdImg) blocks.push(mdImg);
        });
        return "";
      }

      return Array.from(node.childNodes)
        .map((c) => walkNode(c, listContext))
        .join("");
    };

    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent || "").trim();
        if (t) blocks.push(t);
      } else {
        walkNode(child, null);
      }
    });

    return blocks.join("\n").trim();
  }

  function hasMarkdownContent(notes) {
    return Boolean(notes && notes.trim().length > 0);
  }

  function DirectMarkdownEditor({ value, onChange, onSaveShortcut }) {
    const editorRef = useRef(null);
    const lastValueRef = useRef(null);

    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      if (value !== lastValueRef.current) {
        el.innerHTML = markdownToEditorHtml(value || "");
        lastValueRef.current = value || "";
      }
    }, [value]);

    const syncFromDom = () => {
      const el = editorRef.current;
      if (!el) return;
      const nextMd = editorElementToMarkdown(el);
      lastValueRef.current = nextMd;
      onChange(nextMd);
    };

    const applyInlineMarkdownPattern = (el) => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;

      let block = range.startContainer;
      if (block.nodeType === Node.TEXT_NODE) block = block.parentElement;
      while (block && block !== el && !["P", "DIV", "LI", "H1", "H2", "H3"].includes(block.tagName)) {
        block = block.parentElement;
      }
      if (!block || block === el || block.tagName === "LI") return;

      const textBefore = block.textContent || "";
      const hMatch = textBefore.match(/^(#{1,3})\s$/);
      const ulMatch = textBefore.match(/^[-*]\s$/);
      const olMatch = textBefore.match(/^1\.\s$/);

      let replacement = null;
      if (hMatch) {
        replacement = document.createElement(`h${hMatch[1].length}`);
      } else if (ulMatch) {
        replacement = document.createElement("ul");
        const li = document.createElement("li");
        li.innerHTML = "<br>";
        replacement.appendChild(li);
      } else if (olMatch) {
        replacement = document.createElement("ol");
        const li = document.createElement("li");
        li.innerHTML = "<br>";
        replacement.appendChild(li);
      }

      if (!replacement) return;
      if (replacement.tagName !== "UL" && replacement.tagName !== "OL") {
        replacement.innerHTML = "<br>";
      }
      block.replaceWith(replacement);
      const targetFocusNode =
        replacement.tagName === "UL" || replacement.tagName === "OL"
          ? replacement.firstElementChild
          : replacement;
      const r = document.createRange();
      r.setStart(targetFocusNode, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      syncFromDom();
    };

    const insertImageIntoEditor = (src, alt = "Afbeelding") => {
      if (!isSafeImageSrc(src)) return;
      const el = editorRef.current;
      if (!el) return;
      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;

      const spacer = document.createElement("p");
      spacer.innerHTML = "<br>";

      const sel = window.getSelection();
      if (sel && sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.insertNode(spacer);
        range.setStart(spacer, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        el.appendChild(img);
        el.appendChild(spacer);
      }
      syncFromDom();
    };

    const handlePaste = (e) => {
      const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
      const imageItem = items.find((item) => item.type && item.type.startsWith("image/"));

      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (typeof ev.target?.result === "string") {
            insertImageIntoEditor(ev.target.result, file.name || "Geplakt plaatje");
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      const pastedText = (e.clipboardData?.getData("text/plain") || "").trim();
      if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(pastedText)) {
        e.preventDefault();
        insertImageIntoEditor(pastedText, "Afbeelding");
      }
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        syncFromDom();
        onSaveShortcut?.();
        return;
      }
      if (e.key === " ") {
        setTimeout(() => applyInlineMarkdownPattern(editorRef.current), 0);
      }
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncFromDom}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder="Typ notities, gebruik # voor koppen, - of 1. voor lijsten en plak plaatjes direct..."
        className="ff-notes-editor min-h-[150px] max-h-72 overflow-y-auto w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    );
  }

  window.FocusFlowDatesMarkdown = {
    toDateStr,
    parseDateStr,
    addDaysStr,
    addMonthsStr,
    computeNextDueDate,
    formatRecurrenceLabel,
    formatDutchDate,
    formatFullDutchDate,
    formatDateTimeNL,
    formatTimeOnlyNL,
    markdownToEditorHtml,
    editorElementToMarkdown,
    hasMarkdownContent,
    DirectMarkdownEditor
  };
})();
