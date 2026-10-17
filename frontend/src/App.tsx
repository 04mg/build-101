import React, { useState, useEffect } from 'react'
import { 
  CalendarCheck, 
  Layers, 
  Shield, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  X, 
  Check, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Bot, 
  Sparkles, 
  Send, 
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Service {
  id: number
  name: string
  description: string
  duration_min: number
  price: number
  category: string
  image_url: string
}

interface Booking {
  id: number
  service_id: number
  service_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  booking_date: string
  booking_time: string
  guests: number
  status: string
  notes?: string
  created_at: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  runtime?: string
}

export function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'admin'>('catalog')
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    booking_time: '18:00',
    guests: 2,
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // AI Assistant State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente inteligente de reservas corriendo de forma nativa en **Rust-WASM** dentro de TrailBase. ¿En qué te puedo asesorar hoy?'
    }
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Services and Bookings
  const loadServices = async () => {
    try {
      const res = await fetch('/api/records/v1/services')
      if (!res.ok) throw new Error('Error al conectar con TrailBase')
      const data = await res.json()
      setServices(data.records || [])
    } catch (e: any) {
      showToast('Error cargando servicios: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/records/v1/bookings')
      if (res.ok) {
        const data = await res.json()
        setBookings(data.records || [])
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadServices()
    loadBookings()
  }, [])

  // Booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService) return
    setSubmitting(true)

    const payload = {
      service_id: selectedService.id,
      service_name: selectedService.name,
      ...formData,
      status: 'CONFIRMED',
      created_at: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/records/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setModalOpen(false)
      showToast(`¡Reserva confirmada con éxito! Ref: #${data.ids?.[0] || 'OK'}`)
      loadBookings()
    } catch (err: any) {
      showToast('Error al reservar: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete booking
  const handleDeleteBooking = async (id: number) => {
    if (!confirm(`¿Eliminar la reserva #${id}?`)) return
    try {
      const res = await fetch(`/api/records/v1/bookings/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('No se pudo eliminar')
      showToast(`Reserva #${id} cancelada`)
      loadBookings()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Create Mock Booking
  const handleCreateMockBooking = async () => {
    const mockNames = ['Alejandro Ruiz', 'Sofía Valdés', 'Martín Morales', 'Lucía Torres']
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)]
    const randomService = services.length > 0 ? services[Math.floor(Math.random() * services.length)] : { id: 1, name: 'Servicio Demo' }

    const payload = {
      service_id: randomService.id,
      service_name: randomService.name,
      customer_name: randomName,
      customer_email: `${randomName.toLowerCase().replace(' ', '.')}@example.com`,
      customer_phone: '+34 699 ' + Math.floor(100000 + Math.random() * 900000),
      booking_date: new Date(Date.now() + 86400000 * Math.floor(Math.random() * 7 + 1)).toISOString().split('T')[0],
      booking_time: ['10:30', '16:00', '18:00', '20:00'][Math.floor(Math.random() * 4)],
      guests: Math.floor(Math.random() * 4) + 1,
      status: 'CONFIRMED',
      notes: 'Generada desde botón de prueba rápida en React',
      created_at: new Date().toISOString()
    }

    try {
      const res = await fetch('/api/records/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        showToast(`Reserva demo creada para ${randomName}`)
        loadBookings()
      }
    } catch {
      showToast('Error creando reserva demo', 'error')
    }
  }

  // AI Chat Submission
  const handleAiSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiInput
    if (!promptToSend.trim() || aiLoading) return

    const newMessages: ChatMessage[] = [...aiMessages, { role: 'user', content: promptToSend }]
    setAiMessages(newMessages)
    if (!customPrompt) setAiInput('')
    setAiLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setAiMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.reply || 'Sin respuesta.',
          runtime: data.model || 'Rust-WASM'
        }
      ])
    } catch (err: any) {
      setAiMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ Error al contactar el componente WASM: ${err.message}`
        }
      ])
    } finally {
      setAiLoading(false)
    }
  }

  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category.toLowerCase() === selectedCategory.toLowerCase())

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  TrailBase Bookings
                </span>
                <Badge variant="outline" className="bg-indigo-950/60 border-indigo-700/50 text-indigo-300 text-[10px]">
                  React 19 + Shadcn
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>WASM Online (:4000)</span>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab(activeTab === 'catalog' ? 'admin' : 'catalog')}
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              <span>{activeTab === 'catalog' ? 'Panel Reservas' : 'Ver Catálogo'}</span>
              <span className="ml-1.5 bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {bookings.length}
              </span>
            </Button>

            <a 
              href="/_/admin" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin DB</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === 'catalog' ? 'Reserva de Espacios & Servicios' : 'Panel de Gestión de Reservas'}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Frontend modular en <strong className="text-indigo-300">React + Shadcn UI</strong> respaldado por el backend nativo de <strong className="text-white">TrailBase (SQLite STRICT + WASM)</strong>.
            </p>
          </div>

          <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Catálogo de Servicios
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Gestión ({bookings.length})
            </button>
          </div>
        </div>

        {/* TAB 1: CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <section>
            {/* Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {['All', 'Deportes', 'Espacios', 'Gastronomía', 'Negocios'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                        : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {cat === 'All' ? 'Todos los servicios' : cat}
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-400">
                {filteredServices.length} servicios disponibles
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="py-20 text-center text-gray-500 text-sm">Cargando servicios de TrailBase...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredServices.map(service => (
                  <Card key={service.id} className="overflow-hidden flex flex-col group border-gray-800/80 hover:border-indigo-500/40">
                    <div className="relative h-44 w-full overflow-hidden bg-gray-900">
                      <img 
                        src={service.image_url} 
                        alt={service.name} 
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />
                      <Badge className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md text-indigo-300 border-gray-700">
                        {service.category}
                      </Badge>
                      <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-xs text-gray-300">
                        <span className="flex items-center space-x-1 bg-gray-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          <span>{service.duration_min} min</span>
                        </span>
                      </div>
                    </div>

                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {service.description}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="mt-auto pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 block leading-none">Precio</span>
                        <span className="text-lg font-extrabold text-white">${service.price}</span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedService(service)
                          setModalOpen(true)
                        }}
                      >
                        <span>Reservar</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: ADMIN & BOOKINGS VIEW */}
        {activeTab === 'admin' && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="uppercase tracking-wider font-semibold text-[10px]">
                    Reservas Totales
                  </CardDescription>
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white">{bookings.length}</div>
                  <p className="text-[11px] text-gray-500 mt-1">Almacenadas en SQLite STRICT</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="uppercase tracking-wider font-semibold text-[10px]">
                    Confirmadas
                  </CardDescription>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-emerald-400">
                    {bookings.filter(b => b.status === 'CONFIRMED').length}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">100% activas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="uppercase tracking-wider font-semibold text-[10px]">
                    Backend Runtime
                  </CardDescription>
                  <Badge variant="outline" className="text-amber-300 border-amber-600/40">
                    Rust WASI-0.2
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-xs font-mono font-bold text-indigo-300 mt-1 truncate">
                    /api/records/v1/bookings
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">TrailBase Wasmtime Engine</p>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">Listado de Reservas Registradas</h3>
                  <p className="text-xs text-gray-400">Consultas nativas hacia TrailBase</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={loadBookings}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refrescar
                  </Button>
                  <Button size="sm" onClick={handleCreateMockBooking}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    + Reserva Demo
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="uppercase bg-gray-950/60 text-gray-400 border-b border-gray-800 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Servicio</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Fecha & Hora</th>
                      <th className="px-4 py-3 text-center">Personas</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-800/30 transition">
                        <td className="px-4 py-3 font-mono text-indigo-400 font-bold">#{b.id}</td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {b.service_name}
                          {b.notes && <div className="text-[11px] text-gray-500 font-normal truncate max-w-xs">{b.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-200">{b.customer_name}</div>
                          <div className="text-[10px] text-gray-500">{b.customer_email} • {b.customer_phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{b.booking_date}</div>
                          <div className="text-indigo-400">{b.booking_time} hrs</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="text-[10px]">
                            👥 {b.guests}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={b.status === 'CONFIRMED' ? 'success' : 'secondary'}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteBooking(b.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 transition cursor-pointer"
                            title="Eliminar reserva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bookings.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No hay reservas registradas aún. ¡Haz una reserva o pulsa "+ Reserva Demo"!
                </div>
              )}
            </Card>
          </section>
        )}
      </main>

      {/* Booking Modal */}
      {modalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Reservar: {selectedService.name}</h3>
                <p className="text-xs text-gray-400">Confirmación directa en SQLite STRICT</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo *</label>
                  <Input 
                    required 
                    placeholder="Ej: Laura Martínez"
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico *</label>
                  <Input 
                    type="email" 
                    required 
                    placeholder="laura@ejemplo.com"
                    value={formData.customer_email}
                    onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Teléfono</label>
                  <Input 
                    type="tel" 
                    placeholder="+34 600..."
                    value={formData.customer_phone}
                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Fecha *</label>
                  <Input 
                    type="date" 
                    required
                    value={formData.booking_date}
                    onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Horario *</label>
                  <select 
                    className="flex h-9 w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-1 text-xs text-white"
                    value={formData.booking_time}
                    onChange={e => setFormData({ ...formData, booking_time: e.target.value })}
                  >
                    <option value="09:00">09:00 hrs</option>
                    <option value="11:00">11:00 hrs</option>
                    <option value="14:00">14:00 hrs</option>
                    <option value="16:30">16:30 hrs</option>
                    <option value="18:00">18:00 hrs</option>
                    <option value="20:00">20:00 hrs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nº Asistentes</label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="50"
                    value={formData.guests}
                    onChange={e => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Notas especiales</label>
                  <Input 
                    placeholder="Peticiones, requerimientos..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-end space-x-3">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>{submitting ? 'Confirmando...' : 'Confirmar Reserva'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Trigger */}
      <button 
        onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-semibold text-xs shadow-xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition flex items-center space-x-2 border border-indigo-400/40 cursor-pointer"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
        </span>
        <Sparkles className="w-4 h-4 text-indigo-200" />
        <span>Asistente AI (WASM)</span>
      </button>

      {/* AI Assistant Chat Drawer */}
      {aiDrawerOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[420px] h-[550px] max-h-[82vh] z-50 bg-gray-950/95 border border-indigo-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200">
          <div className="p-3.5 border-b border-gray-800 bg-gray-900/90 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white">Asistente de Reservas</h4>
                  <Badge variant="outline" className="bg-amber-950 border-amber-700/60 text-amber-300 text-[9px]">
                    Rust-WASM
                  </Badge>
                </div>
                <p className="text-[10px] text-gray-400 font-mono">liquid/lfm-2.5-2.6b:free</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => setAiMessages([{ role: 'assistant', content: 'Chat reiniciado. ¿En qué puedo ayudarte hoy?' }])}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition" 
                title="Limpiar chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setAiDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition" 
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex items-start space-x-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.runtime && (
                    <div className="text-[9px] text-gray-500 text-right pt-1 font-mono">{msg.runtime}</div>
                  )}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-none p-3 text-gray-400 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  <span className="text-[10px] text-gray-500 ml-1">WASM consultando LiquidAI...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-gray-900/60 border-t border-gray-800/80 overflow-x-auto flex items-center space-x-1.5">
            <button 
              onClick={() => handleAiSend('¿Qué servicios tienen disponibles y sus precios?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-800/90 hover:bg-indigo-600/40 text-gray-300 hover:text-indigo-200 text-[11px] border border-gray-700/50 transition cursor-pointer"
            >
              📋 Servicios & Precios
            </button>
            <button 
              onClick={() => handleAiSend('Quiero reservar una cancha de pádel')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-800/90 hover:bg-indigo-600/40 text-gray-300 hover:text-indigo-200 text-[11px] border border-gray-700/50 transition cursor-pointer"
            >
              🎾 Cancha de pádel
            </button>
            <button 
              onClick={() => handleAiSend('¿Cuál es la opción más barata?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-gray-800/90 hover:bg-indigo-600/40 text-gray-300 hover:text-indigo-200 text-[11px] border border-gray-700/50 transition cursor-pointer"
            >
              💰 Más barata
            </button>
          </div>

          {/* Input Form */}
          <form 
            onSubmit={e => {
              e.preventDefault()
              handleAiSend()
            }} 
            className="p-3 border-t border-gray-800 bg-gray-900/90 flex items-center space-x-2"
          >
            <Input 
              placeholder="Pregunta al asistente sobre servicios..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              disabled={aiLoading}
            />
            <Button type="submit" size="icon" disabled={aiLoading || !aiInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 left-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border backdrop-blur-md transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800' 
            : 'bg-rose-950/90 text-rose-200 border-rose-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-gray-950/60 py-4 mt-auto text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Frontend en <strong>React 19 + Shadcn UI</strong> servido por <strong>TrailBase</strong></span>
          </div>
          <div>
            REST: <code className="text-indigo-400">/api/records/v1/*</code> | WASM: <code className="text-amber-400">POST /api/chat</code>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
