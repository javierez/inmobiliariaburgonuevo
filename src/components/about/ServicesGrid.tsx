"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "~/components/ui/card";
import {
  Map,
  User,
  MessageSquare,
  Handshake,
  Megaphone,
  HelpCircle,
  Briefcase,
  Calculator,
  Clock,
  Home,
  Key,
  Shield,
  Star,
  Phone,
  Mail,
} from "lucide-react";
import { staggerContainer, staggerItem } from "~/lib/animations";

interface Service {
  title: string;
  icon: string;
}

interface ServicesGridProps {
  services: Service[];
  title: string;
  maxServicesDisplayed: number;
}

const iconComponents = {
  map: Map,
  user: User,
  "message-square": MessageSquare,
  handshake: Handshake,
  megaphone: Megaphone,
  "help-circle": HelpCircle,
  briefcase: Briefcase,
  calculator: Calculator,
  clock: Clock,
  home: Home,
  key: Key,
  shield: Shield,
  star: Star,
  phone: Phone,
  mail: Mail,
};

const getIconComponent = (icon?: string) => {
  if (!icon) return HelpCircle;

  const normalizedIcon = icon.trim().toLowerCase();
  return (
    iconComponents[normalizedIcon as keyof typeof iconComponents] ??
    HelpCircle
  );
};

export function ServicesGrid({
  services,
  title,
  maxServicesDisplayed,
}: ServicesGridProps) {
  return (
    <motion.div 
      className="space-y-3 sm:space-y-4"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h3 
        className="text-xl font-semibold sm:text-2xl"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {title}
      </motion.h3>
      <motion.div 
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {services.slice(0, maxServicesDisplayed).map((service, index) => {
          const IconComponent = getIconComponent(service.icon);

          return (
            <motion.div
              key={index}
              variants={staggerItem}
              whileHover={{
                y: -3,
                transition: { duration: 0.2 },
              }}
            >
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
                  <motion.div
                    className="flex-shrink-0 rounded-full bg-primary/10 p-1.5 sm:p-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconComponent className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  </motion.div>
                  <span className="text-sm font-medium sm:text-base">
                    {service.title}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
