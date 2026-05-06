

export type ContactProps = {
  title: string;
  subtitle: string;
  messageForm: boolean;
  address: boolean;
  phone: boolean;
  mail: boolean;
  schedule: boolean;
  map: boolean;
  // Contact information fields
  offices: Array<{
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
    };
    phoneNumbers: {
      main: string;
      sales: string;
    };
    emailAddresses: {
      info: string;
      sales: string;
    };
    scheduleInfo: {
      weekdays: string;
      saturday: string;
      sunday: string;
    };
    mapUrl: string;
    isDefault?: boolean;
  }>;
};

export const getContactProps = (): ContactProps | null => {
  return {
  "title": "Contáctanos",
  "subtitle": "",
  "messageForm": true,
  "address": true,
  "phone": true,
  "mail": true,
  "schedule": true,
  "map": true,
  "offices": [{
  "id": "OlnINS_CmHQ_Co3xHJmpg",
  "name": "Inmobiliaria Burgo Nuevo León",
  "address": {
  "street": "Av. Independencia 5, Local 2, esquina con Calle Arco de Ánimas",
  "city": "León",
  "state": "León",
  "country": "España"
},
  "phoneNumbers": {
  "main": "987263000",
  "sales": "609547405"
},
  "emailAddresses": {
  "info": "info@inmo-bnuevo.com",
  "sales": ""
},
  "scheduleInfo": {
  "weekdays": "Lunes a Viernes: 9:00 - 17:00",
  "saturday": "Sábados: 9:00 - 13:00",
  "sunday": "Domingos: Cerrado"
},
  "mapUrl": "https://www.google.com/maps/place/Inmobiliaria+Burgo+Nuevo/@42.596831,-5.5737995,17z/data=!3m2!4b1!5s0xd379a9a2c774de5:0xacf8dab4ead6060e!4m6!3m5!1s0xd379b2b5d8086b1:0x4064bd3a31033bab!8m2!3d42.596831!4d-5.5712246!16s%2Fg%2F11h91yq6p1?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D",
  "isDefault": true
}]
};
}

