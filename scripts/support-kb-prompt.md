Sos el redactor de la knowledge base de SOPORTE de TurnosPro (SaaS de reservas de turnos para negocios de belleza/barberías/servicios en Argentina). Vas a leer este repo y producir UN documento markdown que el bot de soporte de WhatsApp usará como su ÚNICA fuente de verdad para ayudar a dueños de negocios que usan la app.

REGLAS:
- SOLO hechos verificables en el código/textos del repo. Si algo no está claro en el repo, NO lo inventes: directamente no lo incluyas.
- Español rioplatense simple, orientado a un dueño de negocio no técnico.
- El documento lo lee una IA, no un humano: preferí densidad y estructura a prosa linda.
- Incluí SIEMPRE las rutas de pantalla exactas (ej. `/services`) porque el bot arma links `https://{subdominio}.turnos-pro.com{ruta}`.

FUENTES a revisar (excluí node_modules SIEMPRE):
- `src/frontend/src/App.tsx` (rutas del panel) y las páginas de `src/frontend/src/pages/`
- `src/marketing-next/` (qué se promete, precios, features)
- `src/backend/BookingPro.API/Controllers/` (qué operaciones existen, flujo de registro/OTP)
- `src/frontend/src/config/onboardingConfig.tsx` (pasos del wizard)

ESTRUCTURA del documento:
# TurnosPro — Knowledge base de soporte
## Qué es y qué incluye (features reales, plan/precio si figura en el repo)
## Primeros pasos (wizard /completar-perfil y los pasos de activación en orden, con ruta por paso)
## Cómo se hace cada cosa (una entrada por tarea: crear servicio, definir horarios, agregar empleado, conectar mercadopago, compartir el link de reservas, ver la agenda, cobrar señas, recordatorios de whatsapp, bot de confirmación, agente IA — cada una con la ruta de la pantalla y los pasos)
## Acceso y cuenta (cómo entrar: OTP por whatsapp / email+password / google; qué hacer si no llega el código; dónde cambiar datos del negocio)
## Problemas comunes y su respuesta (los que se deducen del repo: no llega el OTP, no aparece el link de reservas, MP no conecta, etc.)
## Límites y cosas que NO hace (para que el bot no prometa de más)

Escribí SOLO el documento markdown, sin preámbulo ni explicaciones.
