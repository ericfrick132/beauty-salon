/**
 * Story panel del onboarding que muestra al agente IA en acción: una
 * conversación fake de WhatsApp donde el bot confirma un turno solo.
 * Reemplaza la foto de Unsplash en el paso de calificación para vender
 * el diferencial mientras el usuario cuenta cómo gestiona sus turnos hoy.
 * Estilo "Editorial Agenda" de la landing (paper, ink, sombras duras).
 */

import React from 'react';
import { Box } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const ink = '#171410';
const inkSoft = '#5C5347';
const paper = '#F4EFE6';
const paperSoft = '#FAF7F0';
const forest = '#1E5E3F';
const amber = '#F4C038';

const CHAT: { from: 'bot' | 'client'; text: string }[] = [
  {
    from: 'bot',
    text: 'Hola Juan! Te escribimos de Estudio Belén por tu turno de Corte y Color el viernes a las 15:30.\n\nRespondé 1 para confirmar tu turno ✅ o 2 para cancelarlo ❌',
  },
  { from: 'client', text: '1' },
  {
    from: 'bot',
    text: '¡Gracias Juan! Tu turno del viernes a las 15:30 quedó confirmado. Te esperamos 😊',
  },
];

const AiChatStoryPanel: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2.5,
      px: 4,
      background: paper,
    }}
  >
    {/* Kicker */}
    <Box
      sx={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: '0.68rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: inkSoft,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box sx={{ width: 36, height: '1.5px', bgcolor: ink }} />
      Tu agente IA · incluido en TurnosPro
    </Box>

    {/* Chat card */}
    <Box
      sx={{
        width: '100%',
        maxWidth: 400,
        bgcolor: paperSoft,
        border: `1.5px solid ${ink}`,
        borderRadius: 2,
        boxShadow: `8px 8px 0 ${ink}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.6,
          borderBottom: `1.5px solid ${ink}`,
          bgcolor: forest,
          color: paperSoft,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: `1.5px solid ${paperSoft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        >
          <SmartToyIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Box sx={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>Estudio Belén</Box>
          <Box
            sx={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            Agente IA · en línea
          </Box>
        </Box>
        <Box
          sx={{
            ml: 'auto',
            px: 1.1,
            py: 0.35,
            border: `1.5px solid ${paperSoft}`,
            borderRadius: 999,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '0.58rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            bgcolor: amber,
            color: ink,
            fontWeight: 600,
          }}
        >
          IA 24/7
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ p: 2.2, display: 'flex', flexDirection: 'column', gap: 1.3 }}>
        {CHAT.map((msg, i) => {
          const isBot = msg.from === 'bot';
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end' }}>
              <Box
                sx={{
                  maxWidth: '85%',
                  px: 1.6,
                  py: 1.1,
                  border: `1.5px solid ${ink}`,
                  borderRadius: 2,
                  borderTopLeftRadius: isBot ? 4 : 16,
                  borderTopRightRadius: isBot ? 16 : 4,
                  bgcolor: isBot ? paper : forest,
                  color: isBot ? ink : paperSoft,
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.text}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer stub */}
      <Box
        sx={{
          px: 2.2,
          py: 1.3,
          borderTop: `1.5px dashed ${ink}`,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: inkSoft,
          display: 'flex',
          alignItems: 'center',
          gap: 0.8,
        }}
      >
        <Box sx={{ width: 9, height: 9, bgcolor: forest, border: `1px solid ${ink}`, borderRadius: '2px' }} />
        Turno confirmado en tu agenda · Sin que muevas un dedo
      </Box>
    </Box>

    {/* Caption */}
    <Box
      sx={{
        fontFamily: '"Fraunces", Georgia, serif',
        fontSize: '1.15rem',
        fontStyle: 'italic',
        color: ink,
        textAlign: 'center',
        maxWidth: 380,
        lineHeight: 1.4,
      }}
    >
      Mientras cargás tus datos, imaginate esto: tu IA confirmando turnos sola, por WhatsApp.
    </Box>
  </Box>
);

export default AiChatStoryPanel;
