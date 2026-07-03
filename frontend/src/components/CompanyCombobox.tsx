import { useEffect, useId, useRef, useState } from "react";

interface Props {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CompanyCombobox({
  value,
  options,
  onChange,
  placeholder,
  required,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((name) => name.toLowerCase().includes(query))
    : options;
  const exactMatch = options.some((name) => name.toLowerCase() === query);
  const showNewOption = query.length > 0 && !exactMatch;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="combobox" ref={rootRef}>
      <input
        className="combobox-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && (filtered.length > 0 || showNewOption) && (
        <ul className="combobox-dropdown" id={listId} role="listbox">
          {filtered.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="combobox-option"
                role="option"
                aria-selected={name === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue(name)}
              >
                {name}
              </button>
            </li>
          ))}
          {showNewOption && (
            <li>
              <button
                type="button"
                className="combobox-option combobox-option-new"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectValue(value.trim())}
              >
                Aggiungi &quot;{value.trim()}&quot;
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
