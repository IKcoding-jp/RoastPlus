'use client';

import { forwardRef, useId } from 'react';

/**
 * 数値入力専用コンポーネント
 *
 * @example
 * // 基本的な使用方法
 * <NumberInput
 *   label="幅"
 *   value={width}
 *   onChange={(e) => setWidth(parseInt(e.target.value))}
 *   suffix="px"
 * />
 *
 * @example
 * // 最小値・最大値の設定
 * <NumberInput
 *   label="高さ"
 *   value={height}
 *   onChange={(e) => setHeight(parseInt(e.target.value))}
 *   min={40}
 *   max={200}
 *   suffix="px"
 * />
 */

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 入力フィールドのラベル */
  label?: string;
  /** 単位などの接尾辞 */
  suffix?: string;
  /** エラーメッセージ */
  error?: string;
  /** 数値の揃え方（デフォルト center）。フォームでは right が読みやすい */
  align?: 'left' | 'center' | 'right';
  /** ラベルへ追加するクラス（良品=青/不良品=赤 などの色分け用） */
  labelClassName?: string;
  /** suffix を枠の内側（右端）に収める。フォームを洗練させたいときに使う */
  suffixInside?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { label, suffix, error, align = 'center', labelClassName = '', suffixInside = false, className = '', id, ...props },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const hasInsideSuffix = Boolean(suffix && suffixInside);

    const alignStyles = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
    // 入力部品の統一寸法（Input / Select と揃える）。py-3・影なしのフラット。
    const baseStyles = `rounded-lg border-2 px-4 py-3 text-lg transition-all duration-200 min-h-[44px] ${alignStyles}`;

    const themeStyles =
      'bg-field border-edge text-ink placeholder:text-ink-muted hover:border-edge-strong focus:border-spot focus:bg-field focus:outline-none focus:ring-2 focus:ring-spot-subtle';

    const errorStyles = 'border-error focus:border-error focus:ring-error-ring';

    const disabledStyles = 'opacity-50 cursor-not-allowed';

    // 枠内 suffix のときは右側に単位ぶんの余白を確保する
    const widthStyles = hasInsideSuffix ? 'w-full pr-10' : suffix ? 'min-w-0 flex-1' : 'w-full';

    const inputStyles = [
      baseStyles,
      themeStyles,
      error ? errorStyles : '',
      props.disabled ? disabledStyles : '',
      widthStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // 色分け指定があればそれを優先。なければ既定の text-ink。
    const labelStyles = `block text-sm font-medium mb-2 ${labelClassName || 'text-ink'}`;

    const suffixStyles = hasInsideSuffix
      ? 'pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-ink-sub'
      : 'text-ink-sub font-bold ml-2';

    const errorTextStyles = 'text-error text-sm mt-1';

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className={hasInsideSuffix ? 'relative' : 'flex items-center'}>
          <input
            ref={ref}
            id={inputId}
            type="number"
            className={inputStyles}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {suffix && <span className={suffixStyles}>{suffix}</span>}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={errorTextStyles} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
