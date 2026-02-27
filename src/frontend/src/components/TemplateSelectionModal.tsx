import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, CheckCircle } from '@mui/icons-material';
import { templatesApi } from '../services/api';

interface Template {
  code: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface TemplateSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onTemplateApplied: () => void;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  open,
  onClose,
  onTemplateApplied,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await templatesApi.getTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      setError('Error cargando templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (code: string) => {
    setSelectedCode(code);
    setApplying(true);
    setError('');

    try {
      const response = await templatesApi.applyTemplate(code);
      if (response.success) {
        onTemplateApplied();
        onClose();
      } else {
        setError(response.message || 'Error aplicando template');
        setSelectedCode(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error aplicando template');
      setSelectedCode(null);
    } finally {
      setApplying(false);
    }
  };

  // Fallback images based on template code
  const getImageFallback = (code: string): string => {
    const colors: Record<string, string> = {
      barbershop: '#1a1a1a',
      peluqueria: '#C8A2C8',
      aesthetics: '#87CEEB',
      nailsalon: '#FF69B4',
      carwash: '#1E88E5',
      depilation: '#AB47BC',
      sports: '#2E7D32',
      consulting: '#5C6BC0',
    };
    return colors[code] || '#666';
  };

  return (
    <Dialog
      open={open}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, minHeight: '70vh' },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Elegí un template para empezar
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Seleccioná el tipo de negocio que mejor se adapte al tuyo.
          <br />
          Esto preconfigura servicios, categorías y profesionales de ejemplo.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2.5} sx={{ mt: 1 }}>
            {/* "Empezar desde el principio" card */}
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <Card
                sx={{
                  height: '100%',
                  border: selectedCode === 'blank' ? '2px solid' : '1px solid',
                  borderColor: selectedCode === 'blank' ? 'primary.main' : 'grey.200',
                  transition: 'all 0.2s',
                  opacity: applying && selectedCode !== 'blank' ? 0.5 : 1,
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <CardActionArea
                  onClick={() => handleSelect('blank')}
                  disabled={applying}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <Box
                    sx={{
                      height: 160,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                    }}
                  >
                    {applying && selectedCode === 'blank' ? (
                      <CircularProgress />
                    ) : (
                      <Add sx={{ fontSize: 64, color: 'grey.400' }} />
                    )}
                  </Box>
                  <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Empezar desde el principio
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sin servicios precargados
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Template cards */}
            {templates.map((template) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={template.code}>
                <Card
                  sx={{
                    height: '100%',
                    border: selectedCode === template.code ? '2px solid' : '1px solid',
                    borderColor: selectedCode === template.code ? 'primary.main' : 'grey.200',
                    transition: 'all 0.2s',
                    opacity: applying && selectedCode !== template.code ? 0.5 : 1,
                    '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSelect(template.code)}
                    disabled={applying}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="160"
                        image={template.imageUrl}
                        alt={template.name}
                        sx={{
                          objectFit: 'cover',
                          bgcolor: getImageFallback(template.code),
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          // On image error, show colored placeholder
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.height = '160px';
                            parent.style.backgroundColor = getImageFallback(template.code);
                            parent.style.display = 'flex';
                            parent.style.alignItems = 'center';
                            parent.style.justifyContent = 'center';
                          }
                        }}
                      />
                      {applying && selectedCode === template.code && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(255,255,255,0.8)',
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {template.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectionModal;
