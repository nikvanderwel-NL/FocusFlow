(() => {
  const PROJECTS = [
    { id: "werk", label: "Werk", color: "blue" },
    { id: "verburch", label: "Verburch", color: "orange" },
    { id: "persoonlijk", label: "Persoonlijk", color: "emerald" }
  ];

  const ACCENT_BY_PROJECT = {
    werk: {
      primaryBtn: "bg-blue-600 hover:bg-blue-700 text-white",
      activeTab: "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400",
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
      borderHover: "hover:border-blue-300 dark:hover:border-blue-700",
      selectedDay: "border-blue-600 bg-blue-600 text-white shadow-sm",
      undoBtn:
        "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60",
      focusRing: "focus:border-blue-500"
    },
    verburch: {
      primaryBtn: "bg-orange-600 hover:bg-orange-700 text-white",
      activeTab: "bg-white text-orange-600 shadow-sm dark:bg-slate-900 dark:text-orange-400",
      badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
      borderHover: "hover:border-orange-300 dark:hover:border-orange-700",
      selectedDay: "border-orange-600 bg-orange-600 text-white shadow-sm",
      undoBtn:
        "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/60",
      focusRing: "focus:border-orange-500"
    },
    persoonlijk: {
      primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      activeTab: "bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      borderHover: "hover:border-emerald-300 dark:hover:border-emerald-700",
      selectedDay: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
      undoBtn:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60",
      focusRing: "focus:border-emerald-500"
    }
  };

  const DEFAULT_ACCENT = {
    primaryBtn: "bg-purple-600 hover:bg-purple-700 text-white",
    activeTab: "bg-white text-purple-600 shadow-sm dark:bg-slate-900 dark:text-purple-400",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    borderHover: "hover:border-purple-300 dark:hover:border-purple-700",
    selectedDay: "border-purple-600 bg-purple-600 text-white shadow-sm",
    undoBtn:
      "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900/60",
    focusRing: "focus:border-purple-500"
  };

  function getAccentClasses(projectId) {
    return ACCENT_BY_PROJECT[projectId] || DEFAULT_ACCENT;
  }

  function getProjectBadgeClasses(projectId) {
    if (projectId === "werk") {
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300";
    }
    if (projectId === "verburch") {
      return "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300";
    }
    if (projectId === "persoonlijk") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300";
    }
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  function getProjectLabel(projectId) {
    return PROJECTS.find((p) => p.id === projectId)?.label || "Werk";
  }

  function FocusFlowMark({ className = "h-4 w-4" }) {
    return (
      <svg
        className={className}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 35l8 8 24-24"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 45c7-1 13-6 16-14"
          stroke="currentColor"
          strokeOpacity="0.85"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M43 30l6 1-1 6"
          stroke="currentColor"
          strokeOpacity="0.85"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function DailySunIcon({ active = false, className = "h-4 w-4" }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? "2.2" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" fill={active ? "currentColor" : "none"} />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2.5 12h2.2M19.3 12h2.2M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
      </svg>
    );
  }

  function EditPencilIcon({ className = "h-4 w-4" }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        <path d="M19.5 7.125L16.875 4.5" />
      </svg>
    );
  }

  function DeleteTrashIcon({ className = "h-4 w-4" }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h16" />
        <path d="M9.5 7V5a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0114.5 5v2" />
        <path d="M6.5 7l.8 11.5A2 2 0 009.3 20.3h5.4a2 2 0 002-1.8L17.5 7" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    );
  }

  window.FocusFlowUI = {
    PROJECTS,
    getAccentClasses,
    getProjectBadgeClasses,
    getProjectLabel,
    FocusFlowMark,
    DailySunIcon,
    EditPencilIcon,
    DeleteTrashIcon
  };
})();
