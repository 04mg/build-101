import { Compass, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Header() {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-foreground">TrailBase Starter</span>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-1.5 py-0 border-border">
              Hackathon Edition
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
          <a
            href="/_/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Admin Panel (/_/)</span>
          </a>
        </div>
      </div>
    </header>
  )
}
