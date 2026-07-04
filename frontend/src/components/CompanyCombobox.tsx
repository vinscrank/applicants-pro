import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  id?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CompanyCombobox({
  id,
  value,
  options,
  onChange,
  placeholder,
  required,
}: Props) {
  const listId = useId();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const userIntentRef = useRef(false);
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((name) => name.toLowerCase().includes(query))
    : options;
  const exactMatch = options.some((name) => name.toLowerCase() === query);
  const showNewOption = query.length > 0 && !exactMatch;

  useEffect(() => {
    setOpen(false);
  }, [value]);

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
        id={id}
        className="combobox-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onPointerDown={() => {
          userIntentRef.current = true;
        }}
        onFocus={() => {
          if (userIntentRef.current) {
            setOpen(true);
            userIntentRef.current = false;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
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
                {t("candidature.form.comboboxAdd", { value: value.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
