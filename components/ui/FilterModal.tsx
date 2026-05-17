'use client';

import type { ReactNode } from 'react';
import { HiCheckCircle, HiSearch } from 'react-icons/hi';
import { Button, type ButtonProps } from './Button';
import { Input, type InputProps } from './Input';
import { Modal } from './Modal';

export interface FilterModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FilterModal({
  show,
  onClose,
  title = 'フィルター',
  headerAction,
  children,
  footer,
  className = '',
}: FilterModalProps) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      contentClassName={`bg-overlay rounded-2xl shadow-xl overflow-hidden w-full max-w-sm border border-edge ${className}`}
    >
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {headerAction}
        </div>
        {children}
        {footer && <div className="flex gap-3">{footer}</div>}
      </div>
    </Modal>
  );
}

export interface FilterSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FilterSection({ label, children, className = '' }: FilterSectionProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <p className="text-xs font-medium text-ink-sub uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

export interface FilterSearchInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function FilterSearchInput({
  value,
  onChange,
  placeholder = '検索...',
  className = '',
  ...props
}: FilterSearchInputProps) {
  return (
    <div className="relative">
      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted z-10" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pl-10 !py-2 !text-sm !min-h-[40px] ${className}`}
        {...props}
      />
    </div>
  );
}

export interface FilterOptionButtonProps extends ButtonProps {
  selected?: boolean;
}

export function FilterOptionButton({
  selected = false,
  className = '',
  children,
  ...props
}: FilterOptionButtonProps) {
  return (
    <Button
      variant={selected ? 'ghost' : 'surface'}
      size="sm"
      className={`flex-1 !rounded-lg !px-3 !py-2 gap-1.5 justify-center ${
        selected ? '!bg-spot !text-white !border-spot' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

export interface FilterSortOptionProps extends ButtonProps {
  selected?: boolean;
  icon?: ReactNode;
}

export function FilterSortOption({
  selected = false,
  icon,
  className = '',
  children,
  ...props
}: FilterSortOptionProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`!min-h-0 w-full !justify-start !px-3 !py-2 !text-sm !rounded-lg gap-2 [-webkit-tap-highlight-color:transparent] ${
        selected
          ? '!bg-spot-surface !text-spot !font-bold !border !border-spot/30 shadow-sm active:!bg-spot-surface'
          : '!border !border-transparent !text-ink-sub hover:!bg-ground active:!bg-ground'
      } ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {selected && <HiCheckCircle className="h-4 w-4 text-spot ml-auto" />}
    </Button>
  );
}
