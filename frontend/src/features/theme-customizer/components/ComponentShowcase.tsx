import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Send, CheckCircle, Flame } from 'lucide-react'

export function ComponentShowcase() {
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  return (
    <Card className="w-full max-w-xl mx-auto border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Muestra de Componentes Shadcn</CardTitle>
            <CardDescription className="text-xs">
              Componentes primitivos compartidos que adoptan los tokens de diseño
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-1">
        {/* Buttons Showcase */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Variantes de Botones</Label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5 cursor-pointer">
              <Flame className="w-3.5 h-3.5" />
              <span>Primary</span>
            </Button>
            <Button size="sm" variant="secondary" className="cursor-pointer">
              Secondary
            </Button>
            <Button size="sm" variant="outline" className="cursor-pointer">
              Outline
            </Button>
            <Button size="sm" variant="destructive" className="cursor-pointer">
              Destructive
            </Button>
            <Button size="sm" variant="ghost" className="cursor-pointer">
              Ghost
            </Button>
          </div>
        </div>

        {/* Badges Showcase */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Variantes de Badges</Label>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </div>

        {/* Input & Form Showcase */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor="demo-input" className="text-xs font-medium text-muted-foreground">
            Input Reactivo con Foco de Anillo (Ring Token)
          </Label>
          <div className="flex gap-2">
            <Input
              id="demo-input"
              placeholder="Escribe algo aquí para probar el input..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="text-xs h-9"
            />
            <Button type="submit" size="sm" className="gap-1.5 h-9 shrink-0 cursor-pointer">
              {submitted ? <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
              <span>{submitted ? 'Enviado' : 'Probar'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
