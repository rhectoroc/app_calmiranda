export interface ProductStock {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  price: number;
  description: string;
}

export interface PlantProduction {
  id: string;
  name: string;
  dailyProduction: number; // en toneladas
  capacity: number; // capacidad max tn/día
  activeWorkers: number;
  ovenTemperature: number; // °C
  efficiency: number; // %
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface CustomerChat {
  id: string;
  customerName: string;
  phoneNumber: string;
  channel: 'WhatsApp' | 'Web';
  status: 'bot_active' | 'waiting_handover' | 'agent_active' | 'resolved';
  lastMessage: string;
  lastMessageTime: string;
  messages: ChatMessage[];
  productOfInterest?: string;
  isRegistered?: boolean;
  clientId?: string | null;
  clientEstatus?: string;
  clientRif?: string | null;
  clientZona?: string | null;
  clientEtiqueta?: string;
}

export interface SalesHistory {
  month: string;
  sales: number; // en USD
  volume: number; // en toneladas
}

// 1. Inventario actual de CalMiranda
export const initialInventory: ProductStock[] = [
  {
    id: 'prod-1',
    name: 'Cal en Pasta 5 kg',
    category: 'Doméstico',
    stock: 1200,
    minStock: 500,
    maxStock: 3000,
    unit: 'sacos',
    price: 3.50,
    description: 'Cal en pasta premium. Alta blancura y rendimiento para interiores.'
  },
  {
    id: 'prod-2',
    name: 'Cal en Pasta 7 kg',
    category: 'Construcción',
    stock: 450, // Bajo stock
    minStock: 600,
    maxStock: 4000,
    unit: 'bolsas',
    price: 4.80,
    description: 'Cal en pasta de alta adherencia y rendimiento. Ideal para frisos y revestimientos.'
  },
  {
    id: 'prod-3',
    name: 'Cal en Polvo 4 kg',
    category: 'Construcción',
    stock: 1800,
    minStock: 800,
    maxStock: 5000,
    unit: 'sacos',
    price: 2.80,
    description: 'Cal hidratada en polvo. Máxima pureza para mezclas de albañilería.'
  },
  {
    id: 'prod-4',
    name: 'Pintura Ecológica base Cal',
    category: 'Acabados',
    stock: 350,
    minStock: 200,
    maxStock: 1000,
    unit: 'galones',
    price: 12.50,
    description: 'Pintura mineral ecológica, transpirable y antimoho natural.'
  },
  {
    id: 'prod-5',
    name: 'Pipote de Cal en Pasta (Presentación Industrial)',
    category: 'Industrial',
    stock: 85,
    minStock: 30,
    maxStock: 250,
    unit: 'pipotes metal',
    price: 75.00,
    description: 'Pipote metálico de cal en pasta para grandes obras de construcción y contratistas.'
  },
  {
    id: 'prod-6',
    name: 'Pipote Muestrario de Exhibición',
    category: 'Exhibición',
    stock: 15, // Bajo stock
    minStock: 20,
    maxStock: 50,
    unit: 'unidades',
    price: 150.00,
    description: 'Diseño optimizado para exhibición en ferreterías, locales y tiendas asociadas.'
  }
];

// 2. Estado operativo de las plantas de producción
export const initialPlants: PlantProduction[] = [
  {
    id: 'plant-guatire',
    name: 'Sede Principal Guatire',
    dailyProduction: 18.5,
    capacity: 25.0,
    activeWorkers: 14,
    ovenTemperature: 980, // Horno rotatorio de calcinación
    efficiency: 92
  },
  {
    id: 'plant-caracas',
    name: 'Sede Caracas (Hoyo de la Puerta)',
    dailyProduction: 8.2,
    capacity: 12.0,
    activeWorkers: 6,
    ovenTemperature: 955,
    efficiency: 88
  }
];

// 3. Ventas históricas
export const salesHistory: SalesHistory[] = [
  { month: 'Ene', sales: 18500, volume: 150 },
  { month: 'Feb', sales: 22000, volume: 180 },
  { month: 'Mar', sales: 25400, volume: 210 },
  { month: 'Abr', sales: 21200, volume: 175 },
  { month: 'May', sales: 28900, volume: 240 } // Mes actual en curso
];

// 4. Chats simulados del Evolution API atendidos por Diamantín
export const initialChats: CustomerChat[] = [
  {
    id: 'chat-1',
    customerName: 'Carlos Mendoza',
    phoneNumber: '+58 412-5551234',
    channel: 'WhatsApp',
    status: 'waiting_handover', // Requiere atención humana
    lastMessage: 'Necesito una cotización formal de 200 bolsas de Cal de 7kg para el lunes por favor.',
    lastMessageTime: 'Hace 5 min',
    productOfInterest: 'Cal en Pasta 7 kg',
    messages: [
      { id: '1', sender: 'user', text: 'Hola, buenas tardes.', timestamp: '13:02' },
      { id: '2', sender: 'bot', text: '¡Hola! Soy Diamantín, asistente virtual de CalMiranda. ¿En qué puedo ayudarte hoy?', timestamp: '13:02' },
      { id: '3', sender: 'user', text: 'Estoy interesado en la cal en pasta de 7kg. ¿Tienen disponibilidad?', timestamp: '13:03' },
      { id: '4', sender: 'bot', text: '¡Excelente elección! La Cal en Pasta de 7kg (presentación en bolsa) está formulada especialmente para frisos de alta calidad y revestimientos premium. Sí tenemos disponibilidad. ¿Qué cantidad necesitas aproximadamente?', timestamp: '13:04' },
      { id: '5', sender: 'user', text: 'Necesito una cotización formal de 200 bolsas de Cal de 7kg para el lunes por favor.', timestamp: '13:10' },
      { id: '6', sender: 'bot', text: 'Perfecto. Entiendo que requieres un volumen mayor. Voy a transferir tu consulta a un asesor comercial de CalMiranda para que te envíe la cotización formal por este canal. Por favor, mantente en línea.', timestamp: '13:11' }
    ]
  },
  {
    id: 'chat-2',
    customerName: 'Ferretería La Solución C.A.',
    phoneNumber: '+58 424-9988776',
    channel: 'WhatsApp',
    status: 'bot_active',
    lastMessage: '¿El pipote muestrario incluye la cal de exhibición o solo el soporte?',
    lastMessageTime: 'Hace 12 min',
    productOfInterest: 'Pipote Muestrario de Exhibición',
    messages: [
      { id: '1', sender: 'user', text: 'Hola, vi en su web que ofrecen un pipote muestrario para locales.', timestamp: '12:45' },
      { id: '2', sender: 'bot', text: '¡Hola! Qué gusto saludarte. Así es, nuestro Pipote Muestrario de Exhibición está diseñado especialmente para captar la atención de tus clientes en tu ferretería o tienda. Permite mostrar la calidad del producto en tu propio local.', timestamp: '12:46' },
      { id: '3', sender: 'user', text: '¿El pipote muestrario incluye la cal de exhibición o solo el soporte?', timestamp: '13:05' }
    ]
  },
  {
    id: 'chat-3',
    customerName: 'Inversiones Rodríguez',
    phoneNumber: '+58 414-2233445',
    channel: 'Web',
    status: 'agent_active', // Ya está bajo control de un empleado
    lastMessage: 'Entendido, entonces coordinaré el flete para retirar en la sede Guatire.',
    lastMessageTime: 'Hace 30 min',
    messages: [
      { id: '1', sender: 'user', text: 'Hola, ¿dónde queda su sede principal?', timestamp: '12:00' },
      { id: '2', sender: 'bot', text: '¡Hola! Nuestra Sede Principal (Guatire) se encuentra en el Sector La Mura, Calle Los Ríos, Galpón Nro. 4, Zona Industrial, Edo. Miranda. ¿Deseas saber el horario o cómo llegar?', timestamp: '12:01' },
      { id: '3', sender: 'user', text: 'Sí, quiero comprar 3 pipotes de cal industrial. ¿Puedo retirar hoy?', timestamp: '12:05' },
      { id: '4', sender: 'bot', text: 'Para la entrega de pipotes metálicos industriales de cal en pasta, coordinaré con un despachador para confirmar el retiro inmediato. Un momento...', timestamp: '12:05' },
      { id: '5', sender: 'agent', text: 'Hola, soy Roberto de CalMiranda. Confirmado, puedes retirar los 3 pipotes en el galpón de Guatire. Estamos abiertos hasta las 5:00 PM.', timestamp: '12:10' },
      { id: '6', sender: 'user', text: 'Entendido, entonces coordinaré el flete para retirar en la sede Guatire.', timestamp: '12:28' }
    ]
  },
  {
    id: 'chat-4',
    customerName: 'Valerie Silva',
    phoneNumber: '+58 412-1110022',
    channel: 'WhatsApp',
    status: 'resolved',
    lastMessage: 'Muchas gracias por la información.',
    lastMessageTime: 'Hace 2 horas',
    messages: [
      { id: '1', sender: 'user', text: 'Hola, ¿abren los sábados?', timestamp: '10:15' },
      { id: '2', sender: 'bot', text: '¡Hola! Sí, nuestra Sede Principal Guatire abre los sábados de 8:00 AM a 1:00 PM. La sede de Caracas no labora los sábados.', timestamp: '10:16' },
      { id: '3', sender: 'user', text: 'Muchas gracias por la información.', timestamp: '10:18' }
    ]
  }
];

// 5. Motor de simulación del Asistente Empresarial de IA
// Procesa preguntas internas y genera respuestas inteligentes sobre CalMiranda
export const generateBusinessAssistantResponse = (
  query: string, 
  inventory: ProductStock[], 
  plants: PlantProduction[]
): { text: string; dataTable?: any[]; dataChart?: any[] } => {
  const q = query.toLowerCase();

  // Caso 1: Consulta de inventario general
  if (q.includes('inventario') || q.includes('stock') || q.includes('productos') || q.includes('cal')) {
    // Si consulta por un producto específico
    if (q.includes('pasta 5kg') || q.includes('pasta 5 kg') || q.includes('5kg')) {
      const prod = inventory.find(p => p.id === 'prod-1')!;
      return {
        text: `El stock actual de **${prod.name}** es de **${prod.stock} ${prod.unit}**. Se encuentra en niveles saludables (Mínimo requerido: ${prod.minStock}). El precio unitario de distribución es de $${prod.price.toFixed(2)}.`,
        dataTable: [
          { Detalle: 'Producto', Valor: prod.name },
          { Detalle: 'Stock Actual', Valor: `${prod.stock} ${prod.unit}` },
          { Detalle: 'Límite Mínimo', Valor: `${prod.minStock} ${prod.unit}` },
          { Detalle: 'Precio Mayorista', Valor: `$${prod.price.toFixed(2)}` }
        ]
      };
    }
    if (q.includes('pasta 7kg') || q.includes('pasta 7 kg') || q.includes('7kg') || q.includes('bolsa')) {
      const prod = inventory.find(p => p.id === 'prod-2')!;
      return {
        text: `⚠️ **ALERTA DE INVENTARIO:** El stock de **${prod.name}** es crítico: **${prod.stock} ${prod.unit}** en existencia. Está por debajo del mínimo de seguridad de **${prod.minStock} ${prod.unit}**. Se sugiere coordinar un lote de producción de empaque en bolsas en la sede de Caracas.`,
        dataTable: [
          { Detalle: 'Producto', Valor: prod.name },
          { Detalle: 'Stock Actual', Valor: `${prod.stock} ${prod.unit}` },
          { Detalle: 'Límite Mínimo', Valor: `${prod.minStock} ${prod.unit}` },
          { Detalle: 'Estado', Valor: 'Bajo Mínimo (Crítico)' }
        ]
      };
    }
    if (q.includes('muestrario') || q.includes('exhibición') || q.includes('tienda')) {
      const prod = inventory.find(p => p.id === 'prod-6')!;
      return {
        text: `El inventario de **${prod.name}** es de **${prod.stock} unidades**. Al ser un artículo de exhibición de tiendas, se recomienda mantener al menos ${prod.minStock} para despachos rápidos de nuevas franquicias o comercios asociados.`,
        dataTable: [
          { Detalle: 'Producto', Valor: prod.name },
          { Detalle: 'Disponibles', Valor: `${prod.stock} uds` },
          { Detalle: 'Precio Unitario', Valor: `$${prod.price.toFixed(2)}` }
        ]
      };
    }

    // Inventario general
    return {
      text: 'Aquí tienes un resumen simplificado del inventario en tiempo real de todos los productos de CalMiranda. Nota los indicadores en rojo para productos bajo stock.',
      dataTable: inventory.map(p => ({
        Producto: p.name,
        Stock: `${p.stock} ${p.unit}`,
        Estado: p.stock < p.minStock ? 'Bajo Stock ⚠️' : 'Óptimo ✅',
        Precio: `$${p.price.toFixed(2)}`
      }))
    };
  }

  // Caso 2: Consulta de producción de plantas/sedes
  if (q.includes('produccion') || q.includes('planta') || q.includes('sede') || q.includes('guatire') || q.includes('caracas') || q.includes('horno')) {
    if (q.includes('guatire')) {
      const plant = plants.find(pl => pl.id === 'plant-guatire')!;
      return {
        text: `La **${plant.name}** opera actualmente al **${plant.efficiency}% de eficiencia**. La temperatura actual del horno de calcinación es de **${plant.ovenTemperature}°C**. La producción de hoy es de **${plant.dailyProduction} toneladas** sobre una capacidad instalada de ${plant.capacity} toneladas/día.`,
        dataTable: [
          { Métrica: 'Producción Diaria', Valor: `${plant.dailyProduction} Tn` },
          { Métrica: 'Capacidad Máxima', Valor: `${plant.capacity} Tn` },
          { Métrica: 'Temperatura de Horno', Valor: `${plant.ovenTemperature} °C` },
          { Métrica: 'Personal en Planta', Valor: `${plant.activeWorkers} operarios` },
          { Métrica: 'Eficiencia', Valor: `${plant.efficiency}%` }
        ]
      };
    }
    if (q.includes('caracas') || q.includes('hoyo de la puerta')) {
      const plant = plants.find(pl => pl.id === 'plant-caracas')!;
      return {
        text: `La planta **${plant.name}** registra una producción de **${plant.dailyProduction} toneladas** el día de hoy, con un horno estable a **${plant.ovenTemperature}°C** y una eficiencia del **${plant.efficiency}%**.`,
        dataTable: [
          { Métrica: 'Producción Diaria', Valor: `${plant.dailyProduction} Tn` },
          { Métrica: 'Capacidad Máxima', Valor: `${plant.capacity} Tn` },
          { Métrica: 'Temperatura de Horno', Valor: `${plant.ovenTemperature} °C` },
          { Métrica: 'Personal en Planta', Valor: `${plant.activeWorkers} operarios` },
          { Métrica: 'Eficiencia', Valor: `${plant.efficiency}%` }
        ]
      };
    }

    // Producción de ambas plantas
    return {
      text: 'Resumen consolidado de producción diaria de cal en las sedes operativas de CalMiranda:',
      dataTable: plants.map(pl => ({
        Planta: pl.name,
        'Prod. Actual': `${pl.dailyProduction} Tn/día`,
        Capacidad: `${pl.capacity} Tn/día`,
        Eficiencia: `${pl.efficiency}%`,
        Horno: `${pl.ovenTemperature} °C`
      }))
    };
  }

  // Caso 3: Ventas
  if (q.includes('venta') || q.includes('ingreso') || q.includes('ganancia') || q.includes('usd') || q.includes('dinero')) {
    return {
      text: 'Presento el reporte histórico de ventas e ingresos de CalMiranda correspondientes al año 2026, incluyendo volumen comercializado en toneladas:',
      dataTable: salesHistory.map(s => ({
        Mes: s.month,
        'Facturado (USD)': `$${s.sales.toLocaleString()}`,
        'Volumen Vendido': `${s.volume} Toneladas`
      })),
      dataChart: salesHistory
    };
  }

  // Caso 4: Franquicias o Legal
  if (q.includes('franquicia') || q.includes('modelo') || q.includes('local') || q.includes('tienda') || q.includes('legal') || q.includes('regla')) {
    return {
      text: `El modelo de Franquicias de CalMiranda se rige por las siguientes pautas operativas y legales del marco venezolano:
1. **Instalación:** CalMiranda provee e instala la maquinaria de empaque y distribución en el local.
2. **Abastecimiento:** Cal en pasta premium despachada a granel en cisternas desde la planta de Guatire.
3. **Exhibición:** Cada local debe contar con al menos 1 Pipote Muestrario de Exhibición activo en zona visible.
4. **Cumplimiento Legal:** Contrato mercantil a 5 años prorrogables, registro en SENCAMER y facturación con máquina fiscal homologada según regulaciones del SENIAT.`
    };
  }

  // Respuesta por defecto
  return {
    text: `Hola, soy el Asistente Empresarial de CalMiranda. He analizado tu consulta, pero por el momento solo puedo procesar solicitudes sobre:
*   **Inventario y Stock** (ej. *"Ver inventario general"*, *"Stock de cal en pasta 7kg"*)
*   **Producción de Plantas** (ej. *"Producción de la planta Guatire"*, *"Eficiencia de los hornos"*)
*   **Ventas e Ingresos** (ej. *"Mostrar reporte de ventas"*, *"Ingresos del mes"*)
*   **Información de Franquicias** (ej. *"Requisitos para franquicias"*)

¿En cuál de estas áreas puedo apoyarte en este momento?`
  };
};
