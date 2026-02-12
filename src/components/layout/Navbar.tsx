import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import logo from "../../assets/logo/logo.png";
import NavLink from '../ui/UnderlineBTN';
import { Link } from "react-router-dom";
import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';

const navigation = [
  { name: 'Sega AI', href: '/ai-interface', current: false },
  { name: 'Team', href: '#', current: false },
  { name: 'Projects', href: '#', current: false },
  { name: 'Calendar', href: '#', current: false },
];

function classNames(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}



export default function Navbar() {

  const [isDark, setIsDark] = useState(false);

  // Optional: Remember preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Disclosure as="nav" className="fixed top-0 left-0 w-full z-50 backdrop-blur-md dark:bg-black/40 border-b border-white/5">
      <div className="relative h-16 flex justify-between items-center p-3 border-b border-cyan-400/10 shadow-[0_0_1px_rgba(34,211,238,0.1)]">

        <div
          aria-hidden
          className="absolute inset-0 animate-gradient"
          style={
            {
              '--color1': 'rgba(6, 181, 212, 0.6)',
              '--color2': 'rgba(138, 92, 246, 0.6)',
              '--color3': 'rgba(59,130,246,0.6)',
              filter: 'blur(50px)',
            } as React.CSSProperties}
        />

        <img
          src={logo}
          alt="Sega"
          className="md:h-12 h-8 w-auto drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]"
        />

        <div className="w-full flex md:justify-center font-medium">

          <div className="relative mx-auto max-w-7xl px-2 md:px-6 lg:px-8">
            <div className="hidden lg:ml-6 md:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    href={item.href}
                    current={item.current}
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
          <div className=" inset-y-0 left-0 flex items-center md:hidden">
            {/* Mobile menu button*/}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
        </div>

        <div className="w-16 h-full flex items-center justify-center">
          <button
            onClick={toggleDarkMode}
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 dark:from-yellow-300 dark:to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.7)] transition-all duration-500"
          >
            <SunIcon
              className={`absolute w-6 h-6 text-yellow-400 dark:text-yellow-50 transition-transform duration-700 ${isDark ? "rotate-180 scale-0" : "rotate-0 scale-100"
                }`}
            />
            <MoonIcon
              className={`absolute w-6 h-6 text-gray-900 dark:text-gray-200 transition-transform duration-700 ${isDark ? "rotate-0 scale-100" : "-rotate-180 scale-0"
                }`}
            />
          </button>
        </div>

      </div>
      <DisclosurePanel className="md:hidden">
        <div className="bg-black/20 space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as={Link}
              to={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={classNames(
                item.current
                  ? 'bg-gray-900 text-white dark:bg-gray-950/50'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-white/5 hover:text-white',
                'block rounded-md px-3 py-2 text-base font-medium',
              )}
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>


  );
}

