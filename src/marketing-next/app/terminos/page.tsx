import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — TurnosPro',
  description: 'Términos y condiciones de uso de TurnosPro.',
};

const h2: CSSProperties = { fontSize: '1.2rem', marginTop: '2rem' };
const link: CSSProperties = { color: '#9a6a1f' };

export default function TerminosPage() {
  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px', color: '#1a1a1a', lineHeight: 1.6, fontFamily: '-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ fontSize: '1.8rem' }}>Términos y Condiciones de TurnosPro</h1>
      <p style={{ color: '#6b6b6b', fontSize: '.9rem' }}>Última actualización: 4 de junio de 2026</p>

      <p>Estos Términos y Condiciones ("Términos") regulan el uso de <strong>TurnosPro</strong> ("el servicio"), una plataforma de reservas online y gestión de turnos para profesionales independientes y pequeños negocios. Al crear una cuenta o usar el servicio, aceptás estos Términos.</p>

      <h2 style={h2}>1. Cuenta y registro</h2>
      <p>Para usar el servicio necesitás una cuenta. Sos responsable de mantener la confidencialidad de tus credenciales y de toda la actividad que ocurra bajo tu cuenta. Debés brindar información veraz y mantenerla actualizada.</p>

      <h2 style={h2}>2. Uso aceptable</h2>
      <p>Te comprometés a usar TurnosPro de forma lícita y a no: (a) vulnerar la seguridad del servicio; (b) acceder a datos de otros negocios (tenants); (c) usar el servicio para actividades ilegales; ni (d) interferir con su normal funcionamiento.</p>

      <h2 style={h2}>3. Tus datos y los de tu negocio</h2>
      <p>La información de turnos, clientes, servicios, equipo y pagos que cargás sigue siendo tuya. Nos otorgás una licencia limitada para procesarla con el único fin de prestarte el servicio. El tratamiento de datos personales se rige por nuestra <a style={link} href="/privacidad">Política de Privacidad</a>.</p>

      <h2 style={h2}>4. Reservas, señas y cobros</h2>
      <p>TurnosPro permite gestionar reservas y, según tu configuración, cobrar señas o pagos a través de proveedores de pago externos (por ejemplo, MercadoPago). La relación comercial con tus clientes, los precios, las políticas de cancelación y la emisión de comprobantes son tu responsabilidad como negocio.</p>

      <h2 style={h2}>5. Planes, suscripciones y pagos del servicio</h2>
      <p>El servicio puede ofrecerse mediante planes de suscripción contratados por fuera de la aplicación móvil (por ejemplo, en nuestro sitio web). Los precios, impuestos y condiciones de cada plan se informan al momento de la contratación. La falta de pago puede suspender el acceso.</p>

      <h2 style={h2}>6. Disponibilidad del servicio</h2>
      <p>Trabajamos para mantener el servicio disponible, pero no garantizamos un funcionamiento ininterrumpido. Podemos realizar mantenimiento, actualizaciones o cambios en las funcionalidades.</p>

      <h2 style={h2}>7. Propiedad intelectual</h2>
      <p>El software, la marca y los contenidos de TurnosPro son de su titular. Estos Términos no te transfieren derechos sobre la plataforma más allá de la licencia de uso aquí descripta.</p>

      <h2 style={h2}>8. Limitación de responsabilidad</h2>
      <p>El servicio se brinda "tal cual". En la máxima medida permitida por la ley, no seremos responsables por daños indirectos o lucro cesante derivados del uso o la imposibilidad de uso del servicio.</p>

      <h2 style={h2}>9. Baja y cancelación</h2>
      <p>Podés dejar de usar el servicio y solicitar la baja de tu cuenta en cualquier momento. Podemos suspender o cancelar cuentas que incumplan estos Términos.</p>

      <h2 style={h2}>10. Ley aplicable</h2>
      <p>Estos Términos se rigen por las leyes de la República Argentina, sin perjuicio de las normas de protección al consumidor que pudieran aplicar.</p>

      <h2 style={h2}>11. Cambios en los Términos</h2>
      <p>Podemos actualizar estos Términos. Publicaremos los cambios en esta misma página con su nueva fecha. El uso continuado del servicio implica la aceptación de los cambios.</p>

      <h2 style={h2}>12. Contacto</h2>
      <p>TurnosPro — <a style={link} href="mailto:eric.frick@efcloud.tech">eric.frick@efcloud.tech</a></p>
    </main>
  );
}
