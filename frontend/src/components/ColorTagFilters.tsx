import type { ColorTagId } from "../constants";
import { COLOR_TAGS } from "../constants";

interface Props {
  activeTags: ColorTagId[];
  onChange: (tags: ColorTagId[]) => void;
}

export default function ColorTagFilters({ activeTags, onChange }: Props) {
  const toggleTag = (tag: ColorTagId) => {
    if (activeTags.includes(tag)) {
      onChange(activeTags.filter((t) => t !== tag));
    } else {
      onChange([...activeTags, tag]);
    }
  };

  return (
    <div className="color-tags">
      {COLOR_TAGS.map((tag) => {
        const active = activeTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={`color-tag color-tag-${tag.id}${active ? " active" : ""}`}
            aria-pressed={active}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
