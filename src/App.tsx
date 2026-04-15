import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Peoplify</h1>
        <p className="text-muted-foreground">HR App — React + Vite + Tailwind + shadcn/ui</p>
        <Button>Get Started</Button>
      </div>
    </div>
  )
}

export default App
