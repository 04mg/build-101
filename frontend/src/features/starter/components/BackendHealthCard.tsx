import { RefreshCw, CheckCircle2, AlertTriangle, Layers, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePing } from '../hooks/usePing'

export function BackendHealthCard() {
  const { data, latencyMs, loading, error, refetch } = usePing()

  return (
    <Card className="w-full max-w-xl mx-auto shadow-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">TrailBase Native WASM Extension</CardTitle>
              <CardDescription className="text-xs">Estado de conexión con <code className="text-primary font-mono">/api/ping</code></CardDescription>
            </div>
          </div>
          <Badge variant={error ? "destructive" : "default"} className="text-xs gap-1">
            {error ? (
              <>
                <AlertTriangle className="w-3 h-3" /> Error
              </>
            ) : loading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" /> Conectando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" /> Online
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {error ? (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-xs">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-md bg-muted/50 border border-border">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Componente</span>
              <span className="font-mono font-medium text-foreground">{data?.component || 'extensions.wasm'}</span>
            </div>
            <div className="p-2.5 rounded-md bg-muted/50 border border-border">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Latencia WASM</span>
              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                {latencyMs !== null ? `${latencyMs} ms` : '—'}
              </span>
            </div>
            <div className="col-span-2 p-2.5 rounded-md bg-muted/50 border border-border">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Runtime</span>
              <span className="font-mono text-foreground">{data?.runtime || 'TrailBase native Wasmtime (WASI-0.2)'}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-1 flex items-center justify-between border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Extiende rutas en <code className="text-foreground font-mono">extensions/src/lib.rs</code></span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={refetch} 
          disabled={loading}
          className="gap-1.5 h-8 text-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Probar Ping</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
