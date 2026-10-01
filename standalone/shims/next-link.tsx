// Replacement for next/link in the standalone (file://) build. Renders a
// plain anchor targeting the hash router so navigation works with no server.
import * as React from "react";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, prefetch: _p, replace: _r, scroll: _s, children, ...rest },
  ref,
) {
  const isInternal = href.startsWith("/");
  const target = isInternal ? `#${href}` : href;
  return (
    <a ref={ref} href={target} {...rest}>
      {children}
    </a>
  );
});

export default Link;
