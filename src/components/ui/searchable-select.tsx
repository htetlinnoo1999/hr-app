import ReactSelect from "react-select"

import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  /** Selected option value, or "" for none. */
  value: string
  onChange: (value: string) => void
  /** Maps to the rendered input's id so an external <label htmlFor> works. */
  inputId?: string
  placeholder?: string
  isClearable?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  className?: string
}

/**
 * Single-select dropdown with type-to-search, built on react-select in
 * `unstyled` mode so it matches the native <Select>/<Input> design tokens and
 * stays theme-aware. The menu is portaled to <body> to avoid being clipped by
 * card/overflow containers.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  inputId,
  placeholder = "Select…",
  isClearable = true,
  isDisabled,
  isLoading,
  className,
}: SearchableSelectProps) {
  const selected = options.find((o) => o.value === value) ?? null

  return (
    <ReactSelect<SearchableSelectOption>
      unstyled
      inputId={inputId}
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : "")}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isLoading={isLoading}
      placeholder={placeholder}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 50 }) }}
      className={className}
      classNames={{
        control: (state) =>
          cn(
            "flex min-h-9 w-full items-center rounded-lg border bg-background pl-3 pr-1 text-sm shadow-xs transition-[color,box-shadow] dark:bg-input/30",
            state.isFocused ? "border-ring ring-3 ring-ring/50" : "border-input",
            state.isDisabled && "pointer-events-none opacity-50",
          ),
        valueContainer: () => "gap-1 py-1",
        placeholder: () => "text-muted-foreground",
        input: () => "text-foreground [&_input:focus]:ring-0",
        singleValue: () => "text-foreground",
        indicatorsContainer: () => "gap-0.5",
        dropdownIndicator: () =>
          "px-1 text-muted-foreground [&>svg]:size-4 hover:text-foreground",
        clearIndicator: () =>
          "px-1 text-muted-foreground [&>svg]:size-4 hover:text-foreground",
        indicatorSeparator: () => "hidden",
        loadingIndicator: () => "px-1 text-muted-foreground",
        menu: () =>
          "mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
        menuList: () => "py-1",
        option: (state) =>
          cn(
            "cursor-pointer px-3 py-1.5 text-sm",
            state.isFocused && "bg-muted",
            state.isSelected && "bg-primary text-primary-foreground",
          ),
        noOptionsMessage: () => "px-3 py-2 text-sm text-muted-foreground",
      }}
    />
  )
}
