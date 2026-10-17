import { Paintbrush, Moon, Sun, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { ThemePalette, RadiusValue } from '../types'

interface ThemeCustomizerProps {
  palette: ThemePalette
  radius: RadiusValue
  isDark: boolean
  onSelectPalette: (palette: ThemePalette) => void
  onSelectRadius: (radius: RadiusValue) => void
  onToggleDark: () => void
}

const PALETTES: { id: ThemePalette; name: string; colorClass: string }[] = [
  { id: 'zinc', name: 'Zinc', colorClass: 'bg-zinc-900 dark:bg-zinc-100' },
  { id: 'violet', name: 'Violet', colorClass: 'bg-violet-600' },
  { id: 'blue', name: 'Blue', colorClass: 'bg-blue-600' },
  { id: 'emerald', name: 'Emerald', colorClass: 'bg-emerald-600' },
  { id: 'rose', name: 'Rose', colorClass: 'bg-rose-600' },
  { id: 'amber', name: 'Amber', colorClass: 'bg-amber-500' },
]

const RADII: { value: RadiusValue; label: string }[] = [
  { value: 0, label: '0px' },
  { value: 0.3, label: '4px' },
  { value: 0.5, label: '8px' },
  { value: 0.75, label: '12px' },
  { value: 1.0, label: '16px' },
]

export function ThemeCustomizer({
  palette,
  radius,
  isDark,
  onSelectPalette,
  onSelectRadius,
  onToggleDark,
}: ThemeCustomizerProps) {
  return (
    <Card className="w-full max-w-xl mx-auto border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Configuración de Shadcn UI</CardTitle>
              <CardDescription className="text-xs">
                Ajusta tokens CSS en vivo (colores, bordes y modo) tipo <code className="text-primary font-mono">shadcn/create</code>
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleDark}
            className="h-8 px-2.5 gap-1.5 text-xs cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span>{isDark ? 'Claro' : 'Oscuro'}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Color Palette Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Paleta de Color Primario</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PALETTES.map((p) => {
              const active = palette === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPalette(p.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all ${
                    active
                      ? 'border-primary ring-2 ring-primary/20 bg-accent text-foreground'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${p.colorClass}`} />
                    <span>{p.name}</span>
                  </div>
                  {active && <Check className="w-3 h-3 text-primary ml-1" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Border Radius Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Radio de Bordes (--radius)</Label>
          <div className="grid grid-cols-5 gap-2">
            {RADII.map((r) => {
              const active = radius === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onSelectRadius(r.value)}
                  className={`py-1.5 px-2 rounded-md border text-center text-xs font-medium cursor-pointer transition-all ${
                    active
                      ? 'border-primary ring-2 ring-primary/20 bg-accent text-foreground'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
