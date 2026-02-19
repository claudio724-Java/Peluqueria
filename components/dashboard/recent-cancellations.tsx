"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Clock, CheckCircle2, User, CalendarX } from "lucide-react"
import type { Cita } from "@/lib/types"

interface RecentCancellationsProps {
  cancellations: Cita[]
}

export function RecentCancellations({ cancellations }: RecentCancellationsProps) {
  const [offerSlot, setOfferSlot] = useState<Cita | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [allSent, setAllSent] = useState(false)

  function handleSendToCandidate(candidateId: string) {
    setSentIds((prev) => new Set([...prev, candidateId]))
  }

  function handleSendAll() {
    setAllSent(true)
    setTimeout(() => {
      setOfferSlot(null)
      setAllSent(false)
      setSentIds(new Set())
    }, 1500)
  }

  // 👇 Generamos candidatos fake a partir de la cancelación (solo UI)
  const waitlistCandidates =
    offerSlot
      ? [
          {
            id: "w1",
            nombre: "Cliente Interesado 1",
            servicio: offerSlot.servicio.nombre,
            preferencia: "Cualquier hora",
          },
          {
            id: "w2",
            nombre: "Cliente Interesado 2",
            servicio: offerSlot.servicio.nombre,
            preferencia: "Mañana",
          },
        ]
      : []

  return (
    <>
      <Card className="shadow-sm h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Cancelaciones recientes
            </CardTitle>

            {cancellations.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                {cancellations.length}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 min-h-0">
          {cancellations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <CalendarX className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                Sin cancelaciones
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No hay cancelaciones recientes que gestionar.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full max-h-[420px]">
              <div className="divide-y divide-border">
                {cancellations.map((cita) => (
                  <div
                    key={cita.id}
                    className="px-6 py-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {cita.cliente.nombre}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {cita.servicio.nombre} · {cita.fecha}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {cita.hora} · {cita.duracion} min
                          </p>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1.5 italic">
                          {cita.notas || "Sin motivo especificado"}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full text-xs"
                      onClick={() => {
                        setOfferSlot(cita)
                        setSentIds(new Set())
                        setAllSent(false)
                      }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Ofrecer hueco
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modal ofrecer hueco */}
      <Dialog
        open={!!offerSlot}
        onOpenChange={() => {
          setOfferSlot(null)
          setSentIds(new Set())
          setAllSent(false)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ofrecer hueco disponible</DialogTitle>
            <DialogDescription>
              {offerSlot &&
                `Hueco: ${offerSlot.fecha} a las ${offerSlot.hora} (${offerSlot.servicio.nombre}, ${offerSlot.duracion} min)`}
            </DialogDescription>
          </DialogHeader>

          {allSent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                Notificaciones enviadas
              </p>
            </div>
          ) : (
            <div className="grid gap-5 py-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Candidatos
                </Label>

                <div className="rounded-lg border divide-y">
                  {waitlistCandidates.map((candidate) => {
                    const isSent = sentIds.has(candidate.id)

                    return (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between p-3 gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {candidate.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {candidate.servicio} · {candidate.preferencia}
                            </p>
                          </div>
                        </div>

                        {isSent ? (
                          <Badge variant="outline">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSendToCandidate(candidate.id)
                            }
                          >
                            Ofrecer
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Mensaje personalizado</Label>
                <Textarea
                  placeholder="Ha quedado un hueco libre. Reserva antes de que se ocupe."
                  rows={2}
                />
              </div>
            </div>
          )}

          {!allSent && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOfferSlot(null)}
              >
                Cancelar
              </Button>

              <Button
                onClick={handleSendAll}
                disabled={sentIds.size === 0}
              >
                Enviar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
