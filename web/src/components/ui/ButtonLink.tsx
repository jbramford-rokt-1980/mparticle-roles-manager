import { Link, type LinkProps } from 'react-router-dom';

import { buttonClasses, type ButtonVariant } from './Button';
import type { ControlSize } from './controlStyles';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ControlSize;
}

/**
 * A navigation action that looks like a Button. Rendered as a link (not a
 * button) so it keeps real anchor behaviour — middle-click, open in a new
 * tab, and a visible target on hover.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
