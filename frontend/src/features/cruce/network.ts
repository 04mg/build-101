import { request } from './api'

export type MatchType = 'same_problem' | 'hypothesis_validated' | 'hypothesis_rejected' | 'hypothesis_peer' | 'partnership'
export interface NetworkNoteRef { id: string; kind: string; title: string; body: string }
export interface NetworkMatch {
  id: string; type: MatchType; title: string; message: string; description: string; createdAt: string; seen: boolean
  projectId: number; projectName: string; note: NetworkNoteRef
  request: { id: string; status: RequestStatus; direction: 'incoming' | 'outgoing' } | null
}
export type RequestStatus = 'pending' | 'accepted' | 'rejected'
export interface ContactCard {
  projectName: string; problem: string
  hypotheses: { title: string; body: string; status: 'open' | 'testing' | 'validated' | 'rejected' }[]
}
export interface NetworkRequest {
  id: string; direction: 'incoming' | 'outgoing'; status: RequestStatus; type: MatchType; createdAt: string; respondedAt: string | null
  title: string; message: string; description: string; projectId: number; projectName: string; note: NetworkNoteRef
  seen: boolean; contact: ContactCard | null; chat: ChatSummary | null
}
export interface ChatMessage { id: string; mine: boolean; body: string; createdAt: string }
export interface ChatSummary { unread: number; last: Omit<ChatMessage, 'id'> | null }
/** Points for accepting to connect with other founders; the ranking only names founders already connected with you. */
export interface Karma { points: number; accepted: number; perAccept: number; rank: number | null; ranking: { rank: number; points: number; you: boolean; label: string }[] }
export interface NetworkState { matches: NetworkMatch[]; requests: NetworkRequest[]; karma?: Karma; push: { publicKey: string }; memory: boolean }

export const matchLabels: Record<MatchType, { label: string; filter: string; partner?: boolean }> = {
  same_problem: { label: 'Mismo problema', filter: 'Algo parecido' },
  hypothesis_peer: { label: 'Prueba tu misma hipótesis', filter: 'Algo parecido' },
  hypothesis_validated: { label: 'Ya validó tu hipótesis', filter: 'Pasaron por tu problema' },
  hypothesis_rejected: { label: 'No validó tu hipótesis', filter: 'Pasaron por tu problema' },
  partnership: { label: 'Partnership', filter: 'Complementarias', partner: true },
}

export const getNetwork = (signal?: AbortSignal) => request<NetworkState>('network', undefined, signal)
export const markNetworkSeen = (matches: string[], requests: string[]) => request<{ ok: true }>('network/seen', { matches, requests })
export const contactMatch = (id: string) => request<NetworkState>(`network/matches/${encodeURIComponent(id)}/contact`, {})
export const dismissMatch = (id: string) => request<NetworkState>(`network/matches/${encodeURIComponent(id)}/dismiss`, {})
export const respondRequest = (id: string, accept: boolean) => request<NetworkState>(`network/requests/${encodeURIComponent(id)}/respond`, { accept })
export const readChat = (id: string, signal?: AbortSignal) => request<{ messages: ChatMessage[] }>(`network/requests/${encodeURIComponent(id)}/messages/read`, {}, signal)
export const sendChat = (id: string, body: string) => request<{ messages: ChatMessage[] }>(`network/requests/${encodeURIComponent(id)}/messages`, { body })
export const savePushSubscription = (subscription: PushSubscriptionJSON) => request<{ ok: true }>('network/push', subscription)
