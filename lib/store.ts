import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, endOfMonth, format, isAfter, isBefore, isSameDay, isSameMonth, parseISO, startOfMonth } from 'date-fns'

export type UserRole = 'admin' | 'visitador'
export type VisitStatus = 'planeada' | 'realizada' | 'cancelada' | 'reprogramada' | 'vencida_no_reportada'

export interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
}

export interface BaseEntity {
  id: string
  name: string
  type: 'medico' | 'drogueria'
  category: string
  address: string
  city: string
  assignedTo: string
}

export interface Product {
  id: string
  name: string
}

export interface FormulationItem {
  productId: string
  quantity: number
}

export interface Visit {
  id: string
  visitadorId: string
  entityId: string
  entityName: string
  entityType: 'medico' | 'drogueria'
  category: string
  address: string
  city: string
  fechaPlaneada: string
  estado: VisitStatus
  fechaRealVisita?: string
  motivo?: string
  observations?: string
  formulations: FormulationItem[]
  createdAt: string
  updatedAt: string
}

export interface ItineraryItem {
  id: string
  visitadorId: string
  city: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  notes?: string
  createdAt: string
}

interface LoginPayload {
  email: string
  displayName?: string
}

interface ReportPayload {
  visitId: string
  estado: Exclude<VisitStatus, 'planeada' | 'vencida_no_reportada'>
  motivo?: string
  observations?: string
  fechaRealVisita?: string
  formulations?: FormulationItem[]
}

interface ReactivatePayload {
  visitId: string
  fechaPlaneada: string
}

interface CreateItineraryPayload {
  city: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  notes?: string
}

interface AppStore {
  user: User | null
  baseEntities: BaseEntity[]
  products: Product[]
  visits: Visit[]
  itineraries: ItineraryItem[]
  login: (payload: LoginPayload) => void
  logout: () => void
  hydrateBusinessRules: () => void
  createPlanning: (entityId: string, fechaPlaneada: string) => { ok: boolean; message: string }
  reportVisit: (payload: ReportPayload) => { ok: boolean; message: string }
  reactivateUnreportedVisit: (payload: ReactivatePayload) => { ok: boolean; message: string }
  deleteVisit: (visitId: string) => void
  createItinerary: (payload: CreateItineraryPayload) => { ok: boolean; message: string }
  deleteItinerary: (id: string) => void
}

