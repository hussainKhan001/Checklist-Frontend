// Shared loading placeholders — shaped like the real cards/tiles they stand in
// for, so the page doesn't jump/reflow once data arrives, and the transition
// from skeleton to real content is a smooth fade rather than a jarring swap.

export function SkeletonBar({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

// Matches SelectProject / SelectTrade / SelectLocation-style cards: badge row,
// title, two lines of description.
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="h-4 w-4 rounded-full" />
      </div>
      <SkeletonBar className="h-4 w-3/5 mb-2" />
      <SkeletonBar className="h-3 w-full mb-1.5" />
      <SkeletonBar className="h-3 w-4/5" />
    </div>
  )
}

// Matches SelectFloor / SelectElementForTrade-style small square tiles.
export function SkeletonTile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl aspect-square p-4">
      <SkeletonBar className="h-5 w-8" />
      <SkeletonBar className="h-2.5 w-12" />
    </div>
  )
}

// Matches a flat list row (e.g. project-level areas, room rows).
export function SkeletonRow() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <SkeletonBar className="h-4 w-2/5 mb-2" />
        <SkeletonBar className="h-3 w-1/4" />
      </div>
      <SkeletonBar className="h-4 w-4 rounded-full flex-shrink-0 ml-3" />
    </div>
  )
}

// Matches a ChecklistForm checkpoint card: title + OK/Not-OK/photo button row.
export function SkeletonChecklistRow() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
        <SkeletonBar className="h-4 w-2/3" />
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <SkeletonBar className="h-8 w-16 rounded-lg" />
        <SkeletonBar className="h-8 w-20 rounded-lg" />
        <SkeletonBar className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

const VARIANTS = { card: SkeletonCard, tile: SkeletonTile, row: SkeletonRow, checklistRow: SkeletonChecklistRow }

export default function SkeletonGrid({ variant = 'card', count = 6, cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' }) {
  const Item = VARIANTS[variant] || SkeletonCard
  return (
    <div className={`grid ${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => <Item key={i} />)}
    </div>
  )
}
