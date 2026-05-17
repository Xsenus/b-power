type SectionLabelProps = {
  children: string;
  className?: string;
};

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return <p className={`section-label ${className}`.trim()}>[{children}]</p>;
}
