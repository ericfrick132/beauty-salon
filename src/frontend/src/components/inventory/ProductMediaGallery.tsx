import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { AddPhotoAlternate, Close, PlayCircleOutline, Star, StarBorder } from '@mui/icons-material';
import { ProductMedia, productMediaApi } from '../../services/api';

const MAX_ITEMS = 8;
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;
const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';

/**
 * Fotos y videos de un producto (Productos → editar). Se suben de a uno a DO Spaces; la primera foto es
 * la portada que se ve en la lista y en el punto de venta.
 */
const ProductMediaGallery: React.FC<{
  productId: string;
  media: ProductMedia[];
  onChange: (media: ProductMedia[]) => void;
}> = ({ productId, media, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const coverId = media.find((m) => m.kind === 'image')?.id;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    let current = [...media];
    const list = Array.from(files).slice(0, Math.max(0, MAX_ITEMS - current.length));
    if (list.length < files.length) setError(`Cada producto puede tener hasta ${MAX_ITEMS} fotos o videos.`);

    for (const file of list) {
      const isVideo = file.type.startsWith('video/');
      const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (file.size > maxMb * 1024 * 1024) {
        setError(`${file.name} supera ${maxMb} MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const created = await productMediaApi.upload(productId, file);
        current = [...current, created];
        onChange(current);
      } catch (err: any) {
        setError(err?.response?.data?.message || `No pudimos subir ${file.name}.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await productMediaApi.remove(productId, id);
      onChange(media.filter((m) => m.id !== id));
    } catch {
      setError('No pudimos borrar el archivo.');
    }
  };

  const makeCover = async (id: string) => {
    const ordered = [media.find((m) => m.id === id)!, ...media.filter((m) => m.id !== id)].map((m, i) => ({ ...m, sortOrder: i }));
    onChange(ordered);
    try {
      await productMediaApi.reorder(productId, ordered.map((m) => m.id));
    } catch {
      setError('No pudimos cambiar la portada.');
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>Fotos y videos</Typography>
      {error && <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
        {media.map((m) => (
          <Box
            key={m.id}
            sx={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: 'action.hover',
              border: 2,
              borderColor: m.id === coverId ? 'primary.main' : 'transparent',
            }}
          >
            {m.kind === 'video' ? (
              <>
                <Box component="video" src={m.url} muted playsInline preload="metadata" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <PlayCircleOutline sx={{ position: 'absolute', inset: 0, m: 'auto', color: '#fff', fontSize: 36, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.5))' }} />
              </>
            ) : (
              <Box component="img" src={m.url} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <IconButton
              size="small"
              aria-label="Quitar"
              onClick={() => remove(m.id)}
              sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.25, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}
            >
              <Close fontSize="small" />
            </IconButton>
            {m.kind === 'image' && (
              <Tooltip title={m.id === coverId ? 'Portada' : 'Usar de portada'}>
                <IconButton
                  size="small"
                  aria-label="Usar de portada"
                  onClick={() => m.id !== coverId && makeCover(m.id)}
                  sx={{ position: 'absolute', bottom: 2, left: 2, bgcolor: 'rgba(0,0,0,.55)', color: '#fff', p: 0.25, '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}
                >
                  {m.id === coverId ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ))}
        {media.length < MAX_ITEMS && (
          <Button
            variant="outlined"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            sx={{ aspectRatio: '1 / 1', minWidth: 0, flexDirection: 'column', gap: 0.5, borderStyle: 'dashed', textTransform: 'none' }}
          >
            {uploading > 0 ? <CircularProgress size={22} /> : <AddPhotoAlternate />}
            <Typography variant="caption">{uploading > 0 ? 'Subiendo…' : 'Agregar'}</Typography>
          </Button>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
        Hasta {MAX_ITEMS}. Fotos JPG, PNG o WEBP de hasta {MAX_IMAGE_MB} MB; videos MP4 o MOV de hasta {MAX_VIDEO_MB} MB.
      </Typography>
      <input
        ref={inputRef}
        hidden
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );
};

export default ProductMediaGallery;
