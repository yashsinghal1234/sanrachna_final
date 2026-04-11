export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-[color:var(--color-text_secondary)]">{description}</p>
    </div>
  )
}

