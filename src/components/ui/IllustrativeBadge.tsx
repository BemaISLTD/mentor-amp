export function IllustrativeBadge({ label = 'Illustrative Model' }: { label?: string }) {
  return (
    <span
      className="illustrative-badge"
      title="Uses contractual minimum guarantees and illustrative decrement assumptions. Not certified for statutory NAIC Model #805 or VM-22 reporting."
    >
      {label}
    </span>
  )
}
