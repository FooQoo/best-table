type ConcernTagsProps = {
  storeId: string;
  tags: string[];
};

export function ConcernTags({ storeId, tags }: ConcernTagsProps) {
  if (tags.length === 0) {
    return (
      <div
        data-testid={`concern-tags-${storeId}`}
        className="text-xs"
        style={{ color: "#79726a" }}
      >
        懸念点は特になし
      </div>
    );
  }

  return (
    <div
      data-testid={`concern-tags-${storeId}`}
      className="flex flex-wrap gap-1.5"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#f5e9d8", color: "#9a6a2a" }}
        >
          ⚠ {tag}
        </span>
      ))}
    </div>
  );
}
