export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-4 text-xs text-zinc-500 dark:text-zinc-400">
        <p>&copy; {year} WALLX</p>
        <a
          href="https://github.com/devinfebrian/ANOCHAT"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}