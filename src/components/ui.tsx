import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-cere text-falcon hover:brightness-95',
  secondary: 'border border-line bg-surface text-ink hover:border-muted',
  quiet: 'text-ink underline-offset-4 hover:underline',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-surface',
};

export function Button({
  variant = 'secondary',
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
      <h1 className="font-display text-[2rem] leading-tight font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-1 max-w-[60ch] text-muted">{intro}</p>}
    </header>
  );
}
