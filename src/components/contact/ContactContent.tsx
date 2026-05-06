"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "./ContactForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ContactProps } from "~/server/queries/contact";
import { fadeInUp, staggerContainer, staggerItem } from "~/lib/animations";
import { OfficeLocationMap } from "./OfficeLocationMap";

interface ContactContentProps {
  title: string;
  subtitle: string;
  messageForm: boolean;
  address: boolean;
  phone: boolean;
  mail: boolean;
  schedule: boolean;
  map: boolean;
  contactProps: ContactProps | null;
}

export function ContactContent({
  title,
  subtitle,
  messageForm,
  address,
  phone,
  mail,
  schedule,
  map,
  contactProps,
}: ContactContentProps) {
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(
    contactProps?.offices?.find((office) => office.isDefault)?.id ||
      contactProps?.offices?.[0]?.id ||
      "",
  );

  const selectedOffice = contactProps?.offices?.find(
    (office) => office.id === selectedOfficeId,
  );

  const officeAddress = selectedOffice?.address
    ? `${selectedOffice.address.street}, ${selectedOffice.address.city}, ${selectedOffice.address.state}, ${selectedOffice.address.country}`
    : null;
  const storedEmbedUrl = selectedOffice?.mapUrl?.includes("maps/embed")
    ? selectedOffice.mapUrl
    : null;
  const showMap = map && (storedEmbedUrl || officeAddress);

  return (
    <section className="container py-12 sm:py-16" id="contact">
      <motion.div 
        className="mb-8 text-center sm:mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
      >
        <motion.h2 
          className="mb-2 text-2xl font-bold sm:text-3xl"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {title}
        </motion.h2>
        <motion.p 
          className="mx-auto max-w-2xl px-4 text-sm text-muted-foreground sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      </motion.div>

      <motion.div 
        className="grid gap-6 sm:gap-8 lg:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {messageForm && (
          <motion.div variants={staggerItem}>
            <ContactForm />
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
            <CardDescription>
              Comunícate con nosotros directamente o visita nuestra oficina.
            </CardDescription>

            {contactProps?.offices && contactProps.offices.length > 1 && (
              <div className="mt-4">
                <Select
                  value={selectedOfficeId}
                  onValueChange={setSelectedOfficeId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactProps.offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            {address && selectedOffice?.address && (
              <div className="flex items-start">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-primary sm:mr-3 sm:h-5 sm:w-5" />
                <div>
                  <h4 className="text-sm font-medium sm:text-base">
                    Dirección de la Oficina
                  </h4>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      `${selectedOffice.address.street}, ${selectedOffice.address.city}, ${selectedOffice.address.state}, ${selectedOffice.address.country}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm not-italic text-muted-foreground transition-opacity hover:opacity-80"
                  >
                    <address className="not-italic">
                      {selectedOffice.address.street}
                      <br />
                      {selectedOffice.address.city},{" "}
                      {selectedOffice.address.state}
                      <br />
                      {selectedOffice.address.country}
                    </address>
                  </a>
                </div>
              </div>
            )}

            {phone && selectedOffice?.phoneNumbers && (
              <div className="flex items-start">
                <Phone className="mr-2 h-4 w-4 flex-shrink-0 text-primary sm:mr-3 sm:h-5 sm:w-5" />
                <div>
                  <h4 className="text-sm font-medium sm:text-base">Teléfono</h4>
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={`tel:${selectedOffice.phoneNumbers.main}`}
                      className="transition-opacity hover:opacity-80"
                    >
                      Principal: {selectedOffice.phoneNumbers.main}
                    </a>
                    <br />
                    <a
                      href={`tel:${selectedOffice.phoneNumbers.sales}`}
                      className="transition-opacity hover:opacity-80"
                    >
                      Ventas: {selectedOffice.phoneNumbers.sales}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {mail && selectedOffice?.emailAddresses && (
              <div className="flex items-start">
                <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-primary sm:mr-3 sm:h-5 sm:w-5" />
                <div>
                  <h4 className="text-sm font-medium sm:text-base">
                    Correo Electrónico
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={`mailto:${selectedOffice.emailAddresses.info}`}
                      className="transition-opacity hover:opacity-80"
                    >
                      {selectedOffice.emailAddresses.info}
                    </a>
                    <br />
                    <a
                      href={`mailto:${selectedOffice.emailAddresses.sales}`}
                      className="transition-opacity hover:opacity-80"
                    >
                      {selectedOffice.emailAddresses.sales}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {schedule && selectedOffice?.scheduleInfo && (
              <div className="flex items-start">
                <Clock className="mr-2 h-4 w-4 flex-shrink-0 text-primary sm:mr-3 sm:h-5 sm:w-5" />
                <div>
                  <h4 className="text-sm font-medium sm:text-base">
                    Horario de Atención
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedOffice.scheduleInfo.weekdays}
                    <br />
                    {selectedOffice.scheduleInfo.saturday}
                    <br />
                    {selectedOffice.scheduleInfo.sunday}
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          {showMap && (
            <CardFooter>
              {storedEmbedUrl ? (
                <iframe
                  src={storedEmbedUrl}
                  width="100%"
                  height="150"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación de la Oficina"
                  className="rounded-md"
                />
              ) : officeAddress ? (
                <OfficeLocationMap address={officeAddress} />
              ) : null}
            </CardFooter>
          )}
        </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}
