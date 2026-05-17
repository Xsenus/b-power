import { brandVariant } from '../../utils/text';

type SectionLabelProps = {
  children: string;
  className?: string;
};

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return <p className={`section-label ${className}`.trim()}>[{brandVariant(children)}]</p>;
}
