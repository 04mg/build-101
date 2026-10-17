import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HelloWorldHero, BackendHealthCard } from '@/features/starter'
import { ThemeCustomizer, ComponentShowcase, useThemeCustomizer } from '@/features/theme-customizer'

export function App() {
  const { config, setPalette, setRadius, toggleDark } = useThemeCustomizer()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* 1. Hero Feature */}
        <HelloWorldHero />

        {/* 2. Backend WASM Health Card */}
        <BackendHealthCard />

        {/* 3. Theme Customizer (Colors, Radius, Mode) */}
        <ThemeCustomizer
          palette={config.palette}
          radius={config.radius}
          isDark={config.isDark}
          onSelectPalette={setPalette}
          onSelectRadius={setRadius}
          onToggleDark={toggleDark}
        />

        {/* 4. Shadcn UI Component Showcase */}
        <ComponentShowcase />
      </main>

      <Footer />
    </div>
  )
}

export default App
