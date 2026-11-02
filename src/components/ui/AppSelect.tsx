import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

export type AppSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type AppSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  disabled?: boolean
  required?: boolean
}

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione',
  id,
  name,
  className,
  disabled,
  required,
  ...ariaProps
}: AppSelectProps) {
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedValue = selectedIndex < 0 ? '' : String(selectedIndex)

  return (
    <Select.Root
      value={selectedValue}
      onValueChange={(index) => {
        const selected = options[Number(index)]
        if (selected) onValueChange(selected.value)
      }}
      disabled={disabled}
      required={required}
      name={name}
    >
      <Select.Trigger
        id={id}
        className={`app-select__trigger${className ? ` ${className}` : ''}`}
        aria-label={ariaProps['aria-label']}
        aria-labelledby={ariaProps['aria-labelledby']}
        aria-describedby={ariaProps['aria-describedby']}
        aria-invalid={ariaProps['aria-invalid']}
        title={selectedIndex < 0 ? placeholder : options[selectedIndex].label}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="app-select__icon" aria-hidden="true">
          <ChevronDown size={17} strokeWidth={1.8} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="app-select__content"
          position="popper"
          side="bottom"
          sideOffset={8}
          align="start"
          alignOffset={0}
          collisionPadding={12}
          avoidCollisions
        >
          <Select.ScrollUpButton className="app-select__scroll-button" aria-label="Rolar opções para cima">
            <ChevronUp size={15} aria-hidden="true" />
          </Select.ScrollUpButton>
          <Select.Viewport className="app-select__viewport">
            {options.map((option, index) => (
              <Select.Item
                key={`${option.value}:${index}`}
                value={String(index)}
                disabled={option.disabled}
                className="app-select__item"
                textValue={option.label}
                title={option.label}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="app-select__item-indicator">
                  <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="app-select__scroll-button" aria-label="Rolar opções para baixo">
            <ChevronDown size={15} aria-hidden="true" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
