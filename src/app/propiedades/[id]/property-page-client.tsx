"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { ShareButton } from "~/components/property/share-button";
import { submitPropertyInquiry } from "~/server/actions/property-inquiry";
import type { PropertyInquiryData } from "~/server/actions/property-inquiry";
import { CheckCircle2, AlertCircle, X, Phone, Mail } from "lucide-react";

interface PropertyPageClientProps {
  property: any;
}

export function PropertyPageClient({ property }: PropertyPageClientProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    message: "Hola, estoy interesado en esta propiedad. Me gustaría recibir más información.",
    honeypot: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleContactForm = () => {
    setShowContactForm(!showContactForm);
    // Reset states when toggling
    if (!showContactForm) {
      setIsSubmitted(false);
      setError(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure we have a valid listingId or propertyId
      const listingId = property.listingId?.toString();
      const propertyId = property.propertyId?.toString();
      
      console.log("[Property Inquiry] Starting submission", {
        listingId,
        propertyId,
        propertyKeys: Object.keys(property),
        hasListingId: !!property.listingId,
        hasPropertyId: !!property.propertyId,
      });
      
      if (!listingId && !propertyId) {
        console.error("[Property Inquiry] Missing IDs", { property });
        setError("Error: No se pudo identificar la propiedad. Por favor, recarga la página.");
        setIsSubmitting(false);
        return;
      }

      const formData: PropertyInquiryData = {
        name: formState.name,
        email: formState.email || undefined,
        phone: formState.phone,
        message: formState.message,
        propertyId: listingId || propertyId || "",
        propertyTitle: property.title || "Propiedad sin título",
        propertyPrice: property.price?.toString(),
        honeypot: formState.honeypot || undefined,
      };

      console.log("[Property Inquiry] Submitting form data", {
        ...formData,
        phone: formData.phone ? "[REDACTED]" : undefined,
        email: formData.email ? formData.email.substring(0, 3) + "***" : undefined,
      });

      const result = await submitPropertyInquiry(formData);

      console.log("[Property Inquiry] Server response", {
        success: result.success,
        hasError: !!result.error,
        errorMessage: result.error,
      });

      if (result.success) {
        setIsSubmitted(true);
        setFormState({
          name: "",
          email: "",
          phone: "",
          message: "Hola, estoy interesado en esta propiedad. Me gustaría recibir más información.",
          honeypot: "",
        });
      } else {
        setError(result.error || "Error al enviar la consulta");
      }
    } catch (err) {
      console.error("[Property Inquiry] Exception during submission:", err);
      if (err instanceof Error) {
        console.error("[Property Inquiry] Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
      }
      setError("Error al enviar la consulta. Por favor, inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Acciones */}
      {!showContactForm && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={toggleContactForm}>
            Contactar
          </Button>
          <ShareButton />
        </div>
      )}

      {/* Formulario de contacto - Conditional rendering */}
      {showContactForm && (
        <div className="relative rounded-lg border p-6">
          <button
            onClick={toggleContactForm}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h3 className="mb-4 text-lg font-bold pr-12">
            ¿Interesado en esta propiedad?
          </h3>
          
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-100 bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="mb-2 text-xl font-semibold text-gray-900">
                Consulta Enviada
              </h4>
              <p className="text-center text-gray-600">
                Gracias por tu interés. Hemos recibido tu consulta y nos pondremos en contacto contigo pronto.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field — hidden from real users, bots auto-fill it */}
              <div
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", opacity: 0 }}
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="honeypot"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formState.honeypot}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                >
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm font-medium"
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formState.phone}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Tu teléfono"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium"
                >
                  Email{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-sm font-medium"
                >
                  Mensaje
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Me interesa esta propiedad..."
                  required
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Consulta"}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Agente */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-bold">Agente Inmobiliario</h3>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted">
            {property.agentImage ? (
              <Image
                src={property.agentImage}
                alt={property.agentName || "Agente"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {property.agentName?.charAt(0) || "A"}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">
              {property.agentName || "Agente Inmobiliario"}
            </p>
            {property.agentPhone && (
              <a href={`tel:${property.agentPhone}`} className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Phone className="h-3 w-3" />
                {property.agentPhone}
              </a>
            )}
            {property.agentEmail && (
              <a href={`mailto:${property.agentEmail}`} className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Mail className="h-3 w-3" />
                {property.agentEmail}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}