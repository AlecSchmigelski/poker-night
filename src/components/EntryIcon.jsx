// Three candidate sets for the log's entry types. Muted by default: brass means
// "touch this" and green/red describe money, so a non-interactive marker gets
// neither.

const SETS = {
  // Direction into and out of a tray. One chevron in, two for more, one out.
  flow: {
    buyin: (
      <>
        <path d="M12 3v9" />
        <path d="M8.5 8.5 12 12l3.5-3.5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
    ),
    addon: (
      <>
        <path d="M8.5 4 12 7.5 15.5 4" />
        <path d="M8.5 9 12 12.5 15.5 9" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
    ),
    cashout: (
      <>
        <path d="M12 12V3" />
        <path d="M8.5 6.5 12 3l3.5 3.5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
    ),
  },

  // Clay chips, the app's own visual language.
  chips: {
    buyin: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2" />
      </>
    ),
    addon: (
      <>
        <circle cx="9.5" cy="14" r="6" />
        <path d="M14.2 9.6A6 6 0 0 0 9.6 5" />
        <path d="M17.5 4.5v5M15 7h5" />
      </>
    ),
    cashout: (
      <>
        <circle cx="9" cy="12" r="6.5" />
        <path d="M14.5 12h6" />
        <path d="M18 9.5 20.5 12 18 14.5" />
      </>
    ),
  },

  // Badge style: the mark sits inside a ring, same footprint every time.
  badge: {
    buyin: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    ),
    addon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 13.5 12 10l3.5 3.5" />
        <path d="M8.5 9.5 12 6l3.5 3.5" opacity="0.55" />
      </>
    ),
    cashout: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12h7M13 9.5l2.5 2.5-2.5 2.5" />
      </>
    ),
  },
}

export function EntryIcon({ kind, set = 'flow', title }) {
  const paths = SETS[set]?.[kind]
  if (!paths) return null
  return (
    <svg
      className="entry-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
    >
      {paths}
    </svg>
  )
}
