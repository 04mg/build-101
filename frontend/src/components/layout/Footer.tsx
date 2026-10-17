export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40 py-6 mt-12 text-center text-xs text-muted-foreground">
      <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>TrailBase SQLite STRICT + WASM + React 19 + Shadcn UI</span>
        </div>
        <div className="text-[11px]">
          Hackathon Ready • Extensible via <code className="text-primary font-mono">extensions/</code>
        </div>
      </div>
    </footer>
  )
}
