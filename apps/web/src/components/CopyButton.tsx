import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  label?: string;
  variant?: 'dark' | 'light' | 'ghost';
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  variant = 'dark',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const baseStyles =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#697565] cursor-pointer select-none';

  const variantStyles =
    variant === 'dark'
      ? copied
        ? 'bg-[#697565] text-[#ECDFCC] border border-[#697565]'
        : 'bg-[#181C14] text-[#ECDFCC] hover:bg-[#3C3D37] border border-[#3C3D37]'
      : variant === 'light'
        ? copied
          ? 'bg-[#697565] text-[#ECDFCC] border border-[#697565]'
          : 'bg-[#ECDFCC] text-[#181C14] hover:bg-[#E2D3BC] border border-[#181C14]/20'
        : copied
          ? 'bg-[#697565]/25 text-[#ECDFCC] border border-[#697565]'
          : 'bg-transparent text-[#ECDFCC]/85 hover:text-[#ECDFCC] hover:bg-[#ECDFCC]/10 border border-[#ECDFCC]/20';

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${label}: ${value}`}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
