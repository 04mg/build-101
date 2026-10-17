import { Sparkles, Terminal, Code2, Cpu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function HelloWorldHero() {
  return (
    <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto py-8">
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5 border-primary/30 text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hackathon Starter Template</span>
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 text-xs">
          v1.0.0
        </Badge>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
        Hello World, <span className="text-primary underline decoration-primary/30 underline-offset-8">TrailBase</span>!
      </h1>

      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
        Plantilla mínima lista para construir en la hackathon. Backend nativo con SQLite STRICT y componente WASI Rust en <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">extensions/</code>, frontend con <strong>Feature Slice Architecture</strong> y temas <strong>Shadcn UI</strong> completamente configurables.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border border-border">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span>Rust WASI-0.2</span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border border-border">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>TrailBase SQLite STRICT</span>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border border-border">
          <Code2 className="w-3.5 h-3.5 text-primary" />
          <span>React 19 + Shadcn UI</span>
        </div>
      </div>
    </div>
  )
}
