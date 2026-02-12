import type { ReactNode } from "react";
import classNames from "classnames";

type NavLinkProps = {
    href: string;
    current?: boolean;
    children: ReactNode;
};

export default function NavLink({
    href,
    current = false,
    children,
}: NavLinkProps) {
    return (
        <a
            href={href}
            aria-current={current ? "page" : undefined}
            className={classNames(
                // base link
                "relative rounded-md px-3 py-2 text-sm font-medium dark:text-white text-gray-900",

                // hover text color
                !current && "text-gray-300 hover:text-white",

                // underline base
                "after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-1.5",
                "after:h-[3px] after:bg-cyan-400 after:rounded-full",

                // START AS DOT BELOW text
                !current && "after:w-[3px] after:opacity-0 after:translate-y-3",

                // PHASE 1: rise up
                !current &&
                "after:transition-[opacity,transform] after:duration-[600ms] hover:after:opacity-100 hover:after:-translate-y-2.5",

                // PHASE 2: expand width (delayed after rise)
                !current &&
                "hover:after:transition-[width] hover:after:duration-[400ms] hover:after:delay-[400ms] hover:after:w-full",


                // ACTIVE: full line, no animation
                current &&
                "after:opacity-100 after:-translate-y-2.5 after:w-full after:transition-none"


            )}
        >
            {children}
        </a>
    );
}
