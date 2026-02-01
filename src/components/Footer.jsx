export default function Footer() {
  return (
    <footer className="mt-20 py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          © {new Date().getFullYear()} FoodLink • All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
