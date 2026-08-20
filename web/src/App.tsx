export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-wine text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-4">
          <span className="font-medium">mParticle by Rokt</span>
          <span className="font-mono text-xs uppercase tracking-widest text-white/70">
            Custom Roles
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-medium">Scaffold ready</h1>
        <p className="mt-2 text-black/70">The app shell builds. Features land milestone by milestone.</p>
      </main>
    </div>
  );
}
