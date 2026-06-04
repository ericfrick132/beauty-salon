import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

export const metadata: Metadata = {
  title: 'Política de Privacidad — TurnosPro',
  description: 'Política de privacidad de TurnosPro.',
};

const h2: CSSProperties = { fontSize: '1.2rem', marginTop: '2rem' };
const link: CSSProperties = { color: '#9a6a1f' };

export default function PrivacidadPage() {
  return (
    <main style={{ maxWidth: 760, margin: '40px auto', padding: '0 20px', color: '#1a1a1a', lineHeight: 1.6, fontFamily: '-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ fontSize: '1.8rem' }}>Política de Privacidad de TurnosPro</h1>
      <p style={{ color: '#6b6b6b', fontSize: '.9rem' }}>Última actualización: 4 de junio de 2026</p>

      <p>Esta política describe cómo <strong>TurnosPro</strong> ("el servicio") trata tu información. TurnosPro es una plataforma de reservas online y gestión de turnos para profesionales independientes y pequeños negocios.</p>

      <h2 style={h2}>1. Información que recopilamos</h2>
      <ul>
        <li><strong>Datos de inicio de sesión:</strong> tu correo electrónico y contraseña.</li>
        <li><strong>Datos de tu negocio:</strong> turnos, clientes, servicios, equipo y pagos que vos y tu equipo cargan y administran en su cuenta de TurnosPro.</li>
      </ul>
      <p>El servicio <strong>no</strong> incluye herramientas de seguimiento publicitario ni SDKs de analítica de terceros con fines publicitarios.</p>

      <h2 style={h2}>2. Cómo usamos la información</h2>
      <p>Usamos tu información únicamente para autenticarte y para operar la agenda, las reservas, los cobros y la gestión de tu negocio. No vendemos tus datos ni los usamos con fines publicitarios.</p>

      <h2 style={h2}>3. Datos de tu negocio y multi-tenant</h2>
      <p>Cada negocio (tenant) tiene sus datos aislados. Los usuarios que vos autorizás pueden ver y administrar la información de tu negocio para operarlo según su rol.</p>

      <h2 style={h2}>4. Pagos y proveedores externos</h2>
      <p>Si activás cobros o señas, los pagos se procesan a través de proveedores de pago externos (por ejemplo, MercadoPago). Esos proveedores tratan los datos del pago según sus propias políticas.</p>

      <h2 style={h2}>5. Almacenamiento en el dispositivo</h2>
      <p>Para mantener tu sesión iniciada guardamos un token de sesión en tu dispositivo. Podés cerrar sesión en cualquier momento desde la app.</p>

      <h2 style={h2}>6. Con quién compartimos los datos</h2>
      <p>Tus datos se procesan a través de los servidores de TurnosPro para prestar el servicio. No los compartimos con terceros ajenos a la prestación del servicio, salvo obligación legal.</p>

      <h2 style={h2}>7. Tus derechos</h2>
      <p>Podés solicitar acceder, corregir o eliminar tus datos escribiéndonos a <a style={link} href="mailto:eric.frick@efcloud.tech">eric.frick@efcloud.tech</a>.</p>

      <h2 style={h2}>8. Cambios</h2>
      <p>Podemos actualizar esta política. Publicaremos los cambios en esta misma página con su nueva fecha.</p>

      <h2 style={h2}>9. Contacto</h2>
      <p>TurnosPro — <a style={link} href="mailto:eric.frick@efcloud.tech">eric.frick@efcloud.tech</a></p>
    </main>
  );
}
