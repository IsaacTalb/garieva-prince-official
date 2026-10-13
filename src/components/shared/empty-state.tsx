export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><span className="edition-mark" aria-hidden="true">GP</span><h2>{title}</h2><p>{description}</p></div>;
}