const nowIso = () => new Date().toISOString()
const todayStr = () => format(new Date(), 'yyyy-MM-dd')
const currentMonthStart = () => startOfMonth(new Date())
const currentMonthEnd = () => endOfMonth(new Date())
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`

const seedUsers: Record<string, User> = {
  admin: { uid: 'admin-1', email: 'admin@farmaser.com', displayName: 'Administrador Farmaser', role: 'admin' },
  visitador: { uid: 'vis-1', email: 'visitador@farmaser.com', displayName: 'Visitador Demo', role: 'visitador' },
}

const seedBaseEntities: BaseEntity[] = [
  { id: 'med-1', name: 'Dr. Juan García', type: 'medico', category: 'AAA', address: 'Cra. 10 #15-20', city: 'Cali', assignedTo: 'vis-1' },
  { id: 'med-2', name: 'Dra. María López', type: 'medico', category: 'AA', address: 'Cl. 5 #32-10', city: 'Palmira', assignedTo: 'vis-1' },
  { id: 'med-3', name: 'Dr. Camilo Pérez', type: 'medico', category: 'AAA', address: 'Av. 6N #44-18', city: 'Cali', assignedTo: 'vis-1' },
  { id: 'dro-1', name: 'Droguería Central', type: 'drogueria', category: 'AA', address: 'Cl. 9 #21-33', city: 'Cali', assignedTo: 'vis-1' },
  { id: 'dro-2', name: 'Droguería San José', type: 'drogueria', category: 'AA', address: 'Cra. 27 #67-90', city: 'Buga', assignedTo: 'vis-1' },
]

const seedProducts: Product[] = [
  { id: 'prod-1', name: 'Producto A' },
  { id: 'prod-2', name: 'Producto B' },
  { id: 'prod-3', name: 'Producto C' },
  { id: 'prod-4', name: 'Producto D' },
]

const seedVisits = (): Visit[] => {
  const today = todayStr()
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')

  return [
    {
      id: 'visit-seed-1',
      visitadorId: 'vis-1',
      entityId: 'med-1',
      entityName: 'Dr. Juan García',
      entityType: 'medico',
      category: 'AAA',
      address: 'Cra. 10 #15-20',
      city: 'Cali',
      fechaPlaneada: today,
      estado: 'planeada',
      formulations: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: 'visit-seed-2',
      visitadorId: 'vis-1',
      entityId: 'dro-1',
      entityName: 'Droguería Central',
      entityType: 'drogueria',
      category: 'AA',
      address: 'Cl. 9 #21-33',
      city: 'Cali',
      fechaPlaneada: yesterday,
      estado: 'planeada',
      formulations: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ]
}

const seedItineraries = (): ItineraryItem[] => {
  const today = todayStr()
  return [
    {
      id: 'it-seed-1',
      visitadorId: 'vis-1',
      city: 'Medellín',
      startDate: today,
      endDate: today,
      startTime: '08:00',
      endTime: '18:00',
      notes: 'Viaje comercial',
      createdAt: nowIso(),
    },
  ]
}

const overlaps = (aStartDate: string, aEndDate: string, aStartTime: string, aEndTime: string, b: ItineraryItem) => {
  const startA = new Date(`${aStartDate}T${aStartTime}:00`)
  const endA = new Date(`${aEndDate}T${aEndTime}:00`)
  const startB = new Date(`${b.startDate}T${b.startTime}:00`)
  const endB = new Date(`${b.endDate}T${b.endTime}:00`)
  return startA < endB && endA > startB
}

const hydrateExpiredVisits = (visits: Visit[]) => {
  const today = parseISO(todayStr())
  return visits.map((visit) => {
    if (visit.estado === 'planeada' && isBefore(parseISO(visit.fechaPlaneada), today)) {
      return { ...visit, estado: 'vencida_no_reportada' as VisitStatus, updatedAt: nowIso() }
    }
    return visit
  })
}

export const useAuthStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      baseEntities: seedBaseEntities,
      products: seedProducts,
      visits: seedVisits(),
      itineraries: seedItineraries(),
      login: ({ email, displayName }) => {
        const normalized = email.toLowerCase().trim()
        const user = normalized.includes('admin')
          ? seedUsers.admin
          : { ...seedUsers.visitador, email: normalized, displayName: displayName || 'Visitador' }
        set({ user })
      },
      logout: () => set({ user: null }),
      hydrateBusinessRules: () => {
        set((state) => ({ visits: hydrateExpiredVisits(state.visits) }))
      },
      createPlanning: (entityId, fechaPlaneada) => {
        const state = get()
        const user = state.user
        if (!user) return { ok: false, message: 'Debes iniciar sesión.' }
        const entity = state.baseEntities.find((item) => item.id === entityId && item.assignedTo === user.uid)
        if (!entity) return { ok: false, message: 'No se encontró el médico o droguería.' }

        const planDate = parseISO(fechaPlaneada)
        const alreadyPlanned = state.visits.some((visit) =>
          visit.visitadorId === user.uid &&
          visit.entityId === entityId &&
          isSameMonth(parseISO(visit.fechaPlaneada), planDate)
        )

        if (alreadyPlanned) {
          return { ok: false, message: 'Ese médico o droguería ya fue planeado este mes.' }
        }

        const newVisit: Visit = {
          id: makeId('visit'),
          visitadorId: user.uid,
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.type,
          category: entity.category,
          address: entity.address,
          city: entity.city,
          fechaPlaneada,
          estado: 'planeada',
          formulations: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }

        set((state) => ({ visits: hydrateExpiredVisits([...state.visits, newVisit]) }))
        return { ok: true, message: 'Planeación creada correctamente.' }
      },
      reportVisit: ({ visitId, estado, motivo, observations, fechaRealVisita, formulations }) => {
        const state = get()
        const visit = state.visits.find((item) => item.id === visitId)
        if (!visit) return { ok: false, message: 'No se encontró la visita.' }
        const user = state.user
        if (!user) return { ok: false, message: 'Debes iniciar sesión.' }
        if (user.role !== 'admin' && !isSameDay(parseISO(visit.fechaPlaneada), new Date())) {
          return { ok: false, message: 'Solo puedes reportar citas del día en curso.' }
        }
        if (estado === 'reprogramada' && !fechaRealVisita) {
          return { ok: false, message: 'Debes ingresar la nueva fecha real de visita.' }
        }

        set((state) => ({
          visits: hydrateExpiredVisits(
            state.visits.map((item) =>
              item.id === visitId
                ? {
                    ...item,
                    estado,
                    motivo,
                    observations,
                    fechaRealVisita: estado === 'reprogramada' ? fechaRealVisita : undefined,
                    formulations: formulations || [],
                    updatedAt: nowIso(),
                  }
                : item,
            ),
          ),
        }))
        return { ok: true, message: 'Cita reportada correctamente.' }
      },
      reactivateUnreportedVisit: ({ visitId, fechaPlaneada }) => {
        const state = get()
        const visit = state.visits.find((item) => item.id === visitId)
        if (!visit) return { ok: false, message: 'No se encontró la visita.' }

        set((state) => ({
          visits: state.visits.map((item) =>
            item.id === visitId
              ? { ...item, estado: 'planeada', fechaPlaneada, fechaRealVisita: undefined, motivo: undefined, updatedAt: nowIso() }
              : item,
          ),
        }))
        return { ok: true, message: 'Cita reactivada correctamente.' }
      },
      deleteVisit: (visitId) => {
        set((state) => ({ visits: state.visits.filter((item) => item.id !== visitId) }))
      },
      createItinerary: ({ city, startDate, endDate, startTime, endTime, notes }) => {
        const state = get()
        const user = state.user
        if (!user) return { ok: false, message: 'Debes iniciar sesión.' }
        if (new Date(`${startDate}T${startTime}:00`) >= new Date(`${endDate}T${endTime}:00`)) {
          return { ok: false, message: 'La fecha/hora de salida debe ser mayor a la de entrada.' }
        }
        const conflict = state.itineraries.some(
          (item) => item.visitadorId === user.uid && overlaps(startDate, endDate, startTime, endTime, item),
        )
        if (conflict) {
          return { ok: false, message: 'No se permiten viajes superpuestos.' }
        }
        const itinerary: ItineraryItem = {
          id: makeId('it'),
          visitadorId: user.uid,
          city,
          startDate,
          endDate,
          startTime,
          endTime,
          notes,
          createdAt: nowIso(),
        }
        set((state) => ({ itineraries: [...state.itineraries, itinerary] }))
        return { ok: true, message: 'Itinerario creado correctamente.' }
      },
      deleteItinerary: (id) => {
        set((state) => ({ itineraries: state.itineraries.filter((item) => item.id !== id) }))
      },
    }),
    {
      name: 'farmaser-store-v2',
      partialize: (state) => ({
        user: state.user,
        baseEntities: state.baseEntities,
        products: state.products,
        visits: state.visits,
        itineraries: state.itineraries,
      }),
    },
  ),
)

export const visitStatusLabel: Record<VisitStatus, string> = {
  planeada: 'Planeada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
  vencida_no_reportada: 'Vencida no reportada',
}

export const visitStatusClass: Record<VisitStatus, string> = {
  planeada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  reprogramada: 'bg-amber-100 text-amber-800',
  vencida_no_reportada: 'bg-slate-200 text-slate-800',
}

export const selectAvailableEntitiesForCurrentMonth = (state: Pick<AppStore, 'user' | 'baseEntities' | 'visits'>) => {
  const user = state.user
  if (!user) return []
  const monthStart = currentMonthStart()
  const monthEnd = currentMonthEnd()
  const plannedIds = new Set(
    state.visits
      .filter((visit) =>
        visit.visitadorId === user.uid &&
        !isBefore(parseISO(visit.fechaPlaneada), monthStart) &&
        !isAfter(parseISO(visit.fechaPlaneada), monthEnd),
      )
      .map((visit) => visit.entityId),
  )

  return state.baseEntities.filter((entity) => entity.assignedTo === user.uid && !plannedIds.has(entity.id))
}

export const getMonthlyVisitStats = (state: Pick<AppStore, 'user' | 'visits' | 'baseEntities'>) => {
  const user = state.user
  if (!user) {
    return { planned: 0, reported: 0, forgotten: 0, realized: 0, assignedBase: 0, coverage: 0, reportRate: 0, forgetRate: 0 }
  }
  const monthStart = currentMonthStart()
  const monthEnd = currentMonthEnd()
  const monthlyVisits = state.visits.filter(
    (visit) =>
      visit.visitadorId === user.uid &&
      !isBefore(parseISO(visit.fechaPlaneada), monthStart) &&
      !isAfter(parseISO(visit.fechaPlaneada), monthEnd),
  )
  const planned = monthlyVisits.length
  const reported = monthlyVisits.filter((visit) => ['realizada', 'cancelada', 'reprogramada'].includes(visit.estado)).length
  const forgotten = monthlyVisits.filter((visit) => visit.estado === 'vencida_no_reportada').length
  const realized = monthlyVisits.filter((visit) => visit.estado === 'realizada').length
  const assignedBase = state.baseEntities.filter((entity) => entity.assignedTo === user.uid).length
  return {
    planned,
    reported,
    forgotten,
    realized,
    assignedBase,
    coverage: assignedBase ? Math.round((realized / assignedBase) * 100) : 0,
    reportRate: planned ? Math.round((reported / planned) * 100) : 0,
    forgetRate: planned ? Math.round((forgotten / planned) * 100) : 0,
  }
}
