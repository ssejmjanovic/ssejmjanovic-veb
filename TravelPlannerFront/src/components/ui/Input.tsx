import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  isTextArea?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isTextArea,
  className = '',
  ...props
}) => {
  const inputClass = "w-full px-4 py-2.5 text-ink text-sm font-body input-aero placeholder:text-chrome-dark/60 focus:outline-none";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="font-display text-xs font-bold text-sky-deep uppercase tracking-widest">
        {label}
      </label>
      {isTextArea ? (
        <textarea
          className={`${inputClass} resize-y min-h-[90px]`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={inputClass}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className="text-xs font-body text-red-500">{error}</span>}
    </div>
  );
};