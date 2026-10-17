import Link from 'next/link';

export function BrandMark() {
  return <span aria-hidden="true" className="brand-symbol"/>;
}

export default function Brand({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return <Link href="/" className={`liftide-brand ${className}`} aria-label="Liftide home" title="Liftide home"><BrandMark/>{!compact && <span className="brand-word">liftide<span className="brand-dot">.</span></span>}</Link>;
}
